const crypto = require('crypto');
const axios = require('axios');
const { db } = require('../database');

function sign(body, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(body));
  return hmac.digest('base64');
}

async function processEvent(ev) {
  if (!ev.amount_cents) {
    return;
  }

  const instruction = await db.get(
    'SELECT * FROM payment_instructions WHERE amount_cents = ? AND status IN (?, ?) ORDER BY created_at DESC LIMIT 1',
    [ev.amount_cents, 'waiting', 'requested']
  );

  if (!instruction) {
    return;
  }

  const instructionData = instruction;
  let newStatus = 'requested';

  if (ev.status === 'approved') {
    newStatus = 'approved';
  } else if (ev.status === 'deposited') {
    newStatus = 'deposited';
  }

  await db.run(
    'UPDATE payment_instructions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [newStatus, instructionData.id]
  );

  if (process.env.WEBHOOK_URL && process.env.WEBHOOK_SECRET) {
    const payload = {
      instruction_code: instructionData.instruction_code,
      status: newStatus,
      order_id: instructionData.order_id
    };

    const signature = sign(payload, process.env.WEBHOOK_SECRET);

    try {
      await axios.post(process.env.WEBHOOK_URL, payload, {
        headers: {
          'X-Dexx-Signature': signature
        }
      });
    } catch (error) {
      console.error('Webhook error:', error.message);
    }
  }
}

module.exports = {
  sign,
  processEvent
};