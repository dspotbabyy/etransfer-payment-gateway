const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDatabase } = require('./database');
const ordersRouter = require('./routes/orders');
const authRouter = require('./routes/auth');
// Temporarily skip Redis-dependent routes
// const instructionsRouter = require('./routes/instructions');
// const { scheduleDigest } = require('./cron/digest');

// Force deployment trigger - Test PostgreSQL persistence (Round 2)
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// CORS configuration - allow all origins including localhost
app.use(cors({
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/orders', ordersRouter);
app.use('/api/auth', authRouter);
// Temporarily skip Redis-dependent routes
// app.use('/', instructionsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running normally',
    timestamp: new Date().toISOString()
  });
});

// Public endpoint to get bank account by email (for WordPress plugin)
app.get('/api/bank-account-by-email', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }

    const BankAccount = require('./models/BankAccount');
    const account = await BankAccount.findByEmail(email);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Bank account not found for this email'
      });
    }

    res.json({
      success: true,
      message: 'Bank account found',
      data: {
        id: account.id,
        email: account.email,
        username: account.username,
        first_name: account.first_name,
        last_name: account.last_name
      }
    });

  } catch (error) {
    console.error('Error getting bank account by email:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when getting bank account'
    });
  }
});

// Manual endpoint to trigger order validation
app.get('/api/validate-orders', async (req, res) => {
  try {
    console.log('🔧 Manual order validation triggered');
    await validateOrders();
    
    res.json({
      success: true,
      message: 'Order validation completed successfully'
    });
    
  } catch (error) {
    console.error('Error in manual order validation:', error);
    res.status(500).json({
      success: false,
      message: 'Error during order validation: ' + error.message
    });
  }
});


// WooCommerce webhook endpoint (optional)
app.post('/webhook/woocommerce', (req, res) => {
  try {
    const signature = req.headers['x-wc-webhook-signature'];
    const payload = JSON.stringify(req.body);
    const secret = process.env.WEBHOOK_SECRET;
    
    if (!secret) {
      console.log('⚠️ WEBHOOK_SECRET not configured');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }
    
    // Verify webhook signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64');
    
    if (signature !== expectedSignature) {
      console.log('❌ Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    console.log('✅ Valid WooCommerce webhook received:', req.body);
    
    // Process the webhook data
    const orderData = req.body;
    console.log(`📋 Order ${orderData.id} status: ${orderData.status}`);
    
    res.status(200).json({ success: true, message: 'Webhook processed' });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test webhook endpoint (for testing)
app.get('/webhook/woocommerce/test', (req, res) => {
  res.json({
    success: true,
    message: 'Webhook endpoint is working',
    timestamp: new Date().toISOString(),
    endpoint: '/webhook/woocommerce',
    method: 'POST'
  });
});


// Debug endpoint for database configuration
app.get('/debug', (req, res) => {
  res.json({
    success: true,
    message: 'Database Configuration Debug',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      RENDER: process.env.RENDER,
      DATABASE_URL_EXISTS: !!process.env.DATABASE_URL,
      DATABASE_URL_PREFIX: process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) + '...' : 'Not set',
      isProduction: process.env.NODE_ENV === 'production' || process.env.RENDER === 'true'
    },
    database: {
      type: (process.env.NODE_ENV === 'production' || process.env.RENDER === 'true') && process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite',
      message: 'Check logs for detailed database connection status'
    },
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'E-Transfer API - Order Management',
    version: '1.0.0',
    endpoints: {
      'Orders': {
        'Check URL': 'GET /api/orders/check-url?url_site=YOUR_URL',
        'Create Order': 'POST /api/orders (requires bank_account_id in body)',
        'Get Orders List': 'GET /api/orders?bank_account_id=ID',
        'Get My Orders (Role-based)': 'GET /api/orders/my-orders?user_email=USER_EMAIL (admin sees all, customer sees own)',
        'Get Filtered Orders': 'GET /api/orders/filtered?user_email=USER_EMAIL&bank_account_id=ID&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&date=YYYY-MM-DD&status=STATUS',
        'View Order Details': 'GET /api/orders/:id?user_email=USER_EMAIL (role-based access)',
        'Update Order': 'PUT /api/orders/:id?user_email=USER_EMAIL (role-based access)',
        'Delete Order': 'DELETE /api/orders/:id?user_email=USER_EMAIL (role-based access)',
        'Summary by Accounts': 'GET /api/orders/summary/accounts?user_email=ADMIN_EMAIL&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&date=YYYY-MM-DD (admin only)',
        'Summary by Days': 'GET /api/orders/summary/days?user_email=USER_EMAIL&bank_account_id=ID&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD',
        'Merchant Statistics': 'GET /api/orders/stats/merchant'
      },
      'Authentication': {
        'Register Account': 'POST /api/auth/register',
        'Login': 'POST /api/auth/login',
        'Update Account': 'PUT /api/auth/accounts/:id',
        'Get All Accounts': 'GET /api/auth/accounts',
        'Get Account by ID': 'GET /api/auth/accounts/:id'
      },
      'System': {
        'Health check': 'GET /health'
      }
    },
    'Workflow': '1. Check URL → 2. Get bank_account_id → 3. Use bank_account_id for order operations',
    'Role-based Access': {
      'Admin': 'Can view all orders, any order details, and summary by accounts',
      'Customer': 'Can view only own orders, own order details, and own summary by days'
    },
    'Filter Options': {
      'bank_account_id': 'Filter by specific bank account (admin only)',
      'start_date': 'Filter orders from this date (YYYY-MM-DD)',
      'end_date': 'Filter orders until this date (YYYY-MM-DD)',
      'date': 'Filter orders on specific date (YYYY-MM-DD)',
      'status': 'Filter by order status (pending, processing, completed)'
    }
  });
});

// Schedule order validation cron job
const { validateOrders } = require('./cron/validate-orders');

// Run order validation every 5 minutes
setInterval(async () => {
  try {
    await validateOrders();
  } catch (error) {
    console.error('Order validation cron job error:', error);
  }
}, 1 * 60 * 1000); // 1 minute

console.log('🕐 Order validation cron job scheduled to run every 1 minute');

// Order monitoring cron job removed - emails now sent directly from API endpoints when status changes

// Error handling middleware - ensure CORS headers are sent even on errors
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// 404 handler - ensure CORS headers are sent
app.use('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initDatabase();

    // Initialize cron scheduler (temporarily disabled)
    // scheduleDigest();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server is running at http://localhost:${PORT}`);
      console.log(`📊 API Documentation: http://localhost:${PORT}`);
      console.log(`💾 Database: orders.db`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer(); 