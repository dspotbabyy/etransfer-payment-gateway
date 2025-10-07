require('dotenv').config();
const { startImap } = require('./services/imap');
const { processEvent } = require('./services/matching');

async function main() {
  try {
    await startImap(processEvent);
    console.log('IMAP listening...');
  } catch (error) {
    console.error('Error starting IMAP:', error);
    process.exit(1);
  }
}

main();