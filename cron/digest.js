const cron = require('node-cron');
const { db } = require('../database');
const { sendDailyDigest } = require('../services/mailer');

const scheduleDigest = () => {
  // Schedule daily digest at 18:00 (6 PM) local time
  cron.schedule('0 18 * * *', async () => {
    console.log('Running daily digest job at', new Date().toISOString());

    try {
      // Get today's date in YYYY-MM-DD format for SQL comparison
      const today = new Date().toISOString().split('T')[0];

      // Query payment_instructions where status is 'approved' or 'deposited' for current day
      const sql = `
        SELECT
          id,
          order_id,
          amount_cents,
          status,
          created_at
        FROM payment_instructions
        WHERE (status = 'approved' OR status = 'deposited')
          AND DATE(created_at) = ?
        ORDER BY created_at ASC
      `;

      db.all(sql, [today], async (err, rows) => {
        if (err) {
          console.error('Error querying daily digest data:', err);
          return;
        }

        // Only send digest if there are completed payments
        if (rows && rows.length > 0) {
          // Format the data for email display
          const items = rows.map(row => ({
            order_id: row.order_id,
            amount: (row.amount_cents / 100).toFixed(2), // Convert cents to dollars
            status: row.status,
            created_at: row.created_at
          }));

          // Get merchant email from environment variable
          const merchantEmail = process.env.MERCHANT_EMAIL;

          if (!merchantEmail) {
            console.error('MERCHANT_EMAIL environment variable not set');
            return;
          }

          try {
            await sendDailyDigest(merchantEmail, items);
            console.log(`Daily digest sent to ${merchantEmail} with ${items.length} payment(s)`);
          } catch (emailError) {
            console.error('Error sending daily digest email:', emailError);
          }
        } else {
          console.log('No completed payments today - skipping daily digest');
        }
      });

    } catch (error) {
      console.error('Error in daily digest job:', error);
    }
  }, {
    scheduled: true,
    timezone: 'America/Toronto' // Adjust timezone as needed
  });

  console.log('Daily digest scheduler initialized - will run at 18:00 daily');
};

module.exports = {
  scheduleDigest
};