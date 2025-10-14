require('dotenv').config();
const { db } = require('../database');
const BankAccount = require('../models/BankAccount');

/**
 * Cron job to validate and correct bank_account_id for new orders
 * This should run every few minutes to catch orders with wrong bank_account_id
 */
async function validateOrders() {
  try {
    console.log('🔍 Starting order validation cron job...');
    
    // Get recent orders that might have wrong bank_account_id
    const recentOrders = await db.all(`
      SELECT id, customer_email, bank_account_id, created_at, status
      FROM orders 
      WHERE created_at > datetime('now', '-1 hour')
      AND status = 'pending'
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${recentOrders.length} recent orders to validate`);
    
    for (const order of recentOrders) {
      try {
        console.log(`🔍 Validating order ${order.id} with email: ${order.customer_email}`);
        
        // Look up the correct bank_account_id by customer_email
        const correctBankAccount = await BankAccount.findByEmail(order.customer_email);
        
        if (!correctBankAccount) {
          console.log(`⚠️ No bank account found for email: ${order.customer_email} (Order ID: ${order.id})`);
          continue;
        }
        
        const correctBankAccountId = correctBankAccount.id;
        
        // Check if the bank_account_id is wrong
        if (order.bank_account_id !== correctBankAccountId) {
          console.log(`🔧 Correcting bank_account_id for order ${order.id}: ${order.bank_account_id} -> ${correctBankAccountId}`);
          
          // Update the order with the correct bank_account_id
          await db.run(
            'UPDATE orders SET bank_account_id = ? WHERE id = ?',
            [correctBankAccountId, order.id]
          );
          
          console.log(`✅ Updated order ${order.id} with correct bank_account_id: ${correctBankAccountId}`);
        } else {
          console.log(`✅ Order ${order.id} already has correct bank_account_id: ${order.bank_account_id}`);
        }
        
      } catch (error) {
        console.error(`❌ Error validating order ${order.id}:`, error);
      }
    }
    
    console.log('✅ Order validation cron job completed');
    
  } catch (error) {
    console.error('❌ Error in order validation cron job:', error);
  }
}

// Run the validation
if (require.main === module) {
  validateOrders()
    .then(() => {
      console.log('🎯 Order validation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Order validation failed:', error);
      process.exit(1);
    });
}

module.exports = { validateOrders };
