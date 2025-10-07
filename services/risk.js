const { db } = require('../database');

// Risk assessment configuration
const RISK_CONFIG = {
  VELOCITY_LIMIT_24H: parseInt(process.env.VELOCITY_LIMIT_24H) || 5,
  MANUAL_REVIEW_THRESHOLD_CENTS: parseInt(process.env.MANUAL_REVIEW_THRESHOLD_CENTS) || 500000, // $5000
  MAX_RISK_SCORE: 100
};

/**
 * Assess risk for an order/payment instruction
 * @param {Object} order - Order object containing order details
 * @param {string} order.payer_handle - Email or handle of the payer
 * @param {number} order.amount_cents - Amount in cents
 * @param {string} order.email - Customer email
 * @param {string} order.phone - Customer phone (optional)
 * @param {string} order.ip_address - Customer IP address (optional)
 * @param {Object} order.billing_address - Billing address (optional)
 * @param {Object} order.shipping_address - Shipping address (optional)
 * @returns {Promise<Object>} Risk assessment result with allow, score, and reasons
 */
async function assess(order) {
  const assessment = {
    allow: true,
    score: 0,
    reasons: []
  };

  try {
    // 1. Velocity check - count instructions per payer_handle in last 24 hours
    await checkVelocity(order, assessment);

    // 2. Blacklist check - check if email, phone, or IP is blacklisted
    await checkBlacklist(order, assessment);

    // 3. Amount threshold check - flag large amounts for manual review
    checkAmountThreshold(order, assessment);

    // 4. Address mismatch check - flag if billing differs from shipping
    checkAddressMismatch(order, assessment);

    // Final decision: block if score is too high or any blocking reason exists
    if (assessment.score >= RISK_CONFIG.MAX_RISK_SCORE) {
      assessment.allow = false;
      assessment.reasons.push('Risk score exceeded maximum threshold');
    }

  } catch (error) {
    console.error('Error during risk assessment:', error);
    // On error, default to blocking for safety
    assessment.allow = false;
    assessment.score = RISK_CONFIG.MAX_RISK_SCORE;
    assessment.reasons.push('Risk assessment system error');
  }

  return assessment;
}

/**
 * Check velocity limits - count instructions from same payer_handle in last 24h
 */
function checkVelocity(order, assessment) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT COUNT(*) as count
      FROM payment_instructions
      WHERE payer_handle = ?
        AND created_at >= datetime('now', '-24 hours')
    `;

    db.get(sql, [order.payer_handle], (err, row) => {
      if (err) {
        return reject(err);
      }

      const count = row.count || 0;

      if (count >= RISK_CONFIG.VELOCITY_LIMIT_24H) {
        assessment.allow = false;
        assessment.score += 50;
        assessment.reasons.push(`Velocity limit exceeded: ${count} instructions in 24h (limit: ${RISK_CONFIG.VELOCITY_LIMIT_24H})`);
      } else if (count >= Math.floor(RISK_CONFIG.VELOCITY_LIMIT_24H * 0.8)) {
        // Warning threshold at 80% of limit
        assessment.score += 20;
        assessment.reasons.push(`High velocity: ${count} instructions in 24h`);
      }

      resolve();
    });
  });
}

/**
 * Check if email, phone, or IP is in blacklist
 */
function checkBlacklist(order, assessment) {
  return new Promise((resolve, reject) => {
    const conditions = [];
    const params = [];

    if (order.email) {
      conditions.push('email = ?');
      params.push(order.email);
    }

    if (order.phone) {
      conditions.push('phone = ?');
      params.push(order.phone);
    }

    if (order.ip_address) {
      conditions.push('ip = ?');
      params.push(order.ip_address);
    }

    if (conditions.length === 0) {
      return resolve();
    }

    const sql = `
      SELECT email, phone, ip, reason
      FROM blacklist
      WHERE ${conditions.join(' OR ')}
      LIMIT 1
    `;

    db.get(sql, params, (err, row) => {
      if (err) {
        return reject(err);
      }

      if (row) {
        assessment.allow = false;
        assessment.score = RISK_CONFIG.MAX_RISK_SCORE;

        const matchedField = row.email === order.email ? 'email' :
                           row.phone === order.phone ? 'phone' : 'IP address';

        assessment.reasons.push(`Blacklisted ${matchedField}: ${row.reason || 'No reason provided'}`);
      }

      resolve();
    });
  });
}

/**
 * Check if amount exceeds manual review threshold
 */
function checkAmountThreshold(order, assessment) {
  if (order.amount_cents >= RISK_CONFIG.MANUAL_REVIEW_THRESHOLD_CENTS) {
    assessment.score += 30;
    assessment.reasons.push(`Large amount requires manual review: $${(order.amount_cents / 100).toFixed(2)}`);
  }
}

/**
 * Check if billing address differs from shipping address
 */
function checkAddressMismatch(order, assessment) {
  if (!order.billing_address || !order.shipping_address) {
    return; // Skip check if addresses not provided
  }

  const billing = order.billing_address;
  const shipping = order.shipping_address;

  // Compare key address fields
  const fieldsMatch =
    billing.address1 === shipping.address1 &&
    billing.city === shipping.city &&
    billing.postal_code === shipping.postal_code &&
    billing.country === shipping.country;

  if (!fieldsMatch) {
    assessment.score += 15;
    assessment.reasons.push('Billing address differs from shipping address');
  }
}

module.exports = {
  assess,
  RISK_CONFIG
};