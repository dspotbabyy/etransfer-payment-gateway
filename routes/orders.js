const express = require('express');
const router = express.Router();
const Order = require('../models/Order');

// 1. API to check URL and get bank account info
router.get('/check-url', async (req, res) => {
  try {
    const urlSite = req.query.url_site;
    
    if (!urlSite) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: url_site'
      });
    }

    const bankAccount = await Order.findBankAccountByUrl(urlSite);
    
    if (!bankAccount) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found for this URL'
      });
    }

    res.json({
      success: true,
      message: 'Bank account found',
      data: {
        bank_account_id: bankAccount.id,
        username: bankAccount.username,
        email: bankAccount.email,
        first_name: bankAccount.first_name,
        last_name: bankAccount.last_name,
        url_site: bankAccount.url_site,
        role: bankAccount.role
      }
    });

  } catch (error) {
    console.error('Error checking URL:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when checking URL'
    });
  }
});

// 2. API to create new order (requires bank_account_id)
router.post('/', async (req, res) => {
  try {
    const { 
      woo_order_id, 
      woocommerce_order_id, // WordPress plugin sends this
      status, 
      total, 
      customer_name, 
      customer_email, 
      description, 
      ip_address,
      bank_account_id,
      merchant_email  // Merchant email from WordPress (preferred over database lookup)
    } = req.body;
    
    // Map woocommerce_order_id to woo_order_id if provided
    const final_woo_order_id = woo_order_id || woocommerce_order_id || null;
    
    // Validation
    if (!total || !customer_email || !bank_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required information: total, customer_email, bank_account_id'
      });
    }

    if (typeof total !== 'number' || total <= 0) {
      return res.status(400).json({
        success: false,
        message: 'total must be a positive number'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customer_email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer email format'
      });
    }

    // Validate merchant_email format if provided
    let final_merchant_email = merchant_email;
    if (merchant_email && !emailRegex.test(merchant_email)) {
      console.warn('⚠️ Invalid merchant_email format provided, will use database lookup:', merchant_email);
      final_merchant_email = null;
    }

    // Validate bank_account_id exists
    // IMPORTANT: customer_email is the customer's email (from WooCommerce order) - saved as-is
    //            merchant email is ONLY used for email notifications (retrieved from bank_accounts table)
    const BankAccount = require('../models/BankAccount');
    const bankAccount = await BankAccount.getById(bank_account_id);
    
    if (!bankAccount) {
      return res.status(400).json({
        success: false,
        message: 'Bank account not found for bank_account_id: ' + bank_account_id
      });
    }
    
    // Validate and correct bank_account_id using customer_email
    // This handles cases where WordPress sends wrong bank_account_id
    // Note: customer_email should NOT match merchant email (they're different)
    // But we check anyway to correct wrong bank_account_id from WordPress
    const bankAccountByCustomerEmail = await BankAccount.findByEmail(customer_email);
    
    let correct_bank_account_id = bank_account_id;
    
    // If customer_email matches a bank account email, it means WordPress sent wrong bank_account_id
    // Use the correct one, but keep customer_email as-is (it's still the customer's email)
    if (bankAccountByCustomerEmail && bankAccountByCustomerEmail.id !== bank_account_id) {
      correct_bank_account_id = bankAccountByCustomerEmail.id;
      console.log(`⚠️ Bank account ID corrected: ${bank_account_id} -> ${correct_bank_account_id}`);
      console.log(`   Note: customer_email (${customer_email}) should be customer's email, not merchant's`);
    }
    
    // Use provided merchant_email if valid, otherwise use database lookup
    let email_merchant_email = final_merchant_email || bankAccount.email;
    
    // If provided merchant_email differs from database, use the provided one (trust WordPress)
    if (final_merchant_email && final_merchant_email !== bankAccount.email) {
      console.log('📧 Using merchant_email from request (different from database):', {
        provided: final_merchant_email,
        database: bankAccount.email,
        message: 'Using provided merchant_email as it may be more accurate'
      });
      email_merchant_email = final_merchant_email;
    }
    
    // Log for verification
    console.log('📝 Order creation:', {
      customer_email: customer_email,  // Customer's email (saved in order)
      merchant_email_from_request: final_merchant_email,
      merchant_email_from_database: bankAccount.email,
      merchant_email_to_use: email_merchant_email,  // Merchant's email (for email notifications)
      bank_account_id: correct_bank_account_id
    });
    
    // Warning if customer_email matches merchant email (shouldn't happen)
    if (customer_email === email_merchant_email) {
      console.warn('⚠️ WARNING: customer_email matches merchant email!', {
        customerEmail: customer_email,
        merchantEmail: email_merchant_email,
        message: 'This might indicate customer_email is incorrectly set to merchant email'
      });
    }

    // Check if order already exists with same bank_account_id, customer_email, and woo_order_id
    if (final_woo_order_id) {
      const existingOrder = await Order.findDuplicate({
        bank_account_id: correct_bank_account_id,
        customer_email: customer_email,
        woo_order_id: final_woo_order_id
      });

      if (existingOrder) {
        console.log(`Duplicate order found: ID ${existingOrder.id}, Bank Account ID: ${correct_bank_account_id}, Customer: ${customer_email}, WooCommerce Order ID: ${final_woo_order_id}`);
        return res.status(200).json({
          success: true,
          message: 'Order already exists',
          data: existingOrder,
          duplicate: true
        });
      }
    }

    // Create new order
    const newOrder = await Order.create({
      woo_order_id: final_woo_order_id,
      status: status || 'pending',
      total,
      customer_name: customer_name || null,
      customer_email,
      description: description || null,
      ip_address: ip_address || req.ip,
      bank_account_id: correct_bank_account_id
    });

    // Log successful order creation
    console.log(`Order created successfully: ID ${newOrder.id}, Bank Account ID: ${correct_bank_account_id}, Customer: ${customer_email}`);

    // Send email notifications (async, don't wait)
    // Pass merchant_email explicitly to ensure correct email is used
    const EmailService = require('../services/emailService');
    EmailService.sendOrderStatusEmails(newOrder, null, email_merchant_email).catch(err => 
      console.error('Error sending order creation emails:', err)
    );

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: newOrder
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when creating order'
    });
  }
});

// 3. API to get orders list (filtered by bank account)
router.get('/', async (req, res) => {
  try {
    const { bank_account_id } = req.query;
    
    if (!bank_account_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: bank_account_id'
      });
    }

    // Check if bank account exists
    const bankAccount = await Order.findBankAccountById(bank_account_id);
    if (!bankAccount) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bank_account_id: Bank account not found'
      });
    }

    const orders = await Order.getByBankAccountId(bank_account_id);
    
    res.json({
      success: true,
      message: 'Orders list retrieved successfully',
      data: orders,
      total: orders.length,
      bank_account: {
        id: bankAccount.id,
        username: bankAccount.username,
        url_site: bankAccount.url_site
      }
    });

  } catch (error) {
    console.error('Error getting orders list:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when getting orders list'
    });
  }
});

// 4. Unified API to get orders based on role (admin sees all, customer sees own)
router.get('/my-orders', async (req, res) => {
  try {
    const { user_email } = req.query;
    
    if (!user_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: user_email'
      });
    }

    // Check if user exists
    const userAccount = await Order.findBankAccountByEmail(user_email);
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    let orders;
    let message;

    if (userAccount.role === 'admin') {
      // Admin sees all orders
      orders = await Order.getAll();
      message = 'All orders retrieved successfully (admin view)';
    } else {
      // Customer sees only their own orders
      orders = await Order.getByBankAccountId(userAccount.id);
      message = 'User orders retrieved successfully';
    }
    
    res.json({
      success: true,
      message: message,
      data: orders,
      total: orders.length,
      user: {
        id: userAccount.id,
        username: userAccount.username,
        email: userAccount.email,
        first_name: userAccount.first_name,
        last_name: userAccount.last_name,
        url_site: userAccount.url_site,
        role: userAccount.role
      },
      access_level: userAccount.role === 'admin' ? 'all_orders' : 'own_orders'
    });

  } catch (error) {
    console.error('Error getting orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when getting orders'
    });
  }
});

// 5. API to get filtered orders (by account, date, status)
router.get('/filtered', async (req, res) => {
  try {
    const { 
      user_email, 
      bank_account_id, 
      start_date, 
      end_date, 
      date, 
      status 
    } = req.query;
    
    if (!user_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: user_email'
      });
    }

    // Check if user exists
    const userAccount = await Order.findBankAccountByEmail(user_email);
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Build filters
    const filters = {};
    
    if (userAccount.role === 'customer') {
      // Customer can only filter their own orders
      filters.bank_account_id = userAccount.id;
    } else if (bank_account_id) {
      // Admin can filter by specific account
      filters.bank_account_id = bank_account_id;
    }
    
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (date) filters.date = date;
    if (status) filters.status = status;

    const orders = await Order.getWithFilters(filters);
    
    res.json({
      success: true,
      message: 'Filtered orders retrieved successfully',
      data: orders,
      total: orders.length,
      filters: filters,
      user: {
        id: userAccount.id,
        username: userAccount.username,
        email: userAccount.email,
        role: userAccount.role
      }
    });

  } catch (error) {
    console.error('Error getting filtered orders:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when getting filtered orders'
    });
  }
});

// 6. API to get summary totals by account
router.get('/summary/accounts', async (req, res) => {
  try {
    const { 
      user_email, 
      start_date, 
      end_date, 
      date 
    } = req.query;
    
    if (!user_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: user_email'
      });
    }

    // Check if user exists
    const userAccount = await Order.findBankAccountByEmail(user_email);
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Only admin can see summary by accounts
    if (userAccount.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only admin can view summary by accounts'
      });
    }

    // Build filters
    const filters = {};
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;
    if (date) filters.date = date;

    const summary = await Order.getSummaryByAccount(filters);
    
    res.json({
      success: true,
      message: 'Summary by accounts retrieved successfully',
      data: summary,
      total_accounts: summary.length,
      filters: filters,
      user: {
        id: userAccount.id,
        username: userAccount.username,
        email: userAccount.email,
        role: userAccount.role
      }
    });

  } catch (error) {
    console.error('Error getting summary by accounts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when getting summary by accounts'
    });
  }
});

// 7. API to get summary totals by day
router.get('/summary/days', async (req, res) => {
  try {
    const { 
      user_email, 
      bank_account_id, 
      start_date, 
      end_date 
    } = req.query;
    
    if (!user_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: user_email'
      });
    }

    // Check if user exists
    const userAccount = await Order.findBankAccountByEmail(user_email);
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Build filters
    const filters = {};
    
    if (userAccount.role === 'customer') {
      // Customer can only see their own summary
      filters.bank_account_id = userAccount.id;
    } else if (bank_account_id) {
      // Admin can filter by specific account
      filters.bank_account_id = bank_account_id;
    }
    
    if (start_date) filters.start_date = start_date;
    if (end_date) filters.end_date = end_date;

    const summary = await Order.getSummaryByDay(filters);
    
    res.json({
      success: true,
      message: 'Summary by days retrieved successfully',
      data: summary,
      total_days: summary.length,
      filters: filters,
      user: {
        id: userAccount.id,
        username: userAccount.username,
        email: userAccount.email,
        role: userAccount.role
      }
    });

  } catch (error) {
    console.error('Error getting summary by days:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when getting summary by days'
    });
  }
});

// 8. API for merchant statistics (admin only)
router.get('/stats/merchant', async (req, res) => {
  try {
    const stats = await Order.getStatsByMerchant();
    
    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: stats
    });

  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when getting statistics'
    });
  }
});

// 9. API to view order details by ID (role-based access)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_email } = req.query;
    
    if (!user_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: user_email'
      });
    }

    // Check if user exists
    const userAccount = await Order.findBankAccountByEmail(user_email);
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Get order details
    const order = await Order.getById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check access permission
    if (userAccount.role === 'admin') {
      // Admin can view any order
      res.json({
        success: true,
        message: 'Order details retrieved successfully (admin view)',
        data: order,
        user: {
          id: userAccount.id,
          username: userAccount.username,
          email: userAccount.email,
          role: userAccount.role
        },
        access_level: 'admin_access'
      });
    } else {
      // Customer can only view their own orders
      if (order.bank_account_id !== userAccount.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own orders'
        });
      }

      res.json({
        success: true,
        message: 'Order details retrieved successfully',
        data: order,
        user: {
          id: userAccount.id,
          username: userAccount.username,
          email: userAccount.email,
          role: userAccount.role
        },
        access_level: 'own_order'
      });
    }

  } catch (error) {
    console.error('Error getting order details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when getting order details'
    });
  }
});

// 10. API to update/edit order (role-based access)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_email } = req.query;
    const { 
      woo_order_id, 
      status, 
      total, 
      customer_name, 
      customer_email, 
      description,
      merchant_email  // Merchant email from WordPress (preferred over database lookup)
    } = req.body;
    
    if (!user_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: user_email'
      });
    }

    // Check if user exists
    const userAccount = await Order.findBankAccountByEmail(user_email);
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Get order details
    const existingOrder = await Order.getById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check access permission
    if (userAccount.role !== 'admin' && existingOrder.bank_account_id !== userAccount.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit your own orders'
      });
    }

    // Validation
    if (total && (typeof total !== 'number' || total <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'total must be a positive number'
      });
    }

    if (customer_email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customer_email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid customer email format'
        });
      }
    }

    // Validate merchant_email format if provided
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let final_merchant_email = merchant_email;
    if (merchant_email && !emailRegex.test(merchant_email)) {
      console.warn('⚠️ Invalid merchant_email format provided, will use database lookup:', merchant_email);
      final_merchant_email = null;
    }

    // Normalize status for validation (case-insensitive)
    const normalizedStatusForValidation = status ? String(status).toLowerCase().trim() : null;
    if (status && !['pending', 'processing', 'completed', 'cancelled'].includes(normalizedStatusForValidation)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: pending, processing, completed, cancelled'
      });
    }

    // Prepare update data
    const updateData = {};
    if (woo_order_id !== undefined) updateData.woo_order_id = woo_order_id;
    // Use normalized status for consistency
    if (status !== undefined) updateData.status = normalizedStatusForValidation;
    if (total !== undefined) updateData.total = total;
    if (customer_name !== undefined) updateData.customer_name = customer_name;
    if (customer_email !== undefined) updateData.customer_email = customer_email;
    if (description !== undefined) updateData.description = description;

    // Log incoming request
    console.log('📥 PUT /api/orders/:id request:', {
      orderId: id,
      requestBody: req.body,
      statusInBody: status,
      queryParams: req.query
    });
    
    // Store old status for email notification (normalize for comparison)
    const oldStatus = existingOrder.status ? String(existingOrder.status).toLowerCase().trim() : null;
    // Use normalizedStatusForValidation if status was provided, otherwise null
    const newStatus = normalizedStatusForValidation;
    
    console.log('📊 Status change check:', {
      orderId: id,
      oldStatus: oldStatus,
      oldStatusRaw: existingOrder.status,
      newStatus: newStatus,
      newStatusRaw: status,
      statusProvided: !!status,
      statusInUpdateData: !!updateData.status,
      statusChanged: newStatus && oldStatus && newStatus !== oldStatus
    });
    
    // Get merchant email for email notifications
    // Use provided merchant_email if valid, otherwise use database lookup
    const BankAccount = require('../models/BankAccount');
    const bankAccount = await BankAccount.getById(existingOrder.bank_account_id);
    const merchantEmailFromDB = bankAccount ? bankAccount.email : null;
    
    // Use provided merchant_email if valid, otherwise use database lookup
    let email_merchant_email = final_merchant_email || merchantEmailFromDB;
    
    // If provided merchant_email differs from database, use the provided one (trust WordPress)
    if (final_merchant_email && final_merchant_email !== merchantEmailFromDB) {
      console.log('📧 Using merchant_email from request (different from database):', {
        provided: final_merchant_email,
        database: merchantEmailFromDB,
        message: 'Using provided merchant_email as it may be more accurate'
      });
      email_merchant_email = final_merchant_email;
    }
    
    console.log('📧 Merchant email lookup:', {
      bankAccountId: existingOrder.bank_account_id,
      merchantEmailFromRequest: final_merchant_email,
      merchantEmailFromDatabase: merchantEmailFromDB,
      merchantEmailToUse: email_merchant_email,
      found: !!email_merchant_email
    });
    
    if (!email_merchant_email) {
      console.warn('⚠️ Could not find merchant email for bank_account_id:', existingOrder.bank_account_id);
    }
    
    // Update order
    const updatedOrder = await Order.update(id, updateData);
    
    console.log('✅ Order updated:', {
      orderId: id,
      updatedStatus: updatedOrder.status,
      previousStatus: existingOrder.status
    });
    
    // Send email notifications if status changed (normalize comparison)
    // IMPORTANT: Check if status changed BEFORE update and AFTER update
    const statusActuallyChanged = newStatus && oldStatus && newStatus !== oldStatus;
    
    console.log('🔍 Email sending decision:', {
      orderId: id,
      statusActuallyChanged: statusActuallyChanged,
      willSendEmails: statusActuallyChanged,
      oldStatus: oldStatus,
      newStatus: newStatus,
      updatedOrderStatus: updatedOrder.status ? String(updatedOrder.status).toLowerCase().trim() : null
    });
    
    if (statusActuallyChanged) {
      console.log('📧📧📧 STATUS CHANGE DETECTED - SENDING EMAILS 📧📧📧', {
        orderId: id,
        oldStatus: oldStatus,
        newStatus: newStatus,
        merchantEmail: email_merchant_email,
        customerEmail: updatedOrder.customer_email,
        willSendEmails: true
      });
      
      // CRITICAL: Ensure updatedOrder has the correct status for email service
      // The updatedOrder.status should match the new status we're setting
      if (updatedOrder.status && String(updatedOrder.status).toLowerCase().trim() !== newStatus) {
        console.warn('⚠️ WARNING: Updated order status does not match new status!', {
          updatedOrderStatus: updatedOrder.status,
          newStatus: newStatus,
          fixing: 'Using newStatus from request'
        });
        // Fix the status in updatedOrder for email service
        updatedOrder.status = newStatus;
      }
      
      const EmailService = require('../services/emailService');
      // Pass merchant_email explicitly to ensure correct email is used
      // Email service will fallback to database lookup if email_merchant_email is null
      // Pass the original oldStatus (not normalized) for email service
      console.log('🚀 Calling EmailService.sendOrderStatusEmails with:', {
        orderId: updatedOrder.id,
        orderStatus: updatedOrder.status,
        previousStatus: existingOrder.status,
        merchantEmail: email_merchant_email,
        customerEmail: updatedOrder.customer_email
      });
      
      EmailService.sendOrderStatusEmails(updatedOrder, existingOrder.status, email_merchant_email)
        .then((result) => {
          console.log('✅ Email service completed successfully for order:', id);
          console.log('📧 Email service result:', result);
        })
        .catch(err => {
          console.error('❌ Error sending order status change emails:', err);
          console.error('Error details:', {
            orderId: id,
            error: err.message,
            stack: err.stack
          });
        });
    } else {
      console.log('ℹ️ No status change or status not provided:', {
        orderId: id,
        statusProvided: !!status,
        oldStatus: oldStatus,
        newStatus: newStatus,
        oldStatusRaw: existingOrder.status,
        newStatusRaw: status,
        statusChanged: newStatus && oldStatus && newStatus !== oldStatus,
        reason: !newStatus ? 'Status not provided in request body' : 
                !oldStatus ? 'Old status not found' :
                newStatus === oldStatus ? 'Status unchanged (both are ' + newStatus + ')' :
                'Unknown reason'
      });
    }
    
    res.json({
      success: true,
      message: 'Order updated successfully',
      data: updatedOrder,
      user: {
        id: userAccount.id,
        username: userAccount.username,
        email: userAccount.email,
        role: userAccount.role
      },
      access_level: userAccount.role === 'admin' ? 'admin_access' : 'own_order'
    });

  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when updating order'
    });
  }
});

// 11. API to delete order (role-based access)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_email } = req.query;
    
    if (!user_email) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: user_email'
      });
    }

    // Check if user exists
    const userAccount = await Order.findBankAccountByEmail(user_email);
    if (!userAccount) {
      return res.status(404).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Get order details
    const existingOrder = await Order.getById(id);
    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check access permission
    if (userAccount.role !== 'admin' && existingOrder.bank_account_id !== userAccount.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own orders'
      });
    }

    // Delete order
    await Order.delete(id);
    
    res.json({
      success: true,
      message: 'Order deleted successfully',
      deleted_order_id: id,
      user: {
        id: userAccount.id,
        username: userAccount.username,
        email: userAccount.email,
        role: userAccount.role
      },
      access_level: userAccount.role === 'admin' ? 'admin_access' : 'own_order'
    });

  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when deleting order'
    });
  }
});

module.exports = router; 