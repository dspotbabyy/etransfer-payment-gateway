const cron = require('node-cron');
const { db } = require('../database');
const EmailService = require('../services/emailService');
const Order = require('../models/Order');
const BankAccount = require('../models/BankAccount');

// In-memory cache to track last seen status for orders
// Format: { orderId: lastSeenStatus }
const orderStatusCache = new Map();

/**
 * Monitor last 5 non-completed orders for status changes
 * Send emails when status changes
 * Completed orders are automatically excluded from monitoring
 */
async function monitorOrders() {
  try {
    console.log('🔍 Starting order monitoring job at', new Date().toISOString());

    // Detect database type
    const isPostgreSQL = !db.run || typeof db.run !== 'function';
    
    // Get last 5 non-completed orders
    // Completed orders are automatically excluded, so we always monitor the most recent 5 non-completed orders
    let recentOrders = [];
    
    if (isPostgreSQL) {
      // PostgreSQL query - include merchant_email from orders table
      const result = await db.query(
        `SELECT id, woo_order_id, status, customer_email, customer_name, total, bank_account_id, description, merchant_email
         FROM orders
         WHERE status NOT IN ('completed', 'cancelled')
         ORDER BY id DESC
         LIMIT 5`
      );
      recentOrders = result.rows || [];
    } else {
      // SQLite query - include merchant_email from orders table
      recentOrders = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, woo_order_id, status, customer_email, customer_name, total, bank_account_id, description, merchant_email
           FROM orders
           WHERE status NOT IN ('completed', 'cancelled')
           ORDER BY id DESC
           LIMIT 5`,
          [],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    }

    console.log(`📊 Found ${recentOrders.length} non-completed orders to monitor (monitoring last 5 non-completed orders)`);
    console.log(`📦 Current cache size: ${orderStatusCache.size} orders`);
    console.log(`📦 Cached order IDs:`, Array.from(orderStatusCache.keys()));

    if (recentOrders.length === 0) {
      console.log('✅ No orders to monitor');
      return;
    }

    // Process each order
    for (const order of recentOrders) {
      try {
        const orderId = order.id;
        // Normalize status: lowercase and trim, default to 'pending'
        const rawStatus = order.status || 'pending';
        const currentStatus = String(rawStatus).toLowerCase().trim();
        const lastSeenStatus = orderStatusCache.get(orderId);
        
        // Normalize cached status if it exists
        const normalizedLastSeenStatus = lastSeenStatus ? String(lastSeenStatus).toLowerCase().trim() : null;

        console.log(`🔍 Checking order ${orderId}:`, {
          rawStatus: rawStatus,
          currentStatus: currentStatus,
          lastSeenStatus: normalizedLastSeenStatus || 'not seen before',
          statusChanged: normalizedLastSeenStatus ? normalizedLastSeenStatus !== currentStatus : false,
          customerEmail: order.customer_email,
          bankAccountId: order.bank_account_id
        });

        // If status changed, send emails
        if (normalizedLastSeenStatus && normalizedLastSeenStatus !== currentStatus) {
          console.log(`📧 Status changed for order ${orderId}: ${normalizedLastSeenStatus} → ${currentStatus}`);

          // Get merchant email directly from orders table (stored when order was created)
          let merchantEmail = order.merchant_email || null;
          
          // Fallback: If merchant_email not in orders table, try bank_accounts lookup (for older orders)
          if (!merchantEmail) {
            console.log(`⚠️ Merchant email not in orders table for order ${orderId}, trying bank_accounts lookup...`);
            try {
              const bankAccount = await BankAccount.getById(order.bank_account_id);
              if (bankAccount) {
                merchantEmail = bankAccount.email;
                console.log(`✅ Merchant email found from bank_accounts: ${merchantEmail} for bank_account_id: ${order.bank_account_id}`);
              } else {
                console.error(`❌ Bank account not found for bank_account_id: ${order.bank_account_id}`);
              }
            } catch (error) {
              console.error(`❌ Error getting merchant email for order ${orderId}:`, error);
            }
          } else {
            console.log(`✅ Merchant email found from orders table: ${merchantEmail} for order ${orderId}`);
          }

          if (!merchantEmail) {
            console.warn(`⚠️ Skipping email for order ${orderId} - merchant email not found`);
            // Update cache anyway
            orderStatusCache.set(orderId, currentStatus);
            continue;
          }

          // Prepare order object for email service
          const orderForEmail = {
            id: order.id,
            woo_order_id: order.woo_order_id,
            status: currentStatus,
            customer_email: order.customer_email,
            customer_name: order.customer_name,
            total: order.total,
            bank_account_id: order.bank_account_id,
            description: order.description
          };

          // Send email notifications
          console.log(`📧 Sending email notifications for order ${orderId}:`, {
            customerEmail: order.customer_email,
            merchantEmail: merchantEmail,
            oldStatus: normalizedLastSeenStatus,
            newStatus: currentStatus
          });

          try {
            await EmailService.sendOrderStatusEmails(orderForEmail, normalizedLastSeenStatus, merchantEmail);
            console.log(`✅ Emails sent successfully for order ${orderId}`);
          } catch (emailError) {
            console.error(`❌ Error sending emails for order ${orderId}:`, emailError);
          }
        } else if (!lastSeenStatus) {
          // First time seeing this order - just cache the status, don't send email
          console.log(`📝 First time seeing order ${orderId} - caching status: ${currentStatus}`);
        } else {
          // Status hasn't changed
          console.log(`✅ Order ${orderId} status unchanged: ${currentStatus}`);
        }

        // Update cache with current status (AFTER checking for changes)
        const previousCacheStatus = orderStatusCache.get(orderId);
        orderStatusCache.set(orderId, currentStatus);
        console.log(`💾 Updated cache for order ${orderId}: ${previousCacheStatus || 'null'} → ${currentStatus}`);

      } catch (error) {
        console.error(`❌ Error processing order ${order.id}:`, error);
        // Continue with next order
      }
    }

    // Check for orders that were being monitored but are now completed
    // These orders disappeared from the query results because they're now completed
    // FLOW: 
    // 1. Order was in cache with status "pending" (one of last 5 non-completed)
    // 2. Order status changed to "completed" (via API or other means)
    // 3. Next cron run: Order is no longer in query results (excluded by WHERE status NOT IN ('completed', 'cancelled'))
    // 4. We detect it disappeared from results, query database for current status
    // 5. If status is "completed" and was previously non-completed → send email
    const currentOrderIds = new Set(recentOrders.map(order => order.id));
    const cachedOrdersToCheck = [];
    
    for (const [cachedOrderId, cachedStatus] of orderStatusCache.entries()) {
      if (!currentOrderIds.has(cachedOrderId)) {
        // This order is no longer in the monitoring set (might be completed)
        // Store it to check if it transitioned to "completed"
        cachedOrdersToCheck.push({ id: cachedOrderId, lastSeenStatus: cachedStatus });
      }
    }
    
    // Check cached orders that disappeared from the query results
    if (cachedOrdersToCheck.length > 0) {
      console.log(`🔍 Checking ${cachedOrdersToCheck.length} cached orders that disappeared from query results...`);
      
      for (const cachedOrder of cachedOrdersToCheck) {
        try {
          // Get current order status from database
          let currentOrder = null;
          
          if (isPostgreSQL) {
            const result = await db.query(
              `SELECT id, woo_order_id, status, customer_email, customer_name, total, bank_account_id, description, merchant_email
               FROM orders
               WHERE id = $1`,
              [cachedOrder.id]
            );
            currentOrder = result.rows && result.rows.length > 0 ? result.rows[0] : null;
          } else {
            currentOrder = await new Promise((resolve, reject) => {
              db.get(
                `SELECT id, woo_order_id, status, customer_email, customer_name, total, bank_account_id, description, merchant_email
                 FROM orders
                 WHERE id = ?`,
                [cachedOrder.id],
                (err, row) => {
                  if (err) reject(err);
                  else resolve(row || null);
                }
              );
            });
          }
          
          if (currentOrder) {
            const normalizedCachedStatus = cachedOrder.lastSeenStatus ? String(cachedOrder.lastSeenStatus).toLowerCase().trim() : null;
            const currentStatus = currentOrder.status ? String(currentOrder.status).toLowerCase().trim() : null;
            
            // If order transitioned to "completed", send email
            if (normalizedCachedStatus && 
                normalizedCachedStatus !== 'completed' && 
                normalizedCachedStatus !== 'cancelled' &&
                currentStatus === 'completed') {
              
              console.log(`📧 Order ${cachedOrder.id} transitioned to completed: ${normalizedCachedStatus} → ${currentStatus}`);
              
              // Get merchant email directly from orders table (stored when order was created)
              let merchantEmail = currentOrder.merchant_email || null;
              
              // Fallback: If merchant_email not in orders table, try bank_accounts lookup (for older orders)
              if (!merchantEmail) {
                console.log(`⚠️ Merchant email not in orders table for order ${cachedOrder.id}, trying bank_accounts lookup...`);
                try {
                  const bankAccount = await BankAccount.getById(currentOrder.bank_account_id);
                  if (bankAccount) {
                    merchantEmail = bankAccount.email;
                    console.log(`✅ Merchant email found from bank_accounts: ${merchantEmail} for bank_account_id: ${currentOrder.bank_account_id}`);
                  }
                } catch (error) {
                  console.error(`❌ Error getting merchant email for order ${cachedOrder.id}:`, error);
                }
              } else {
                console.log(`✅ Merchant email found from orders table: ${merchantEmail} for order ${cachedOrder.id}`);
              }
              
              if (merchantEmail) {
                // Prepare order object for email service
                const orderForEmail = {
                  id: currentOrder.id,
                  woo_order_id: currentOrder.woo_order_id,
                  status: currentStatus,
                  customer_email: currentOrder.customer_email,
                  customer_name: currentOrder.customer_name,
                  total: currentOrder.total,
                  bank_account_id: currentOrder.bank_account_id,
                  description: currentOrder.description
                };
                
                // Send "completed" email notifications
                console.log(`📧 Sending completed email notifications for order ${cachedOrder.id}:`, {
                  customerEmail: currentOrder.customer_email,
                  merchantEmail: merchantEmail,
                  oldStatus: normalizedCachedStatus,
                  newStatus: currentStatus
                });
                
                try {
                  await EmailService.sendOrderStatusEmails(orderForEmail, normalizedCachedStatus, merchantEmail);
                  console.log(`✅ Completed emails sent successfully for order ${cachedOrder.id}`);
                } catch (emailError) {
                  console.error(`❌ Error sending completed emails for order ${cachedOrder.id}:`, emailError);
                  console.error(`❌ Email error details:`, emailError.message, emailError.stack);
                }
              } else {
                console.warn(`⚠️ Skipping completed email for order ${cachedOrder.id} - merchant email not found`);
              }
            } else {
              // Order status is not "completed" - log why we're not sending email
              console.log(`ℹ️ Order ${cachedOrder.id} status check:`, {
                cachedStatus: normalizedCachedStatus,
                currentStatus: currentStatus,
                willSendEmail: false,
                reason: normalizedCachedStatus === 'completed' || normalizedCachedStatus === 'cancelled' 
                  ? 'Order was already completed/cancelled in cache'
                  : currentStatus !== 'completed' 
                    ? `Order is not completed (current status: ${currentStatus})`
                    : 'No cached status to compare'
              });
            }
            
            // Remove from cache only if order is completed or cancelled
            // (Orders that dropped from top 5 but are still non-completed will be removed)
            // This is fine because we only monitor the last 5 orders
            if (currentStatus === 'completed' || currentStatus === 'cancelled') {
              orderStatusCache.delete(cachedOrder.id);
              console.log(`🗑️ Removed order ${cachedOrder.id} from cache (status: ${currentStatus})`);
            } else {
              // Order is still non-completed but dropped from top 5 - remove from cache
              // (We only monitor the last 5 orders, so older orders don't need monitoring)
              orderStatusCache.delete(cachedOrder.id);
              console.log(`🗑️ Removed order ${cachedOrder.id} from cache (dropped from top 5, status: ${currentStatus})`);
            }
          } else {
            // Order not found in database (might have been deleted)
            orderStatusCache.delete(cachedOrder.id);
            console.log(`🗑️ Removed order ${cachedOrder.id} from cache (order not found in database)`);
          }
        } catch (error) {
          console.error(`❌ Error checking cached order ${cachedOrder.id}:`, error);
          // Remove from cache on error to prevent infinite retries
          orderStatusCache.delete(cachedOrder.id);
        }
      }
    }

    console.log(`✅ Order monitoring job completed - monitoring ${recentOrders.length} orders, cache size: ${orderStatusCache.size}`);

  } catch (error) {
    console.error('❌ Error in order monitoring job:', error);
  }
}

/**
 * Schedule the order monitoring job
 * Runs every 15 seconds to check for status changes
 */
const scheduleOrderMonitoring = () => {
  // Run immediately on startup (after 5 seconds to let server initialize)
  setTimeout(() => {
    console.log('🚀 Initial order monitoring check (5s delay)...');
    monitorOrders();
  }, 5000);

  // Schedule to run every 15 seconds
  // Format: second minute hour day month weekday (6 fields for seconds support)
  cron.schedule('*/15 * * * * *', async () => {
    await monitorOrders();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('✅ Order monitoring scheduler initialized - monitoring last 5 non-completed orders, runs every 15 seconds');
};

module.exports = {
  scheduleOrderMonitoring,
  monitorOrders
};

