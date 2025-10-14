const crypto = require('crypto');
const axios = require('axios');
const { db } = require('../database');

// WooCommerce REST API integration
async function updateWooCommerceOrder(wooOrderId, newStatus, confidence) {
  if (!wooOrderId) {
    console.log('⚠️ No WooCommerce order ID provided');
    return;
  }

  // Map our status to WooCommerce status
  const wooStatus = mapToWooCommerceStatus(newStatus);
  
  if (!wooStatus) {
    console.log('⚠️ No WooCommerce status mapping for:', newStatus);
    return;
  }

  // WooCommerce REST API configuration
  const wooConfig = {
    url: process.env.WOOCOMMERCE_URL || 'https://biokure.com',
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || 'ck_5a655cb7122f671713d2bcac753db77512f53b42',
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || 'cs_8dcc34e01bfac19941048cb19319ada5ff7dcd8c'
  };

  if (!wooConfig.url || !wooConfig.consumerKey || !wooConfig.consumerSecret) {
    console.log('⚠️ WooCommerce API credentials not configured');
    return;
  }

  const updatePayload = {
    status: wooStatus,
    meta_data: [
      {
        key: '_etransfer_payment_confirmed',
        value: 'true'
      },
      {
        key: '_etransfer_confidence',
        value: confidence.toString()
      },
      {
        key: '_etransfer_updated_at',
        value: new Date().toISOString()
      }
    ]
  };

  // Retry logic for webhook
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`🔄 Updating WooCommerce order ${wooOrderId} to status: ${wooStatus} (attempt ${retryCount + 1})`);
      
      const response = await axios.put(
        `${wooConfig.url}/wp-json/wc/v3/orders/${wooOrderId}`,
        updatePayload,
        {
          auth: {
            username: wooConfig.consumerKey,
            password: wooConfig.consumerSecret
          },
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      console.log(`✅ WooCommerce order ${wooOrderId} updated successfully`);
      console.log(`📊 Response status: ${response.status}`);
      
      // Log the updated order details
      if (response.data) {
        console.log(`📋 Updated order status: ${response.data.status}`);
        console.log(`💰 Order total: ${response.data.total}`);
      }
      
      return; // Success, exit retry loop
      
    } catch (error) {
      retryCount++;
      console.error(`❌ WooCommerce API error (attempt ${retryCount}):`, error.message);
      
      if (error.response) {
        console.error(`📊 Response status: ${error.response.status}`);
        console.error(`📋 Response data:`, error.response.data);
      }
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`❌ Failed to update WooCommerce order after ${maxRetries} attempts`);
        
        // Send fallback webhook if configured
        await sendFallbackWebhook(wooOrderId, wooStatus, confidence, error.message);
      }
    }
  }
}

// Map our status to WooCommerce status
function mapToWooCommerceStatus(status) {
  const statusMap = {
    'completed': 'processing',
    'approved': 'processing', 
    'deposited': 'processing',
    'pending': 'pending',
    'cancelled': 'cancelled',
    'failed': 'failed'
  };
  
  return statusMap[status] || null;
}

// Fallback webhook for failed WooCommerce API calls
async function sendFallbackWebhook(wooOrderId, status, confidence, errorMessage) {
  if (!process.env.WEBHOOK_URL || !process.env.WEBHOOK_SECRET) {
    console.log('⚠️ No fallback webhook configured');
    return;
  }

  const payload = {
    order_id: wooOrderId,
    status: status,
    confidence: confidence,
    error: errorMessage,
    timestamp: new Date().toISOString(),
    source: 'etransfer_payment_gateway'
  };

  const signature = sign(payload, process.env.WEBHOOK_SECRET);

  try {
    await axios.post(process.env.WEBHOOK_URL, payload, {
      headers: {
        'X-Dexx-Signature': signature,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    console.log('✅ Fallback webhook sent');
  } catch (error) {
    console.error('❌ Fallback webhook failed:', error.message);
  }
}

// Helper functions to extract information from email text
function extractPayerHandle(text) {
  // Look for payer email patterns
  const patterns = [
    /from[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /payer[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /sent[:\s]*by[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /email[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function extractRecipientAlias(text) {
  // Look for recipient email patterns
  const patterns = [
    /to[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /recipient[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /deposited[:\s]*to[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /received[:\s]*by[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /transfers sent to ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    /sent to ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function extractRequestRef(text) {
  // Look for request reference patterns
  const patterns = [
    /request[:\s]*#?([A-Z0-9-]+)/i,
    /transaction[:\s]*#?([A-Z0-9-]+)/i,
    /transfer[:\s]*#?([A-Z0-9-]+)/i,
    /reference[:\s]*([A-Z0-9-]+)/i,
    /ref[:\s]*([A-Z0-9-]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function sign(body, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(body));
  return hmac.digest('base64');
}

async function processEvent(ev) {
  console.log('🔄 Processing payment event:', {
    status: ev.status,
    amount_cents: ev.amount_cents,
    orderReference: ev.orderReference,
    email_uid: ev.email_uid
  });
  
  // Extract additional information from email text
  const payerHandle = extractPayerHandle(ev.text || '');
  const recipientAlias = extractRecipientAlias(ev.text || '');
  const requestRef = ev.orderReference || extractRequestRef(ev.text || '');

  // Debug extracted information
  console.log('🔍 Extracted information:', {
    payerHandle,
    recipientAlias,
    requestRef,
    orderReference: ev.orderReference
  });

  // Always create a payment_event record for debugging
  try {
    let result;
    if (db.run && typeof db.run === 'function') {
      // SQLite database
      result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO payment_events (source, parsed_amount_cents, payer_handle, recipient_alias, request_ref, status, raw_email, received_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          ['imap', ev.amount_cents || 0, payerHandle, recipientAlias, requestRef, ev.status || 'unknown', ev.text || '', new Date().toISOString()],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    } else {
      // PostgreSQL database
      result = await db.query(
        'INSERT INTO payment_events (source, parsed_amount_cents, payer_handle, recipient_alias, request_ref, status, raw_email, received_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        ['imap', ev.amount_cents || 0, payerHandle, recipientAlias, requestRef, ev.status || 'unknown', ev.text || '', new Date().toISOString()]
      );
    }
    console.log('✅ Payment event recorded in database');
  } catch (error) {
    console.error('❌ Error recording payment event:', error);
  }

  if (!ev.amount_cents) {
    console.log('⚠️ No amount detected, skipping matching');
    return;
  }

  console.log('🔍 Looking for matching orders...');
  
  // First try exact match by amount and order reference
  let order = await new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM orders WHERE total = ? AND status = ? ORDER BY date DESC LIMIT 1',
      [ev.amount_cents, 'pending'],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  let matchConfidence = 0;
  let matchReason = '';

  if (order) {
    matchConfidence = 100;
    matchReason = 'Exact amount match';
    console.log('✅ Found exact amount match:', order.id, 'Confidence: 100%');
  } else {
    // Try fuzzy matching with confidence scoring
    console.log('🔍 No exact match found, trying fuzzy matching...');
    
    // Get all orders (not just pending) to see what's available
    let allOrders;
    if (db.all && typeof db.all === 'function') {
      // SQLite database
      allOrders = await new Promise((resolve, reject) => {
        db.all(
          'SELECT * FROM orders ORDER BY date DESC LIMIT 10',
          [],
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
    } else {
      // PostgreSQL database
      const result = await db.query(
        'SELECT * FROM orders ORDER BY date DESC LIMIT 10'
      );
      allOrders = result.rows || [];
    }

    let bestMatch = null;
    let bestScore = 0;

    for (const candidateOrder of allOrders) {
      let score = 0;
      let reasons = [];

      console.log(`🔍 Checking Order ${candidateOrder.id}: Total=${candidateOrder.total}, Status=${candidateOrder.status}, WooID=${candidateOrder.woo_order_id}`);

      // Amount matching (70% weight)
      // Order total is stored as cents, payment is in cents, so compare directly
      const orderAmountCents = parseFloat(candidateOrder.total);
      const paymentAmountCents = ev.amount_cents;
      const amountDiff = Math.abs(orderAmountCents - paymentAmountCents);
      
      console.log(`💰 Amount comparison: Order=${orderAmountCents} cents, Payment=${paymentAmountCents} cents, Diff=${amountDiff}`);
      
      if (amountDiff === 0) {
        score += 70;
        reasons.push('Exact amount match');
      } else if (amountDiff <= 1) {
        score += 50;
        reasons.push('Close amount match');
      } else if (amountDiff <= 5) {
        score += 30;
        reasons.push('Partial amount match');
      }

      // Order reference matching (30% weight)
      if (ev.orderReference && candidateOrder.woo_order_id) {
        if (ev.orderReference === candidateOrder.woo_order_id.toString()) {
          score += 30;
          reasons.push('Exact reference match');
        } else if (candidateOrder.woo_order_id.toString().includes(ev.orderReference)) {
          score += 20;
          reasons.push('Partial reference match');
        }
      }

      // Time proximity (bonus)
      const orderDate = new Date(candidateOrder.date);
      const now = new Date();
      const hoursDiff = (now - orderDate) / (1000 * 60 * 60);
      if (hoursDiff <= 24) {
        score += 10;
        reasons.push('Recent order');
      }

      console.log(`📊 Order ${candidateOrder.id}: Score ${score}% - ${reasons.join(', ')}`);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = candidateOrder;
        matchConfidence = score;
        matchReason = reasons.join(', ');
      }
    }

    if (bestMatch && bestScore >= 50) {
      order = bestMatch;
      console.log(`✅ Found fuzzy match: Order ${order.id} (${bestScore}% confidence)`);
    }
  }

  if (!order) {
    console.log('⚠️ No matching order found for amount:', ev.amount_cents);
    return;
  }

  console.log('✅ Found matching order:', order.id, 'Confidence:', matchConfidence + '%');

  // Update order status based on payment status
  let newStatus = 'pending';
  if (ev.status === 'approved') {
    newStatus = 'completed';
  } else if (ev.status === 'deposited') {
    newStatus = 'completed';
  }

  // Update the order status
  if (db.run && typeof db.run === 'function') {
    // SQLite database
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE orders SET status = ? WHERE id = ?',
        [newStatus, order.id],
        function(err) {
          if (err) reject(err);
          else resolve(this);
        }
      );
    });
  } else {
    // PostgreSQL database
    await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2',
      [newStatus, order.id]
    );
  }

  console.log(`✅ Order ${order.id} updated to status: ${newStatus}`);

  // Update WooCommerce order status via REST API
  await updateWooCommerceOrder(order.woo_order_id, newStatus, matchConfidence);
}

module.exports = {
  sign,
  processEvent,
  updateWooCommerceOrder,
  mapToWooCommerceStatus,
  sendFallbackWebhook
};