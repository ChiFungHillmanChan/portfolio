import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { createHmac } from 'node:crypto';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const s3 = new S3Client();
const BUCKET = process.env.DATA_BUCKET;
const JWT_SECRET = process.env.JWT_SECRET;

// Superadmin emails (comma-separated env var or hardcoded fallback)
const ADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || 'hillmanchan709@gmail.com')
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
    return {
      uid: u.uid,
      email: u.email || null,
      displayName: u.displayName || null,
      photoURL: u.photoURL || null,
      lastSignIn: u.metadata.lastSignInTime || null,
      createdAt: u.metadata.creationTime || null,
      premium: fsData.premium || false,
      tier: fsData.tier || null,
      superadmin: ADMIN_EMAILS.includes(userEmail),
      activatedAt: fsData.activatedAt || null,
      sessionId: fsData.sessionId || null,
    };
  });

  return respond(200, { users, total: users.length });
}

async function handleAdminUpdateUser(firebaseUser, body) {
  const email = firebaseUser.email;
  if (!email || !isAdmin(email)) {
    return respond(403, { error: '無管理員權限' });
  }

  const { targetUid, premium } = body;
  if (!targetUid || typeof premium !== 'boolean') {
    return respond(400, { error: '需要提供 targetUid 同 premium (boolean)' });
  }

  const updateData = { premium };
  if (premium) {
    updateData.activatedAt = new Date().toISOString();
  }

  await firestore.doc(`users/${targetUid}`).set(updateData, { merge: true });

  return respond(200, { success: true, targetUid, premium });
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

    // ── Original auth/login flow ──

    if (!code) {
      return respond(400, { error: '需要提供存取碼' });
    }

    // Verify Firebase ID token from Authorization header
    const firebaseUser = await verifyFirebaseToken(event);
    if (!firebaseUser) {
      return respond(401, { error: '需要登入' });
    }

    const email = firebaseUser.email;
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
        u.email.toLowerCase() === email.toLowerCase() && u.code === code
    );

    if (!user) {
      return respond(401, { error: '存取碼不正確' });
    }

    // Write premium status to Firestore (bypasses security rules via Admin SDK)
    await firestore.doc(`users/${firebaseUser.uid}`).set(
      {
        premium: true,
        activatedAt: new Date().toISOString(),
        sessionId: code,
        email: email.toLowerCase(),
      },
      { merge: true }
    );

    // Issue JWT — permanent (no exp), access code is the gate
    const now = Math.floor(Date.now() / 1000);
    const token = signJwt({
      sub: user.email,
      iat: now,
    });

    return respond(200, { token, premium: true });
  } catch (err) {
    console.error('Auth error:', err);
    return respond(500, { error: '伺服器錯誤' });
  }
}
