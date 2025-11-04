const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_KEY || process.env.resend_key);

/**
 * Email Service for Order Notifications
 * Handles sending emails to customers and merchants for order status changes
 */

class EmailService {
  /**
   * Get merchant email from bank account
   */
  static async getMerchantEmail(bankAccountId) {
    try {
      const BankAccount = require('../models/BankAccount');
      const bankAccount = await BankAccount.getById(bankAccountId);
      
      if (bankAccount) {
        console.log('✅ Merchant email retrieved from database:', {
          bankAccountId: bankAccountId,
          merchantEmail: bankAccount.email,
          merchantName: bankAccount.username || bankAccount.email,
          databaseSource: 'bank_accounts table'
        });
        
        // Validate that we got a valid email
        if (!bankAccount.email || typeof bankAccount.email !== 'string') {
          console.error('❌ Invalid merchant email from database:', bankAccount.email);
          return null;
        }
        
        return bankAccount.email;
      } else {
        console.error('❌ Bank account not found for ID:', bankAccountId);
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting merchant email:', error);
      return null;
    }
  }

  /**
   * Send On Hold email to customer (payment instructions)
   */
  static async sendOnHoldEmail(order, merchantEmail) {
    try {
      const subject = `Complete Your Order — e-Transfer Details`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4A90E2; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .order-info { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #4A90E2; }
            .payment-info { background-color: #E8F4F8; padding: 20px; margin: 20px 0; border-radius: 5px; }
            .highlight { color: #4A90E2; font-weight: bold; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4A90E2; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Complete Your Order</h1>
            </div>
            <div class="content">
              <p>Hi ${order.customer_name || 'Valued Customer'},</p>
              
              <p>Thank you for your order! Your order #${order.woo_order_id || order.id} is on hold pending payment.</p>
              
              <div class="order-info">
                <h2>Order Details</h2>
                <p><strong>Order Number:</strong> ${order.woo_order_id || order.id}</p>
                <p><strong>Total Amount:</strong> $${(order.total / 100).toFixed(2)} CAD</p>
                <p><strong>Status:</strong> Awaiting Payment</p>
              </div>
              
              <div class="payment-info">
                <h2>Payment Instructions</h2>
                <p>Please send your <span class="highlight">Interac e-Transfer</span> to:</p>
                <p style="font-size: 18px; font-weight: bold; margin: 15px 0;">${merchantEmail}</p>
                <p><strong>Amount:</strong> <span class="highlight">$${(order.total / 100).toFixed(2)} CAD</span></p>
                <p style="margin-top: 15px; padding: 10px; background-color: white; border-radius: 3px;">
                  ✅ <strong>Auto-Deposit enabled</strong> — No security question required.
                </p>
              </div>
              
              <p>Once we receive your payment, we'll begin processing your order immediately.</p>
              
              <p>If you have any questions, please don't hesitate to contact us.</p>
              
              <p>Best regards,<br>The Team</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const fromEmail = process.env.EMAIL_FROM || 'noreply@dexxpay.com';
      
      console.log('📧 Sending On Hold email:', {
        from: fromEmail,
        to: order.customer_email,
        orderId: order.id || order.woo_order_id
      });

      const response = await resend.emails.send({
        from: fromEmail,
        to: order.customer_email,
        subject: subject,
        html: html
      });

      console.log('✅ On Hold email sent to customer:', order.customer_email, response);
      return response;
    } catch (error) {
      console.error('❌ Error sending On Hold email:', error);
      throw error;
    }
  }

  /**
   * Send New Order email to merchant
   */
  static async sendNewOrderEmail(order, merchantEmail) {
    try {
      const subject = `New e-Transfer Order Received`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .order-info { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #28a745; }
            .highlight { color: #28a745; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Order Received</h1>
            </div>
            <div class="content">
              <p>A new order has been placed via Interac e-Transfer and is awaiting payment confirmation.</p>
              
              <div class="order-info">
                <h2>Order Details</h2>
                <p><strong>Order Number:</strong> ${order.woo_order_id || order.id}</p>
                <p><strong>Customer Name:</strong> ${order.customer_name || 'N/A'}</p>
                <p><strong>Customer Email:</strong> ${order.customer_email}</p>
                <p><strong>Total Amount:</strong> <span class="highlight">$${(order.total / 100).toFixed(2)} CAD</span></p>
                <p><strong>Status:</strong> ${order.status || 'pending'}</p>
                ${order.description ? `<p><strong>Description:</strong> ${order.description}</p>` : ''}
              </div>
              
              <p>Please monitor for the e-Transfer payment and update the order status once payment is received.</p>
              
              <p>Best regards,<br>Order System</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const fromEmail = process.env.EMAIL_FROM || 'noreply@dexxpay.com';
      
      // CRITICAL: Verify merchantEmail is NOT customer_email
      if (merchantEmail === order.customer_email) {
        console.error('❌ CRITICAL: sendNewOrderEmail - merchantEmail matches customer_email!', {
          merchantEmail: merchantEmail,
          customerEmail: order.customer_email,
          action: 'This email will be sent to the WRONG recipient!'
        });
      }
      
      console.log('📧 Sending New Order email to merchant:', {
        from: fromEmail,
        to: merchantEmail,
        orderId: order.id || order.woo_order_id,
        customerEmail: order.customer_email,
        verification: merchantEmail === order.customer_email ? '❌ WRONG - Same as customer!' : '✅ Correct - Different from customer'
      });

      // FINAL VERIFICATION: Ensure we're NOT sending to customer email
      const finalToEmail = merchantEmail;
      if (finalToEmail === order.customer_email) {
        console.error('❌❌❌ BLOCKED: Attempted to send merchant email to customer email!', {
          attemptedTo: finalToEmail,
          customerEmail: order.customer_email,
          action: 'EMAIL BLOCKED - This would be sent to wrong recipient!'
        });
        throw new Error(`Cannot send merchant email to customer email: ${finalToEmail}`);
      }

      const response = await resend.emails.send({
        from: fromEmail,
        to: finalToEmail,  // This MUST be merchant email, NOT customer email
        subject: subject,
        html: html
      });

      console.log('✅ New Order email sent to merchant:', {
        to: finalToEmail,
        customerEmail: order.customer_email,
        verifiedDifferent: finalToEmail !== order.customer_email ? '✅ YES' : '❌ NO',
        response: response
      });
      return response;
    } catch (error) {
      console.error('❌ Error sending New Order email:', error);
      throw error;
    }
  }

  /**
   * Send Processing email to customer (payment confirmed)
   */
  static async sendProcessingEmail(order, merchantEmail) {
    try {
      const subject = `Payment Received — Order Now Processing`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FFA500; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .order-info { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #FFA500; }
            .highlight { color: #FFA500; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Received</h1>
            </div>
            <div class="content">
              <p>Hi ${order.customer_name || 'Valued Customer'},</p>
              
              <p>Great news! We've received your payment and your order is now being processed.</p>
              
              <div class="order-info">
                <h2>Order Details</h2>
                <p><strong>Order Number:</strong> ${order.woo_order_id || order.id}</p>
                <p><strong>Total Amount:</strong> $${(order.total / 100).toFixed(2)} CAD</p>
                <p><strong>Status:</strong> <span class="highlight">Processing</span></p>
              </div>
              
              <p>We're preparing your order for shipment and will notify you once it's on its way.</p>
              
              <p>Thank you for your purchase!</p>
              
              <p>Best regards,<br>The Team</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const fromEmail = process.env.EMAIL_FROM || 'noreply@dexxpay.com';
      
      console.log('📧 Sending Processing email to customer:', {
        from: fromEmail,
        to: order.customer_email,
        orderId: order.id || order.woo_order_id
      });

      const response = await resend.emails.send({
        from: fromEmail,
        to: order.customer_email,
        subject: subject,
        html: html
      });

      console.log('✅ Processing email sent to customer:', order.customer_email, response);
      return response;
    } catch (error) {
      console.error('❌ Error sending Processing email:', error);
      throw error;
    }
  }

  /**
   * Send Processing notification to merchant
   */
  static async sendProcessingNotificationToMerchant(order, merchantEmail) {
    try {
      const subject = `Order Payment Confirmed - Order #${order.woo_order_id || order.id}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FFA500; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .order-info { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #FFA500; }
            .highlight { color: #FFA500; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Confirmed</h1>
            </div>
            <div class="content">
              <p>Payment has been received for the following order. Please proceed with order fulfillment.</p>
              
              <div class="order-info">
                <h2>Order Details</h2>
                <p><strong>Order Number:</strong> ${order.woo_order_id || order.id}</p>
                <p><strong>Customer:</strong> ${order.customer_name || 'N/A'} (${order.customer_email})</p>
                <p><strong>Amount:</strong> <span class="highlight">$${(order.total / 100).toFixed(2)} CAD</span></p>
                <p><strong>Status:</strong> Processing</p>
              </div>
              
              <p>Please prepare the order for shipment.</p>
              
              <p>Best regards,<br>Order System</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const fromEmail = process.env.EMAIL_FROM || 'noreply@dexxpay.com';
      
      // CRITICAL: Verify merchantEmail is NOT customer_email
      if (merchantEmail === order.customer_email) {
        console.error('❌ CRITICAL: sendProcessingNotificationToMerchant - merchantEmail matches customer_email!', {
          merchantEmail: merchantEmail,
          customerEmail: order.customer_email,
          action: 'This email will be sent to the WRONG recipient!'
        });
      }
      
      console.log('📧 Sending Processing notification to merchant:', {
        from: fromEmail,
        to: merchantEmail,
        orderId: order.id || order.woo_order_id,
        customerEmail: order.customer_email,
        verification: merchantEmail === order.customer_email ? '❌ WRONG - Same as customer!' : '✅ Correct - Different from customer'
      });

      // FINAL VERIFICATION: Ensure we're NOT sending to customer email
      const finalToEmail = merchantEmail;
      if (finalToEmail === order.customer_email) {
        console.error('❌❌❌ BLOCKED: Attempted to send merchant email to customer email!', {
          attemptedTo: finalToEmail,
          customerEmail: order.customer_email,
          action: 'EMAIL BLOCKED - This would be sent to wrong recipient!'
        });
        throw new Error(`Cannot send merchant email to customer email: ${finalToEmail}`);
      }

      const response = await resend.emails.send({
        from: fromEmail,
        to: finalToEmail,  // This MUST be merchant email, NOT customer email
        subject: subject,
        html: html
      });

      console.log('✅ Processing notification sent to merchant:', {
        to: finalToEmail,
        customerEmail: order.customer_email,
        verifiedDifferent: finalToEmail !== order.customer_email ? '✅ YES' : '❌ NO',
        response: response
      });
      return response;
    } catch (error) {
      console.error('❌ Error sending Processing notification to merchant:', error);
      throw error;
    }
  }

  /**
   * Send Completed email to customer
   */
  static async sendCompletedEmail(order, merchantEmail) {
    try {
      const subject = `Your Order Has Been Completed`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .order-info { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #28a745; }
            .highlight { color: #28a745; font-weight: bold; }
            .button { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Completed</h1>
            </div>
            <div class="content">
              <p>Hi ${order.customer_name || 'Valued Customer'},</p>
              
              <p>Great news! Your order has been completed and is on its way to you.</p>
              
              <div class="order-info">
                <h2>Order Details</h2>
                <p><strong>Order Number:</strong> ${order.woo_order_id || order.id}</p>
                <p><strong>Total Amount:</strong> $${(order.total / 100).toFixed(2)} CAD</p>
                <p><strong>Status:</strong> <span class="highlight">Completed</span></p>
              </div>
              
              <p>Your order is now shipped and should arrive soon. You can track your order using the tracking information provided.</p>
              
              <p>Thank you for shopping with us!</p>
              
              <p>Best regards,<br>The Team</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const fromEmail = process.env.EMAIL_FROM || 'noreply@dexxpay.com';
      
      console.log('📧 Sending Completed email to customer:', {
        from: fromEmail,
        to: order.customer_email,
        orderId: order.id || order.woo_order_id
      });

      const response = await resend.emails.send({
        from: fromEmail,
        to: order.customer_email,
        subject: subject,
        html: html
      });

      console.log('✅ Completed email sent to customer:', order.customer_email, response);
      return response;
    } catch (error) {
      console.error('❌ Error sending Completed email:', error);
      throw error;
    }
  }

  /**
   * Send Completed notification to merchant
   */
  static async sendCompletedNotificationToMerchant(order, merchantEmail) {
    try {
      const subject = `Order Completed - Order #${order.woo_order_id || order.id}`;
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .order-info { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #28a745; }
            .highlight { color: #28a745; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Fulfilled</h1>
            </div>
            <div class="content">
              <p>The following order has been marked as completed:</p>
              
              <div class="order-info">
                <h2>Order Details</h2>
                <p><strong>Order Number:</strong> ${order.woo_order_id || order.id}</p>
                <p><strong>Customer:</strong> ${order.customer_name || 'N/A'} (${order.customer_email})</p>
                <p><strong>Amount:</strong> <span class="highlight">$${(order.total / 100).toFixed(2)} CAD</span></p>
                <p><strong>Status:</strong> Completed</p>
              </div>
              
              <p>This order has been successfully fulfilled.</p>
              
              <p>Best regards,<br>Order System</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const fromEmail = process.env.EMAIL_FROM || 'noreply@dexxpay.com';
      
      // CRITICAL: Verify merchantEmail is NOT customer_email
      if (merchantEmail === order.customer_email) {
        console.error('❌ CRITICAL: sendCompletedNotificationToMerchant - merchantEmail matches customer_email!', {
          merchantEmail: merchantEmail,
          customerEmail: order.customer_email,
          action: 'This email will be sent to the WRONG recipient!'
        });
      }
      
      console.log('📧 Sending Completed notification to merchant:', {
        from: fromEmail,
        to: merchantEmail,
        orderId: order.id || order.woo_order_id,
        customerEmail: order.customer_email,
        verification: merchantEmail === order.customer_email ? '❌ WRONG - Same as customer!' : '✅ Correct - Different from customer'
      });

      // FINAL VERIFICATION: Ensure we're NOT sending to customer email
      const finalToEmail = merchantEmail;
      if (finalToEmail === order.customer_email) {
        console.error('❌❌❌ BLOCKED: Attempted to send merchant email to customer email!', {
          attemptedTo: finalToEmail,
          customerEmail: order.customer_email,
          action: 'EMAIL BLOCKED - This would be sent to wrong recipient!'
        });
        throw new Error(`Cannot send merchant email to customer email: ${finalToEmail}`);
      }

      const response = await resend.emails.send({
        from: fromEmail,
        to: finalToEmail,  // This MUST be merchant email, NOT customer email
        subject: subject,
        html: html
      });

      console.log('✅ Completed notification sent to merchant:', {
        to: finalToEmail,
        customerEmail: order.customer_email,
        verifiedDifferent: finalToEmail !== order.customer_email ? '✅ YES' : '❌ NO',
        response: response
      });
      return response;
    } catch (error) {
      console.error('❌ Error sending Completed notification to merchant:', error);
      throw error;
    }
  }

  /**
   * Send emails based on order status
   * Main entry point for order status changes
   * @param {Object} order - The order object
   * @param {string|null} previousStatus - Previous order status (for status change detection)
   * @param {string|null} providedMerchantEmail - Optional merchant email (preferred over database lookup)
   */
  static async sendOrderStatusEmails(order, previousStatus = null, providedMerchantEmail = null) {
    try {
      console.log('📧 Starting email notification process:', {
        orderId: order.id || order.woo_order_id,
        status: order.status,
        previousStatus: previousStatus,
        customerEmail: order.customer_email,
        bankAccountId: order.bank_account_id,
        providedMerchantEmail: providedMerchantEmail
      });

      // Use provided merchant email if available, otherwise look it up from database
      let merchantEmail = providedMerchantEmail;
      
      if (!merchantEmail) {
        merchantEmail = await this.getMerchantEmail(order.bank_account_id);
      } else {
        console.log('📧 Using provided merchant email (from request):', merchantEmail);
      }
      
      if (!merchantEmail) {
        console.error('❌ Merchant email not found for bank_account_id:', order.bank_account_id);
        return;
      }

      // CRITICAL: Ensure merchantEmail is NOT the same as customer_email
      if (merchantEmail === order.customer_email) {
        console.error('❌ CRITICAL ERROR: Merchant email matches customer email!', {
          merchantEmail: merchantEmail,
          customerEmail: order.customer_email,
          bankAccountId: order.bank_account_id,
          providedMerchantEmail: providedMerchantEmail,
          message: 'This should NEVER happen - merchant and customer emails must be different'
        });
        // Don't return - we'll still try to send, but log the error
      }

      console.log('✅ Email addresses verified:', {
        customerEmail: order.customer_email,
        merchantEmail: merchantEmail,
        bankAccountId: order.bank_account_id,
        source: providedMerchantEmail ? 'provided (request)' : 'database lookup',
        emailsMatch: merchantEmail === order.customer_email ? '⚠️ WARNING: MATCH!' : '✅ Different'
      });

      // CRITICAL SUMMARY: Show exactly where emails will be sent
      console.log('📧📧📧 EMAIL SENDING SUMMARY 📧📧📧', {
        'Customer Email TO': order.customer_email,
        'Merchant Email TO': merchantEmail,
        'Are They Different?': merchantEmail !== order.customer_email ? '✅ YES - CORRECT' : '❌ NO - THIS IS WRONG!',
        'Status': order.status
      });

      // Send emails based on current status
      switch (order.status?.toLowerCase()) {
        case 'pending':
        case 'on-hold':
        case 'onhold':
          // Send On Hold email to customer and New Order email to merchant
          console.log('📧 Sending emails for pending/on-hold status...');
          console.log('📧 Will send to customer:', order.customer_email);
          console.log('📧 Will send to merchant:', merchantEmail);
          
          // Send both emails independently to ensure both are attempted
          const customerEmailPromise = this.sendOnHoldEmail(order, merchantEmail)
            .then(result => {
              console.log('✅ Customer email sent successfully');
              return result;
            })
            .catch(err => {
              console.error('❌ Failed to send On Hold email to customer:', err);
              return { error: err };
            });
          
          const merchantEmailPromise = this.sendNewOrderEmail(order, merchantEmail)
            .then(result => {
              console.log('✅ Merchant email sent successfully');
              return result;
            })
            .catch(err => {
              console.error('❌ Failed to send New Order email to merchant:', err);
              return { error: err };
            });
          
          const pendingEmails = await Promise.allSettled([
            customerEmailPromise,
            merchantEmailPromise
          ]);
          
          console.log('📧 Email results for pending/on-hold:', {
            customerEmail: pendingEmails[0].status === 'fulfilled' ? '✅ Sent' : '❌ Failed',
            merchantEmail: pendingEmails[1].status === 'fulfilled' ? '✅ Sent' : '❌ Failed'
          });
          break;

        case 'processing':
          // Send Processing email to customer and notification to merchant
          console.log('📧 Sending emails for processing status...');
          console.log('📧 Will send to customer:', order.customer_email);
          console.log('📧 Will send to merchant:', merchantEmail);
          
          const customerProcessingPromise = this.sendProcessingEmail(order, merchantEmail)
            .then(result => {
              console.log('✅ Customer processing email sent successfully');
              return result;
            })
            .catch(err => {
              console.error('❌ Failed to send Processing email to customer:', err);
              return { error: err };
            });
          
          const merchantProcessingPromise = this.sendProcessingNotificationToMerchant(order, merchantEmail)
            .then(result => {
              console.log('✅ Merchant processing notification sent successfully');
              return result;
            })
            .catch(err => {
              console.error('❌ Failed to send Processing notification to merchant:', err);
              return { error: err };
            });
          
          const processingEmails = await Promise.allSettled([
            customerProcessingPromise,
            merchantProcessingPromise
          ]);
          
          console.log('📧 Email results for processing:', {
            customerEmail: processingEmails[0].status === 'fulfilled' ? '✅ Sent' : '❌ Failed',
            merchantEmail: processingEmails[1].status === 'fulfilled' ? '✅ Sent' : '❌ Failed'
          });
          break;

        case 'completed':
          // Send Completed email to customer and notification to merchant
          console.log('📧 Sending emails for completed status...');
          console.log('📧 Will send to customer:', order.customer_email);
          console.log('📧 Will send to merchant:', merchantEmail);
          
          const customerCompletedPromise = this.sendCompletedEmail(order, merchantEmail)
            .then(result => {
              console.log('✅ Customer completed email sent successfully');
              return result;
            })
            .catch(err => {
              console.error('❌ Failed to send Completed email to customer:', err);
              return { error: err };
            });
          
          const merchantCompletedPromise = this.sendCompletedNotificationToMerchant(order, merchantEmail)
            .then(result => {
              console.log('✅ Merchant completed notification sent successfully');
              return result;
            })
            .catch(err => {
              console.error('❌ Failed to send Completed notification to merchant:', err);
              return { error: err };
            });
          
          const completedEmails = await Promise.allSettled([
            customerCompletedPromise,
            merchantCompletedPromise
          ]);
          
          console.log('📧 Email results for completed:', {
            customerEmail: completedEmails[0].status === 'fulfilled' ? '✅ Sent' : '❌ Failed',
            merchantEmail: completedEmails[1].status === 'fulfilled' ? '✅ Sent' : '❌ Failed'
          });
          break;

        default:
          console.log(`No email template for status: ${order.status}`);
      }
    } catch (error) {
      console.error('❌ Error in sendOrderStatusEmails:', error);
      // Don't throw - email failures shouldn't break the order flow
    }
  }
}

module.exports = EmailService;
