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
    },
    logger: false
  });

  await client.connect();
  await client.mailboxOpen('INBOX');

  // Process existing unread emails immediately
  console.log('🔍 Processing existing unread emails...');
  try {
    for await (let message of client.fetch('*', {
      source: true,
      envelope: true,
      uid: true,
      flags: true
    })) {
      console.log('📧 Found message UID:', message.uid, 'Flags:', Array.from(message.flags));
      if (message.flags.has('\\Seen')) {
        console.log('⏭️ Skipping already seen email:', message.uid);
        continue;
      }

      // Check if this is an Interac notification email
      const envelope = message.envelope;
      const fromEmail = envelope?.from?.[0]?.address;
      console.log('📧 Email from:', fromEmail);
      
      // Check for Interac notification emails
      const interacPatterns = [
        'notify@payments.interac.ca',
        'noreply@interac.ca',
        'notifications@interac.ca',
        'interac.ca'
      ];
      
      const isInteracEmail = interacPatterns.some(pattern => 
        fromEmail && fromEmail.toLowerCase().includes(pattern.toLowerCase())
      );
      
      if (!fromEmail || !isInteracEmail) {
        console.log('⏭️ Skipping non-Interac email from:', fromEmail);
        continue;
      }

      console.log('✅ Found Interac email from:', fromEmail);
      console.log('📧 Processing Interac notification email:', message.uid);
      
      try {
        const parsed = await simpleParser(message.source);
        const combinedText = (parsed.text || '') + ' ' + (parsed.html || '');
        
        console.log('📝 Email content preview:', combinedText.substring(0, 200) + '...');

        // Enhanced status detection for Canadian Interac emails
        let status = 'requested';
        if (/deposited|accepted|approved|completed|received/i.test(combinedText)) {
          status = 'approved';
        } else if (/cancelled|declined|rejected|failed/i.test(combinedText)) {
          status = 'cancelled';
        }

        // Enhanced amount regex for Canadian Interac formats
        const amountPatterns = [
          /\$([0-9]+(?:\.[0-9]{2})?)/,  // $19.99
          /amount[:\s]*\$([0-9]+(?:\.[0-9]{2})?)/i,  // Amount: $19.99
          /total[:\s]*\$([0-9]+(?:\.[0-9]{2})?)/i,   // Total: $19.99
          /([0-9]+(?:\.[0-9]{2})?)\s*CAD/i,          // 19.99 CAD
          /([0-9]+(?:\.[0-9]{2})?)\s*dollars/i       // 19.99 dollars
        ];

        let amount_cents = 0;
        for (const pattern of amountPatterns) {
          const match = combinedText.match(pattern);
          if (match) {
            amount_cents = Math.round(parseFloat(match[1]) * 100);
            console.log('💰 Amount detected:', amount_cents, 'cents');
            break;
          }
        }

        // Extract order reference
        const orderRefPatterns = [
          /order[:\s]*#?(\d+)/i,
          /reference[:\s]*([A-Z0-9-]+)/i,
          /ref[:\s]*([A-Z0-9-]+)/i,
          /#(\d+)/,
          /ORD-(\d+)/
        ];

        let orderReference = null;
        for (const pattern of orderRefPatterns) {
          const match = combinedText.match(pattern);
          if (match) {
            orderReference = match[1];
            console.log('📋 Order reference detected:', orderReference);
            break;
          }
        }

        console.log('🔔 Processing email event:', {
          status,
          amount_cents,
          orderReference,
          email_uid: message.uid
        });

        await onEvent({
          status,
          amount_cents,
          text: combinedText,
          orderReference,
          email_uid: message.uid
        });

        await client.messageFlagsAdd(message.uid, ['\\Seen']);

      } catch (error) {
        console.error('❌ Error processing email:', error);
        console.error('Email UID:', message.uid);
        console.error('Error details:', error.message);
      }
    }
  } catch (error) {
    console.error('❌ Error processing existing emails:', error);
  }

  // Add error handling for connection issues
  client.on('error', (err) => {
    console.error('❌ IMAP connection error:', err.message);
    if (err.code === 'ETIMEOUT') {
      console.log('🔄 Connection timeout - this is normal for long-running connections');
    }
  });

  client.on('exists', async () => {
    console.log('🔔 EXISTS event fired - checking for unread emails...');
    
    for await (let message of client.fetch('*', {
      source: true,
      envelope: true,
      uid: true,
      flags: true
    })) {
      const envelope = message.envelope;
      const fromEmail = envelope?.from?.[0]?.address;
      const isSeen = message.flags.has('\\Seen');
      
      console.log('📧 Found message UID:', message.uid, 'From:', fromEmail, 'Seen:', isSeen);
      
      // Accept emails from both interac.ca and payments.interac.ca
      if (!fromEmail || (!fromEmail.includes('interac.ca') && !fromEmail.includes('payments.interac.ca'))) {
        console.log('⏭️ Skipping non-Interac email from:', fromEmail);
        continue;
      }
      
      // Temporarily process ALL emails to catch the 3 unread ones from 5 days ago
      // if (message.flags.has('\\Seen')) {
      //   console.log('⏭️ Skipping already seen email:', message.uid);
      //   continue;
      // }

      console.log('✅ Processing Interac email from:', fromEmail);

      try {
        console.log('📧 Processing email:', message.uid);
        
        const parsed = await simpleParser(message.source);
        const combinedText = (parsed.text || '') + ' ' + (parsed.html || '');
        
        console.log('📝 Email content preview:', combinedText.substring(0, 200) + '...');

        // Enhanced status detection for Canadian Interac emails
        let status = 'requested';
        if (/deposited|accepted|approved|completed|received/i.test(combinedText)) {
          status = 'approved';
        } else if (/cancelled|declined|rejected|failed/i.test(combinedText)) {
          status = 'cancelled';
        }

        // Enhanced amount regex for Canadian Interac formats
        const amountPatterns = [
          /\$([0-9]+(?:\.[0-9]{2})?)/,  // $19.99
          /amount[:\s]*\$([0-9]+(?:\.[0-9]{2})?)/i,  // Amount: $19.99
          /total[:\s]*\$([0-9]+(?:\.[0-9]{2})?)/i,   // Total: $19.99
          /([0-9]+(?:\.[0-9]{2})?)\s*CAD/i,          // 19.99 CAD
          /([0-9]+(?:\.[0-9]{2})?)\s*dollars/i       // 19.99 dollars
        ];

        let amount_cents = 0;
        for (const pattern of amountPatterns) {
          const match = combinedText.match(pattern);
          if (match) {
            amount_cents = Math.round(parseFloat(match[1]) * 100);
            console.log('💰 Amount detected:', amount_cents, 'cents');
            break;
          }
        }

        // Extract order reference
        const orderRefPatterns = [
          /order[:\s]*#?(\d+)/i,
          /reference[:\s]*([A-Z0-9-]+)/i,
          /ref[:\s]*([A-Z0-9-]+)/i,
          /#(\d+)/,
          /ORD-(\d+)/
        ];

        let orderReference = null;
        for (const pattern of orderRefPatterns) {
          const match = combinedText.match(pattern);
          if (match) {
            orderReference = match[1];
            console.log('📋 Order reference detected:', orderReference);
            break;
          }
        }

        console.log('🔔 Processing email event:', {
          status,
          amount_cents,
          orderReference,
          email_uid: message.uid
        });

        await onEvent({
          status,
          amount_cents,
          text: combinedText,
          orderReference,
          email_uid: message.uid
        });

      } catch (error) {
        console.error('❌ Error processing email:', error);
        console.error('Email UID:', message.uid);
        console.error('Error details:', error.message);
      }

      await client.messageFlagsAdd(message.uid, ['\\Seen']);
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down IMAP connection...');
    try {
      await client.logout();
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });

  return client;
}

module.exports = { startImap };