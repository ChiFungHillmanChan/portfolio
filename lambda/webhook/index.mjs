import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const s3 = new S3Client();
const ses = new SESClient();
const BUCKET = process.env.DATA_BUCKET;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'noreply@hillmanchan.com';
const STRIPE_STANDARD_PRICE_ID = (process.env.STRIPE_STANDARD_PRICE_ID || '').trim();
const STRIPE_PRO_PRICE_ID = (process.env.STRIPE_PRO_PRICE_ID || '').trim();
const STRIPE_STANDARD_PRODUCT_ID = (process.env.STRIPE_STANDARD_PRODUCT_ID || '').trim();
const STRIPE_PRO_PRODUCT_ID = (process.env.STRIPE_PRO_PRODUCT_ID || '').trim();

// ==================== Firebase Admin ====================

if (!getApps().length) {
  const sa = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
  );
  initializeApp({ credential: cert(sa) });
}
const firebaseAuth = getAuth();
const db = getFirestore();

// ==================== Stripe Signature Verification ====================

function verifyStripeSignature(payload, sigHeader) {
  if (!STRIPE_WEBHOOK_SECRET || !sigHeader) return false;
  const elements = sigHeader.split(',');
  const timestamp = elements.find((e) => e.startsWith('t='))?.split('=')[1];
  const signature = elements.find((e) => e.startsWith('v1='))?.split('=')[1];

  if (!timestamp || !signature) return false;

  // Reject if timestamp is more than 5 minutes old
  const parsedTimestamp = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(parsedTimestamp)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsedTimestamp) > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac('sha256', STRIPE_WEBHOOK_SECRET)
    .update(signedPayload)
    .digest('hex');
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');
    if (expectedBuf.length !== signatureBuf.length) return false;
    return timingSafeEqual(expectedBuf, signatureBuf);
  } catch {
    return false;
  }
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeTier(tier, fallback = 'standard') {
  if (tier === 'pro') return 'pro';
  if (tier === 'standard') return 'standard';
  return fallback;
}

function getTierFromStripeIds(priceId, productId) {
  const priceMap = new Map([
    [STRIPE_STANDARD_PRICE_ID, 'standard'],
    [STRIPE_PRO_PRICE_ID, 'pro'],
  ].filter(([k]) => k));

  const productMap = new Map([
    [STRIPE_STANDARD_PRODUCT_ID, 'standard'],
    [STRIPE_PRO_PRODUCT_ID, 'pro'],
  ].filter(([k]) => k));

  if (priceId && priceMap.has(priceId)) return priceMap.get(priceId);
  if (productId && productMap.has(productId)) return productMap.get(productId);
  return null;
}

function extractStripeIdentifiers(session) {
  const metadata = session?.metadata || {};
  const lineItem = session?.line_items?.data?.[0];
  const linePrice = lineItem?.price?.id || null;
  const lineProduct = lineItem?.price?.product || null;

  const priceId = (
    metadata.price_id ||
    metadata.priceId ||
    metadata.stripe_price_id ||
    metadata.stripePriceId ||
    linePrice ||
    null
  );
  const productId = (
    metadata.product_id ||
    metadata.productId ||
    metadata.stripe_product_id ||
    metadata.stripeProductId ||
    lineProduct ||
    null
  );
  const tierHint = metadata.tier || metadata.plan || null;

  return {
    priceId: priceId ? String(priceId).trim() : null,
    productId: productId ? String(productId).trim() : null,
    tierHint: tierHint ? String(tierHint).trim().toLowerCase() : null,
  };
}

function resolveTier(session) {
  const { priceId, productId, tierHint } = extractStripeIdentifiers(session);
  const mapped = getTierFromStripeIds(priceId, productId);
  if (mapped) {
    return { tier: mapped, priceId, productId, source: 'stripe_id_map' };
  }
  if (tierHint === 'standard' || tierHint === 'pro') {
    return { tier: tierHint, priceId, productId, source: 'metadata_tier' };
  }
  return { tier: null, priceId, productId, source: null };
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
  try {
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: 'users.json' })
    );
    return JSON.parse(await obj.Body.transformToString());
  } catch (err) {
    if (err?.name === 'NoSuchKey') return [];
    throw err;
  }
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

async function upsertEntitlement({
  entitlementId,
  emailNormalized,
  tier,
  stripeEventId,
  stripeSessionId,
  stripeCustomerId,
  stripePriceId,
  stripeProductId,
}) {
  const now = new Date().toISOString();
  await db.doc(`entitlements/${entitlementId}`).set(
    {
      source: 'stripe',
      status: 'active',
      tier,
      emailNormalized,
      stripeEventId,
      stripeSessionId,
      stripeCustomerId: stripeCustomerId || null,
      stripePriceId: stripePriceId || null,
      stripeProductId: stripeProductId || null,
      updatedAt: now,
      createdAt: now,
    },
    { merge: true }
  );
}

async function activateUserEntitlement({ uid, email, tier, entitlementId, stripeSessionId }) {
  const now = new Date().toISOString();
  await db.doc(`users/${uid}`).set(
    {
      premium: true,
      tier: normalizeTier(tier),
      entitlementSource: 'stripe',
      entitlementStatus: 'active',
      entitlementId,
      customerEmailNormalized: email,
      premiumActivatedAt: now,
      premiumUpdatedAt: now,
      activatedAt: now, // legacy compatibility
      email, // legacy compatibility
      latestStripeSessionId: stripeSessionId,
    },
    { merge: true }
  );
}

async function linkEntitlementToFirebaseUser({ emailNormalized, tier, entitlementId, stripeSessionId }) {
  try {
    const user = await firebaseAuth.getUserByEmail(emailNormalized);
    await activateUserEntitlement({
      uid: user.uid,
      email: emailNormalized,
      tier,
      entitlementId,
      stripeSessionId,
    });
    await db.doc(`entitlements/${entitlementId}`).set(
      {
        userUid: user.uid,
        linkedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return user.uid;
  } catch (err) {
    if (err?.code === 'auth/user-not-found') return null;
    throw err;
  }
}

async function getProcessedStripeEvent(eventId) {
  const ref = db.doc(`stripeEvents/${eventId}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  return snap.data() || null;
}

async function markStripeEvent(eventId, payload, options = {}) {
  const now = new Date().toISOString();
  const { markProcessed = true } = options;
  const data = {
    ...payload,
    lastAttemptAt: now,
  };
  if (markProcessed) {
    data.processedAt = now;
  }

  await db.doc(`stripeEvents/${eventId}`).set(
    data,
    { merge: true }
  );
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
    const sigHeader =
      event.headers?.['stripe-signature'] ||
      event.headers?.['Stripe-Signature'] ||
      '';
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '');

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

    const eventId = String(stripeEvent.id || '').trim();
    if (!eventId) {
      return respond(400, { error: 'missing_event_id' });
    }

    const alreadyProcessed = await getProcessedStripeEvent(eventId);
    if (alreadyProcessed?.processedAt) {
      return respond(200, { received: true, action: 'duplicate' });
    }

    const session = stripeEvent.data.object;
    const email = normalizeEmail(session.customer_details?.email || session.customer_email);

    if (!email) {
      console.error('No email in checkout session:', session.id);
      await markStripeEvent(eventId, {
        type: stripeEvent.type,
        sessionId: session.id || null,
        result: 'no_email',
      });
      return respond(200, { received: true, error: 'no_email' });
    }

    const tierResult = resolveTier(session);
    if (!tierResult.tier) {
      console.error('Unknown Stripe price/product mapping', {
        sessionId: session.id,
        priceId: tierResult.priceId,
        productId: tierResult.productId,
      });
      await markStripeEvent(eventId, {
        type: stripeEvent.type,
        sessionId: session.id || null,
        result: 'unknown_price_or_product',
        priceId: tierResult.priceId || null,
        productId: tierResult.productId || null,
      }, { markProcessed: false });
      return respond(500, { error: 'unknown_price_or_product' });
    }

    const tier = normalizeTier(tierResult.tier);
    const entitlementId = `stripe_${String(session.id || '').replace(/[^A-Za-z0-9_-]/g, '_')}`;

    await upsertEntitlement({
      entitlementId,
      emailNormalized: email,
      tier,
      stripeEventId: eventId,
      stripeSessionId: session.id || null,
      stripeCustomerId: session.customer || null,
      stripePriceId: tierResult.priceId,
      stripeProductId: tierResult.productId,
    });

    const linkedUid = await linkEntitlementToFirebaseUser({
      emailNormalized: email,
      tier,
      entitlementId,
      stripeSessionId: session.id || null,
    });

    // Keep legacy access-code email flow for backward compatibility.
    const users = await getUsers();
    const existing = users.find((u) => normalizeEmail(u.email) === email);

    let code;
    let action;
    if (existing) {
      code = existing.code;
      action = 'resent';
    } else {
      code = generateCode();
      action = 'created';
      users.push({
        email,
        code,
        tier,
        createdAt: new Date().toISOString(),
        stripeSessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
      });
      await saveUsers(users);
    }

    await sendAccessEmail(email, code);

    await markStripeEvent(eventId, {
      type: stripeEvent.type,
      sessionId: session.id || null,
      result: action,
      entitlementId,
      linkedUid,
      tier,
      priceId: tierResult.priceId || null,
      productId: tierResult.productId || null,
    });

    console.log(`Stripe processed: ${email}, tier=${tier}, code=${code}, session=${session.id}`);
    return respond(200, { received: true, action, entitlementId, linked: Boolean(linkedUid) });
  } catch (err) {
    console.error('Webhook error:', err);
    return respond(500, { error: 'internal' });
  }
}
