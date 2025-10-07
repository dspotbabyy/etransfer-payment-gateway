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

    await db.run(
      'UPDATE payment_instructions SET status = ?, request_ref = ? WHERE id = ?',
      ['requested', result.requestRef, job.data.id]
    );

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