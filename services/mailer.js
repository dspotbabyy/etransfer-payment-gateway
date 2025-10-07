const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_PORT == 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendRequestSent = async (to, { order_id, amount }) => {
  const mailOptions = {
    from: process.env.SMTP_USER,
    to: to,
    subject: `Interac Transfer Request Sent - Order #${order_id}`,
    html: `
      <h2>Interac Transfer Request Sent</h2>
      <p>Your Interac e-Transfer request has been successfully sent.</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Order ID:</strong> ${order_id}</p>
        <p><strong>Amount:</strong> $${amount}</p>
      </div>
      <p>The recipient will receive an email notification to accept the transfer.</p>
      <p>Thank you for using our service!</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Request sent email delivered:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending request sent email:', error);
    throw error;
  }
};

const sendDailyDigest = async (to, items) => {
  const today = new Date().toLocaleDateString();
  const totalAmount = items.reduce((sum, item) => sum + parseFloat(item.amount), 0);

  const itemsHtml = items.map(item => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.order_id}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">$${item.amount}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${item.status}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${new Date(item.created_at).toLocaleTimeString()}</td>
    </tr>
  `).join('');

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: to,
    subject: `Daily Payment Digest - ${today}`,
    html: `
      <h2>Daily Payment Summary</h2>
      <p>Here's your daily summary of completed payments for ${today}:</p>

      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Total Payments:</strong> ${items.length}</p>
        <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
      </div>

      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <thead>
          <tr style="background-color: #4CAF50; color: white;">
            <th style="border: 1px solid #ddd; padding: 12px;">Order ID</th>
            <th style="border: 1px solid #ddd; padding: 12px;">Amount</th>
            <th style="border: 1px solid #ddd; padding: 12px;">Status</th>
            <th style="border: 1px solid #ddd; padding: 12px;">Time</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <p>Have a great day!</p>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Daily digest email delivered:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending daily digest email:', error);
    throw error;
  }
};

module.exports = {
  sendRequestSent,
  sendDailyDigest
};