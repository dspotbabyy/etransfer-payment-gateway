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
      bank_account_id
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

    // Validate and correct bank_account_id by looking up customer_email
    const BankAccount = require('../models/BankAccount');
    const bankAccountByEmail = await BankAccount.findByEmail(customer_email);
    
    if (!bankAccountByEmail) {
      return res.status(400).json({
        success: false,
        message: 'No bank account found for customer email: ' + customer_email
      });
    }
    
    // Use the correct bank_account_id from the email lookup
    const correct_bank_account_id = bankAccountByEmail.id;
    
    // Log if the provided bank_account_id was wrong
    if (bank_account_id !== correct_bank_account_id) {
      console.log(`Bank account ID corrected: ${bank_account_id} -> ${correct_bank_account_id} for email: ${customer_email}`);
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
    const EmailService = require('../services/emailService');
    EmailService.sendOrderStatusEmails(newOrder).catch(err => 
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
      description 
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

    if (status && !['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be one of: pending, processing, completed, cancelled'
      });
    }

    // Prepare update data
    const updateData = {};
    if (woo_order_id !== undefined) updateData.woo_order_id = woo_order_id;
    if (status !== undefined) updateData.status = status;
    if (total !== undefined) updateData.total = total;
    if (customer_name !== undefined) updateData.customer_name = customer_name;
    if (customer_email !== undefined) updateData.customer_email = customer_email;
    if (description !== undefined) updateData.description = description;

    // Store old status for email notification
    const oldStatus = existingOrder.status;
    
    // Update order
    const updatedOrder = await Order.update(id, updateData);
    
    // Send email notifications if status changed
    if (status && status !== oldStatus) {
      const EmailService = require('../services/emailService');
      EmailService.sendOrderStatusEmails(updatedOrder, oldStatus).catch(err => 
        console.error('Error sending order status change emails:', err)
      );
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