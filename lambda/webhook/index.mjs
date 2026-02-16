import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createHmac } from 'node:crypto';
import { randomBytes } from 'node:crypto';

const s3 = new S3Client();
const ses = new SESClient();
const BUCKET = process.env.DATA_BUCKET;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@hillmanchan.com';

// ==================== Stripe Signature Verification ====================

function verifyStripeSignature(payload, sigHeader) {
  const elements = sigHeader.split(',');
  const timestamp = elements.find((e) => e.startsWith('t='))?.split('=')[1];
  const signature = elements.find((e) => e.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !signature) return false;

  // Reject if timestamp is more than 5 minutes old
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');

  return expected === signature;
}

// ==================== Access Code Generator ====================

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = 'SA-';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

// ==================== S3 Users Management ====================

async function getUsers() {
  const obj = await s3.send(
    new GetObjectCommand({ Bucket: BUCKET, Key: 'users.json' })
  );
  return JSON.parse(await obj.Body.transformToString());
}

async function saveUsers(users) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: 'users.json',
      Body: JSON.stringify(users, null, 2),
      ContentType: 'application/json',
    })
  );
}

// ==================== Email ====================

async function sendAccessEmail(email, code) {
  const params = {
    Source: SENDER_EMAIL,
    Destination: { ToAddresses: [email] },
    Message: {
      Subject: {
        Data: '你嘅系統架構圖解教室存取碼 | System Architecture Classroom Access',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f1117; color: #e0e0e0; padding: 40px 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #1a1d27; border-radius: 16px; padding: 40px; border: 1px solid #2a2d3a;">
    <h1 style="color: #ffffff; font-size: 1.5rem; margin-bottom: 8px;">多謝你嘅支持！</h1>
    <p style="color: #9ca3af; font-size: 0.95rem; line-height: 1.8;">
      感謝你 Buy Me a Coffee！以下係你嘅系統架構圖解教室 AI 助手存取碼。
    </p>

    <div style="background: #13151c; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center; border: 1px solid #2a2d3a;">
      <p style="color: #6b7280; font-size: 0.85rem; margin-bottom: 8px;">你嘅存取碼</p>
      <p style="color: #a5b4fc; font-size: 1.8rem; font-weight: 700; letter-spacing: 0.1em; margin: 0;">${code}</p>
    </div>

    <h3 style="color: #ffffff; font-size: 1rem; margin-bottom: 12px;">點樣用？</h3>
    <ol style="color: #c0c4cc; font-size: 0.9rem; line-height: 2; padding-left: 20px;">
      <li>去 <a href="https://system-design.hillmanchan.com" style="color: #a5b4fc; text-decoration: none;">system-design.hillmanchan.com</a></li>
      <li>撳右下角嘅紫色 chat 按鈕</li>
      <li>輸入你嘅 email 同上面嘅存取碼</li>
      <li>開始用 AI 搜尋同 Viber Prompt 功能！</li>
    </ol>

    <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #2a2d3a;">
      <p style="color: #6b7280; font-size: 0.8rem; margin: 0;">
        呢個存取碼係永久有效嘅。如有問題，請回覆呢封 email。<br>
        — Hillman Chan
      </p>
    </div>
  </div>
</body>
</html>`,
          Charset: 'UTF-8',
        },
        Text: {
          Data: `多謝你嘅支持！\n\n你嘅系統架構圖解教室 AI 助手存取碼：${code}\n\n點樣用：\n1. 去 system-design.hillmanchan.com\n2. 撳右下角嘅紫色 chat 按鈕\n3. 輸入你嘅 email 同上面嘅存取碼\n4. 開始用 AI 搜尋同 Viber Prompt 功能！\n\n呢個存取碼係永久有效嘅。\n\n— Hillman Chan`,
          Charset: 'UTF-8',
        },
      },
    },
  };

  await ses.send(new SendEmailCommand(params));
}

// ==================== Response Helpers ====================

const headers = {
  'Content-Type': 'application/json',
};

function respond(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

// ==================== Handler ====================

export async function handler(event) {
  try {
    const sigHeader = event.headers?.['stripe-signature'] || '';
    const rawBody = event.body || '';

    // Verify Stripe signature
    if (!verifyStripeSignature(rawBody, sigHeader)) {
      console.error('Invalid Stripe signature');
      return respond(400, { error: 'Invalid signature' });
    }

    const stripeEvent = JSON.parse(rawBody);

    // Only handle checkout.session.completed (payment links use Checkout)
    if (stripeEvent.type !== 'checkout.session.completed') {
      return respond(200, { received: true, skipped: true });
    }

    const session = stripeEvent.data.object;
    const email = session.customer_details?.email || session.customer_email;

    if (!email) {
      console.error('No email in checkout session:', session.id);
      return respond(200, { received: true, error: 'no_email' });
    }

    // Check if user already exists
    const users = await getUsers();
    const existing = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      // Resend existing code
      console.log(`User ${email} already exists, resending code`);
      await sendAccessEmail(email, existing.code);
      return respond(200, { received: true, action: 'resent' });
    }

    // Generate new access code
    const code = generateCode();
    users.push({
      email: email.toLowerCase(),
      code,
      createdAt: new Date().toISOString(),
      stripeSessionId: session.id,
      amount: session.amount_total,
      currency: session.currency,
    });

    // Save to S3 and send email
    await saveUsers(users);
    await sendAccessEmail(email, code);

    console.log(`New user: ${email}, code: ${code}, session: ${session.id}`);
    return respond(200, { received: true, action: 'created' });
  } catch (err) {
    console.error('Webhook error:', err);
    // Always return 200 to Stripe to prevent retries on our errors
    return respond(200, { received: true, error: 'internal' });
  }
}
