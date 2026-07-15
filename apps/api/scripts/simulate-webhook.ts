import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables locally
function loadEnv() {
  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(process.cwd(), '../../.env'),
    path.resolve(process.cwd(), '../../.env.local'),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const index = trimmed.indexOf('=');
        if (index > 0) {
          const key = trimmed.substring(0, index).trim();
          let val = trimmed.substring(index + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.substring(1, val.length - 1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      });
    }
  }
}

async function run() {
  loadEnv();

  const API_URL = process.env.API_URL || 'http://localhost:3001';
  const META_APP_SECRET = process.env.META_APP_SECRET;

  console.log('--- Instagram Webhook Simulator ---');
  console.log(`Target Backend URL: ${API_URL}`);
  console.log(`META_APP_SECRET configured: ${META_APP_SECRET ? 'Yes (keys masked)' : 'No'}`);

  if (!META_APP_SECRET) {
    console.error('ERROR: META_APP_SECRET is not defined in any environment file.');
    console.error('Please configure it in .env or run with environment variable: META_APP_SECRET=your_secret npx ts-node scripts/simulate-webhook.ts');
    process.exit(1);
  }

  // Get action from arguments
  const args = process.argv.slice(2);
  const mode = args[0] || 'dm'; // 'dm' or 'comment'
  const customMessage = args.slice(1).join(' ') || 'hello';

  let payload: any;
  const mockRecipientId = '17841400000000000'; // Instagram Business Account ID
  const mockSenderId = '908234729384729'; // Customer's Instagram Account ID

  if (mode === 'comment') {
    console.log(`\nSimulating Instagram Reel/Media Comment Event with text: "${customMessage}"`);
    payload = {
      object: 'instagram',
      entry: [
        {
          id: mockRecipientId,
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: 'comments',
              value: {
                id: `comment_id_${Date.now()}`,
                text: customMessage,
                from: {
                  id: mockSenderId,
                  username: 'tester_user',
                },
                media: {
                  id: 'media_id_99999',
                  media_product_type: 'REELS',
                  caption: 'Awesome reel post #collaboration',
                },
              },
            },
          ],
        },
      ],
    };
  } else {
    console.log(`\nSimulating Instagram Direct Message (DM) Event with text: "${customMessage}"`);
    payload = {
      object: 'instagram',
      entry: [
        {
          id: mockRecipientId,
          time: Date.now(),
          messaging: [
            {
              sender: {
                id: mockSenderId,
              },
              recipient: {
                id: mockRecipientId,
              },
              timestamp: Date.now(),
              message: {
                mid: `mid.gABFAAAA_${Date.now()}`,
                text: customMessage,
              },
            },
          ],
        },
      ],
    };
  }

  const rawBody = JSON.stringify(payload);

  // Compute signature
  const hmac = crypto.createHmac('sha256', META_APP_SECRET);
  hmac.update(rawBody);
  const signature = `sha256=${hmac.digest('hex')}`;

  const webhookUrl = `${API_URL.replace(/\/$/, '')}/webhook`;
  console.log(`Sending POST request to ${webhookUrl}...`);
  console.log(`Signature (X-Hub-Signature-256): ${signature}`);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': signature,
      },
      body: rawBody,
    });

    const text = await response.text();
    console.log(`\nResponse Code: ${response.status}`);
    console.log(`Response Body: ${text}`);

    if (response.ok) {
      console.log('\nSuccess! The webhook was validated and processed by the server.');
    } else {
      console.error('\nFailure: The webhook returned an error status.');
    }
  } catch (error) {
    console.error('\nNetwork Error:', (error as Error).message);
  }
}

run().catch((e) => {
  console.error('Unhandled script error:', e);
});
