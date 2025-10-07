const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');

async function startImap(onEvent) {
  const client = new ImapFlow({
    host: process.env.IMAP_HOST,
    port: process.env.IMAP_PORT,
    secure: process.env.IMAP_SECURE === 'true',
    auth: {
      user: process.env.IMAP_USER,
      pass: process.env.IMAP_PASS
    }
  });

  await client.connect();
  await client.mailboxOpen('INBOX');

  client.on('exists', async () => {
    for await (let message of client.fetch('*', {
      source: true,
      envelope: true,
      uid: true,
      flags: true
    })) {
      if (message.flags.has('\\Seen')) {
        continue;
      }

      const parsed = await simpleParser(message.source);
      const combinedText = (parsed.text || '') + ' ' + (parsed.html || '');

      let status = 'requested';
      if (/deposited|accepted|approved/i.test(combinedText)) {
        status = 'approved';
      } else if (/cancelled|declined/i.test(combinedText)) {
        status = 'cancelled';
      }

      const dollarMatch = combinedText.match(/\$([0-9]+(?:\.[0-9]{2})?)/);
      const amount_cents = dollarMatch ? Math.round(parseFloat(dollarMatch[1]) * 100) : 0;

      await onEvent({
        status,
        amount_cents,
        text: combinedText
      });

      await client.messageFlagsAdd(message.uid, ['\\Seen']);
    }
  });

  return client;
}

module.exports = { startImap };