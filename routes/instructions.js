const express = require('express');
const router = express.Router();
const { Queue } = require('bullmq');
const { db } = require('../database');
const { assess } = require('../services/risk');

// Initialize BullMQ queue for request-money jobs
const requestMoneyQueue = new Queue('request-money', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  }
});

// Helper function to pick an email alias based on amount
function pickAlias(amountCents) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT ea.id as alias_id, ea.alias_email as email, ea.bank_slug
      FROM email_aliases ea
      WHERE ea.active = 1
        AND ea.daily_total_cents + ? <= ea.daily_cap_cents
      ORDER BY ea.weight DESC, ea.last_used_at ASC
      LIMIT 1
    `;

    db.get(sql, [amountCents], (err, row) => {
      if (err) {
        reject(err);
      } else if (!row) {
        reject(new Error('No available email alias found'));
      } else {
        // Update the alias usage
        const updateSql = `
          UPDATE email_aliases
          SET daily_total_cents = daily_total_cents + ?,
              last_used_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `;
        db.run(updateSql, [amountCents, row.alias_id], (updateErr) => {
          if (updateErr) {
            reject(updateErr);
          } else {
            resolve({
              email: row.email,
              bank_slug: row.bank_slug,
              alias_id: row.alias_id
            });
          }
        });
      }
    });
  });
}

// POST /api/instructions - Create new payment instruction
router.post('/api/instructions', async (req, res) => {
  try {
    const {
      order_id,
      amount_cents,
      currency = 'CAD',
      payer_handle,
      email,
      phone,
      ip_address,
      billing_address,
      shipping_address
    } = req.body;

    // Validate required fields
    if (!order_id || !amount_cents || !payer_handle) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: order_id, amount_cents, payer_handle'
      });
    }

    // Perform risk assessment
    const order = {
      order_id,
      payer_handle,
      amount_cents,
      email: email || payer_handle, // fallback to payer_handle if email not provided
      phone,
      ip_address,
      billing_address,
      shipping_address
    };

    const riskAssessment = await assess(order);

    // Block if risk assessment fails
    if (!riskAssessment.allow) {
      return res.status(400).json({
        success: false,
        message: 'Payment blocked due to risk assessment',
        reasons: riskAssessment.reasons,
        risk_score: riskAssessment.score
      });
    }

    // Generate unique IDs
    const id = `ins_${Date.now()}`;
    const instruction_code = `ORD-${order_id}-${Date.now()}`;

    // Pick an available email alias
    const aliasInfo = await pickAlias(amount_cents);

    // Insert into payment_instructions table
    const insertSql = `
      INSERT INTO payment_instructions
      (id, order_id, amount_cents, currency, payer_handle, recipient_alias,
       bank_slug, instruction_code, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting', CURRENT_TIMESTAMP)
    `;

    const params = [
      id, order_id, amount_cents, currency, payer_handle,
      aliasInfo.email, aliasInfo.bank_slug, instruction_code
    ];

    db.run(insertSql, params, async function(err) {
      if (err) {
        console.error('Error inserting payment instruction:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to create payment instruction'
        });
      }

      // Create the full instruction object for the queue
      const instructionObject = {
        id,
        order_id,
        amount_cents,
        currency,
        payer_handle,
        recipient_alias: aliasInfo.email,
        bank_slug: aliasInfo.bank_slug,
        instruction_code,
        alias_id: aliasInfo.alias_id,
        status: 'waiting',
        created_at: new Date().toISOString()
      };

      // Enqueue job to BullMQ request-money queue
      try {
        await requestMoneyQueue.add('request-money-job', instructionObject);

        res.json({
          success: true,
          instruction_id: id,
          status: 'waiting'
        });
      } catch (queueErr) {
        console.error('Error enqueuing job:', queueErr);
        res.status(500).json({
          success: false,
          message: 'Payment instruction created but failed to enqueue processing job'
        });
      }
    });

  } catch (error) {
    console.error('Error creating payment instruction:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /status/:id - Get payment instruction status
router.get('/status/:id', (req, res) => {
  const { id } = req.params;

  const sql = 'SELECT status FROM payment_instructions WHERE id = ?';

  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Error fetching instruction status:', err);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch instruction status'
      });
    }

    if (!row) {
      return res.status(404).json({
        success: false,
        message: 'Payment instruction not found'
      });
    }

    res.json({
      success: true,
      status: row.status
    });
  });
});

// POST /api/instructions/:id/resend - Resend payment instruction
router.post('/api/instructions/:id/resend', async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the instruction and check resend count
    const fetchSql = `
      SELECT *, COALESCE(resend_count, 0) as resend_count
      FROM payment_instructions
      WHERE id = ?
    `;

    db.get(fetchSql, [id], async (err, instruction) => {
      if (err) {
        console.error('Error fetching instruction for resend:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch payment instruction'
        });
      }

      if (!instruction) {
        return res.status(404).json({
          success: false,
          message: 'Payment instruction not found'
        });
      }

      // Check if max resends exceeded
      if (instruction.resend_count >= 2) {
        return res.status(400).json({
          success: false,
          message: 'Maximum resend attempts (2) exceeded'
        });
      }

      // Update resend count
      const updateSql = `
        UPDATE payment_instructions
        SET resend_count = COALESCE(resend_count, 0) + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(updateSql, [id], async (updateErr) => {
        if (updateErr) {
          console.error('Error updating resend count:', updateErr);
          return res.status(500).json({
            success: false,
            message: 'Failed to update resend count'
          });
        }

        // Re-enqueue to BullMQ
        try {
          const instructionObject = {
            id: instruction.id,
            order_id: instruction.order_id,
            amount_cents: instruction.amount_cents,
            currency: instruction.currency,
            payer_handle: instruction.payer_handle,
            recipient_alias: instruction.recipient_alias,
            bank_slug: instruction.bank_slug,
            instruction_code: instruction.instruction_code,
            status: instruction.status,
            resend_count: instruction.resend_count + 1
          };

          await requestMoneyQueue.add('request-money-job', instructionObject);

          res.json({
            success: true,
            message: 'Payment instruction re-enqueued successfully',
            resend_count: instruction.resend_count + 1
          });
        } catch (queueErr) {
          console.error('Error re-enqueuing job:', queueErr);
          res.status(500).json({
            success: false,
            message: 'Failed to re-enqueue payment instruction'
          });
        }
      });
    });

  } catch (error) {
    console.error('Error resending payment instruction:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/instructions/:id/update-handle - Update payer handle and re-enqueue
router.post('/api/instructions/:id/update-handle', async (req, res) => {
  try {
    const { id } = req.params;
    const { payer_handle } = req.body;

    if (!payer_handle) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: payer_handle'
      });
    }

    // Fetch the current instruction
    const fetchSql = 'SELECT * FROM payment_instructions WHERE id = ?';

    db.get(fetchSql, [id], async (err, instruction) => {
      if (err) {
        console.error('Error fetching instruction for handle update:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch payment instruction'
        });
      }

      if (!instruction) {
        return res.status(404).json({
          success: false,
          message: 'Payment instruction not found'
        });
      }

      // Update payer handle
      const updateSql = `
        UPDATE payment_instructions
        SET payer_handle = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      db.run(updateSql, [payer_handle, id], async (updateErr) => {
        if (updateErr) {
          console.error('Error updating payer handle:', updateErr);
          return res.status(500).json({
            success: false,
            message: 'Failed to update payer handle'
          });
        }

        // Re-enqueue with updated handle
        try {
          const instructionObject = {
            id: instruction.id,
            order_id: instruction.order_id,
            amount_cents: instruction.amount_cents,
            currency: instruction.currency,
            payer_handle: payer_handle, // Use updated handle
            recipient_alias: instruction.recipient_alias,
            bank_slug: instruction.bank_slug,
            instruction_code: instruction.instruction_code,
            status: instruction.status,
            resend_count: instruction.resend_count || 0
          };

          await requestMoneyQueue.add('request-money-job', instructionObject);

          res.json({
            success: true,
            message: 'Payer handle updated and instruction re-enqueued successfully'
          });
        } catch (queueErr) {
          console.error('Error re-enqueuing job after handle update:', queueErr);
          res.status(500).json({
            success: false,
            message: 'Handle updated but failed to re-enqueue job'
          });
        }
      });
    });

  } catch (error) {
    console.error('Error updating payer handle:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /ops/health - Health check endpoint with queue and system status
router.get('/ops/health', async (req, res) => {
  try {
    // Get queue depth
    const queueDepth = await requestMoneyQueue.getWaiting();

    // Get IMAP heartbeat timestamp (placeholder - would need actual IMAP service)
    const imapHeartbeat = new Date().toISOString(); // Replace with actual heartbeat check

    // Count email aliases
    const countSql = 'SELECT COUNT(*) as count FROM email_aliases WHERE active = 1';

    db.get(countSql, [], (err, result) => {
      if (err) {
        console.error('Error getting email aliases count:', err);
        return res.status(500).json({
          success: false,
          message: 'Failed to get system health status'
        });
      }

      res.json({
        success: true,
        health: {
          queueDepth: queueDepth.length,
          imapHeartbeat: imapHeartbeat,
          emailAliasesCount: result.count,
          timestamp: new Date().toISOString()
        }
      });
    });

  } catch (error) {
    console.error('Error getting health status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system health status'
    });
  }
});

module.exports = router;