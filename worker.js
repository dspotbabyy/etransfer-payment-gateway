require('dotenv').config();
const { Queue, Worker } = require('bullmq');
const { db } = require('./database');
const requestbot = require('./services/requestbot');

const redisConnection = {
  host: 'localhost',
  port: 6379
};

const requestMoneyQueue = new Queue('request-money', {
  connection: redisConnection
});

const worker = new Worker('request-money', async (job) => {
  try {
    const result = await requestbot.submitInstruction(job.data);

    if (db.run && typeof db.run === 'function') {
      // SQLite database
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE payment_instructions SET status = ?, request_ref = ? WHERE id = ?',
          ['requested', result.requestRef, job.data.id],
          function(err) {
            if (err) reject(err);
            else resolve(this);
          }
        );
      });
    } else {
      // PostgreSQL database
      await db.query(
        'UPDATE payment_instructions SET status = $1, request_ref = $2 WHERE id = $3',
        ['requested', result.requestRef, job.data.id]
      );
    }

    console.log(`Processed job ${job.id} for instruction ${job.data.id}`);
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    throw error;
  }
}, {
  connection: redisConnection
});

console.log('Worker running');

module.exports = { requestMoneyQueue, worker };