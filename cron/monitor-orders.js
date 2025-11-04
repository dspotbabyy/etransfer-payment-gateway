const cron = require('node-cron');
const { db } = require('../database');
const EmailService = require('../services/emailService');
const Order = require('../models/Order');
const BankAccount = require('../models/BankAccount');

// In-memory cache to track last seen status for orders
// Format: { orderId: lastSeenStatus }
const orderStatusCache = new Map();

/**
 * Monitor last 20 non-completed orders for status changes
 * Send emails when status changes
 * Completed orders are automatically excluded from monitoring
 */
async function monitorOrders() {
  try {
    console.log('🔍 Starting order monitoring job at', new Date().toISOString());

    // Detect database type
    const isPostgreSQL = !db.run || typeof db.run !== 'function';
    
    // Get last 20 non-completed orders
    // Completed orders are automatically excluded, so we always monitor the most recent 20 non-completed orders
    let recentOrders = [];
    
    if (isPostgreSQL) {
      // PostgreSQL query
      const result = await db.query(
        `SELECT id, woo_order_id, status, customer_email, customer_name, total, bank_account_id, description
         FROM orders
         WHERE status NOT IN ('completed', 'cancelled')
         ORDER BY id DESC
         LIMIT 20`
      );
      recentOrders = result.rows || [];
    } else {
      // SQLite query
      recentOrders = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, woo_order_id, status, customer_email, customer_name, total, bank_account_id, description
           FROM orders
           WHERE status NOT IN ('completed', 'cancelled')
           ORDER BY id DESC
           LIMIT 20`,
          [],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });
    }

    console.log(`📊 Found ${recentOrders.length} non-completed orders to monitor (monitoring last 20 non-completed orders)`);

    if (recentOrders.length === 0) {
      console.log('✅ No orders to monitor');
      return;
    }

    // Process each order
    for (const order of recentOrders) {
      try {
        const orderId = order.id;
        const currentStatus = order.status?.toLowerCase() || 'pending';
        const lastSeenStatus = orderStatusCache.get(orderId);

        console.log(`🔍 Checking order ${orderId}:`, {
          currentStatus: currentStatus,
          lastSeenStatus: lastSeenStatus || 'not seen before',
          customerEmail: order.customer_email,
          bankAccountId: order.bank_account_id
        });

        // If status changed, send emails
        if (lastSeenStatus && lastSeenStatus !== currentStatus) {
          console.log(`📧 Status changed for order ${orderId}: ${lastSeenStatus} → ${currentStatus}`);

          // Get merchant email from bank_accounts table
          let merchantEmail = null;
          try {
            const bankAccount = await BankAccount.getById(order.bank_account_id);
            if (bankAccount) {
              merchantEmail = bankAccount.email;
              console.log(`✅ Merchant email found: ${merchantEmail} for bank_account_id: ${order.bank_account_id}`);
            } else {
              console.error(`❌ Bank account not found for bank_account_id: ${order.bank_account_id}`);
            }
          } catch (error) {
            console.error(`❌ Error getting merchant email for order ${orderId}:`, error);
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
            oldStatus: lastSeenStatus,
            newStatus: currentStatus
          });

          try {
            await EmailService.sendOrderStatusEmails(orderForEmail, lastSeenStatus, merchantEmail);
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

        // Update cache with current status
        orderStatusCache.set(orderId, currentStatus);

      } catch (error) {
        console.error(`❌ Error processing order ${order.id}:`, error);
        // Continue with next order
      }
    }

    // Clean up cache: Remove orders that are no longer in recentOrders
    // (These orders were completed/cancelled and are now excluded from monitoring)
    const currentOrderIds = new Set(recentOrders.map(order => order.id));
    for (const [cachedOrderId, cachedStatus] of orderStatusCache.entries()) {
      if (!currentOrderIds.has(cachedOrderId)) {
        // This order is no longer in the monitoring set (likely completed)
        orderStatusCache.delete(cachedOrderId);
        console.log(`🗑️ Removed order ${cachedOrderId} from cache (no longer in monitoring set)`);
      }
    }

    console.log(`✅ Order monitoring job completed - monitoring ${recentOrders.length} orders`);

  } catch (error) {
    console.error('❌ Error in order monitoring job:', error);
  }
}

/**
 * Schedule the order monitoring job
 * Runs every 5 minutes to check for status changes
 */
const scheduleOrderMonitoring = () => {
  // Run immediately on startup (after 10 seconds to let server initialize)
  setTimeout(() => {
    console.log('🚀 Initial order monitoring check (10s delay)...');
    monitorOrders();
  }, 10000);

  // Schedule to run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await monitorOrders();
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('✅ Order monitoring scheduler initialized - monitoring last 20 non-completed orders, runs every 5 minutes');
};

module.exports = {
  scheduleOrderMonitoring,
  monitorOrders
};

