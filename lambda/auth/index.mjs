import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHmac } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const s3 = new S3Client();
const BUCKET = process.env.DATA_BUCKET;
const JWT_SECRET = process.env.JWT_SECRET;
const USERS_COLLECTION = 'users';
const ENTITLEMENTS_COLLECTION = 'entitlements';

// Superadmin emails (comma-separated env var, fail-closed: empty if unset)
const ADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// ==================== Firebase Admin ====================

// FIREBASE_SERVICE_ACCOUNT env var: base64-encoded service account JSON
if (!getApps().length) {
  const sa = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString()
  );
  initializeApp({ credential: cert(sa) });
}
const firebaseAuth = getAuth();
const firestore = getFirestore();

// ==================== JWT Helpers ====================

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const signature = base64url(
    createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${signature}`;
}

// ==================== Response Helpers ====================

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': 'https://system-design.hillmanchan.com',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function respond(statusCode, body) {
  return { statusCode, headers, body: JSON.stringify(body) };
}

// ==================== Auth Helpers ====================

async function verifyFirebaseToken(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
  const idToken = authHeader.replace(/^Bearer\s+/i, '');
  if (!idToken) return null;

  try {
    return await firebaseAuth.verifyIdToken(idToken);
  } catch {
    return null;
  }
}

function isAdmin(email) {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeTier(tier, fallback = 'standard') {
  if (tier === 'pro') return 'pro';
  if (tier === 'standard') return 'standard';
  return fallback;
}

function inferLegacyTier(user) {
  if (!user || typeof user !== 'object') return 'standard';
  if (user.tier === 'pro' || user.plan === 'pro') return 'pro';
  if (typeof user.amount === 'number' && user.amount >= 39900) return 'pro';
  return 'standard';
}

async function writeUserEntitlement({ uid, email, tier, source, entitlementId, sessionId, code }) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedTier = normalizeTier(tier);
  const now = new Date().toISOString();

  const updateData = {
    premium: true,
    tier: normalizedTier,
    entitlementSource: source,
    entitlementStatus: 'active',
    entitlementId,
    customerEmailNormalized: normalizedEmail,
    premiumActivatedAt: now,
    premiumUpdatedAt: now,
    activatedAt: now, // legacy compatibility
    email: normalizedEmail, // legacy compatibility
  };

  if (sessionId) updateData.latestStripeSessionId = sessionId;
  if (code) updateData.sessionId = code; // legacy compatibility

  await firestore.doc(`${USERS_COLLECTION}/${uid}`).set(updateData, { merge: true });

  return {
    premium: true,
    tier: normalizedTier,
    entitlementStatus: 'active',
    entitlementId,
  };
}

async function upsertEntitlement(entitlementId, payload) {
  const now = new Date().toISOString();
  await firestore.doc(`${ENTITLEMENTS_COLLECTION}/${entitlementId}`).set(
    {
      ...payload,
      updatedAt: now,
      createdAt: payload.createdAt || now,
    },
    { merge: true }
  );
}

async function getEntitlementByStripeSession(sessionId) {
  const snapshot = await firestore
    .collection(ENTITLEMENTS_COLLECTION)
    .where('stripeSessionId', '==', sessionId)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

// ==================== Admin Handlers ====================

async function handleAdminListUsers(firebaseUser) {
  const email = firebaseUser.email;
  if (!email || !isAdmin(email)) {
    return respond(403, { error: '無管理員權限' });
  }

  // List ALL Firebase Auth users (not just Firestore docs)
  const authUsers = [];
  let nextPageToken;
  do {
    const listResult = await firebaseAuth.listUsers(1000, nextPageToken);
    authUsers.push(...listResult.users);
    nextPageToken = listResult.pageToken;
  } while (nextPageToken);

  // Get Firestore premium data to merge
  const snapshot = await firestore.collection('users').get();
  const firestoreMap = {};
  snapshot.docs.forEach((doc) => {
    firestoreMap[doc.id] = doc.data();
  });

  // Merge: Auth user info + Firestore premium status
  const users = authUsers.map((u) => {
    const fsData = firestoreMap[u.uid] || {};
    const userEmail = (u.email || '').toLowerCase();
    const premium = fsData.premium === true && fsData.entitlementStatus !== 'revoked';
    return {
      uid: u.uid,
      email: u.email || null,
      displayName: u.displayName || null,
      photoURL: u.photoURL || null,
      lastSignIn: u.metadata.lastSignInTime || null,
      createdAt: u.metadata.creationTime || null,
      premium,
      tier: fsData.tier || null,
      superadmin: ADMIN_EMAILS.includes(userEmail),
      activatedAt: fsData.activatedAt || null,
      sessionId: fsData.sessionId || null,
      entitlementStatus: fsData.entitlementStatus || null,
      entitlementSource: fsData.entitlementSource || null,
    };
  });

  return respond(200, { users, total: users.length });
}

async function handleAdminUpdateUser(firebaseUser, body) {
  const email = firebaseUser.email;
  if (!email || !isAdmin(email)) {
    return respond(403, { error: '無管理員權限' });
  }

  const { targetUid, premium, tier } = body;
  if (!targetUid || typeof premium !== 'boolean') {
    return respond(400, { error: '需要提供 targetUid 同 premium (boolean)' });
  }
  const now = new Date().toISOString();
  const updateData = { premium, premiumUpdatedAt: now };
  if (premium) {
    const normalizedTier = normalizeTier(tier);
    updateData.activatedAt = now;
    updateData.premiumActivatedAt = now;
    updateData.tier = normalizedTier;
    updateData.entitlementStatus = 'active';
    updateData.entitlementSource = 'admin';
    updateData.entitlementId = `admin_${targetUid}`;
    await upsertEntitlement(`admin_${targetUid}`, {
      source: 'admin',
      status: 'active',
      tier: normalizedTier,
      userUid: targetUid,
      updatedBy: normalizeEmail(firebaseUser.email),
    });
  } else {
    updateData.tier = null;
    updateData.entitlementStatus = 'revoked';
    updateData.entitlementSource = 'admin';
  }

  await firestore.doc(`${USERS_COLLECTION}/${targetUid}`).set(updateData, { merge: true });

  return respond(200, { success: true, targetUid, premium, tier: updateData.tier });
}

async function handleConfirmSession(firebaseUser, body) {
  const sessionId = String(body.sessionId || body.session_id || '').trim();
  if (!sessionId) {
    return respond(400, { error: '需要提供 session_id' });
  }

  const email = normalizeEmail(firebaseUser.email);
  if (!email) {
    return respond(400, { error: '無法取得你嘅電郵地址' });
  }

  const entitlement = await getEntitlementByStripeSession(sessionId);
  if (!entitlement) {
    return respond(404, { error: '找不到對應付款記錄', status: 'not_found' });
  }

  if (entitlement.status && entitlement.status !== 'active') {
    return respond(409, { error: '此付款記錄未處於可用狀態', status: entitlement.status });
  }

  if (entitlement.emailNormalized && entitlement.emailNormalized !== email) {
    return respond(403, { error: '付款電郵與目前登入帳號不一致', status: 'email_mismatch' });
  }

  const tier = normalizeTier(entitlement.tier, 'standard');
  const now = new Date().toISOString();

  await upsertEntitlement(entitlement.id, {
    source: entitlement.source || 'stripe',
    status: 'active',
    tier,
    stripeSessionId: sessionId,
    stripeEventId: entitlement.stripeEventId || null,
    stripeCustomerId: entitlement.stripeCustomerId || null,
    stripePriceId: entitlement.stripePriceId || null,
    stripeProductId: entitlement.stripeProductId || null,
    emailNormalized: email,
    userUid: firebaseUser.uid,
    linkedAt: now,
  });

  const snapshot = await writeUserEntitlement({
    uid: firebaseUser.uid,
    email,
    tier,
    source: entitlement.source || 'stripe',
    entitlementId: entitlement.id,
    sessionId,
  });

  return respond(200, {
    success: true,
    linked: true,
    sessionId,
    ...snapshot,
  });
}

// ==================== Handler ====================

export async function handler(event) {
  try {
    const body = JSON.parse(event.body || '{}');
    const { action, code } = body;

    // Route admin actions
    if (action === 'admin-list-users' || action === 'admin-update-user') {
      const firebaseUser = await verifyFirebaseToken(event);
      if (!firebaseUser) {
        return respond(401, { error: '需要登入' });
      }

      if (action === 'admin-list-users') {
        return await handleAdminListUsers(firebaseUser);
      }
      if (action === 'admin-update-user') {
        return await handleAdminUpdateUser(firebaseUser, body);
      }
    }

    if (action === 'confirm-session') {
      const firebaseUser = await verifyFirebaseToken(event);
      if (!firebaseUser) {
        return respond(401, { error: '需要登入' });
      }
      return await handleConfirmSession(firebaseUser, body);
    }

    // ── Original auth/login flow ──

    if (!code) {
      return respond(400, { error: '需要提供存取碼' });
    }

    // Verify Firebase ID token from Authorization header
    const firebaseUser = await verifyFirebaseToken(event);
    if (!firebaseUser) {
      return respond(401, { error: '需要登入' });
    }

    const email = normalizeEmail(firebaseUser.email);
    if (!email) {
      return respond(400, { error: '無法取得你嘅電郵地址' });
    }

    // Read users.json from S3
    const obj = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: 'users.json' })
    );
    const users = JSON.parse(await obj.Body.transformToString());

    // Match email + code (case-insensitive email)
    const user = users.find(
      (u) =>
        normalizeEmail(u.email) === email && String(u.code || '').toUpperCase() === String(code || '').toUpperCase()
    );

    if (!user) {
      return respond(401, { error: '存取碼不正確' });
    }

    const normalizedCode = String(code).trim().toUpperCase();
    const tier = inferLegacyTier(user);
    const entitlementId = `legacy_code_${normalizedCode.replace(/[^A-Z0-9_-]/g, '')}`;

    await upsertEntitlement(entitlementId, {
      source: 'code',
      status: 'active',
      tier,
      code: normalizedCode,
      emailNormalized: email,
      userUid: firebaseUser.uid,
    });

    const snapshot = await writeUserEntitlement({
      uid: firebaseUser.uid,
      email,
      tier,
      source: 'code',
      entitlementId,
      code: normalizedCode,
    });

    // Issue JWT — permanent (no exp), access code is the gate
    const now = Math.floor(Date.now() / 1000);
    const token = JWT_SECRET
      ? signJwt({
          sub: normalizeEmail(user.email),
          iat: now,
        })
      : null;

    return respond(200, { token, ...snapshot });
  } catch (err) {
    console.error('Auth error:', err);
    return respond(500, { error: '伺服器錯誤' });
  }
}
