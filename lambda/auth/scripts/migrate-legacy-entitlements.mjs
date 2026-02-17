import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const DRY_RUN = process.argv.includes('--dry-run');
const BUCKET = process.env.DATA_BUCKET;
const FIREBASE_SERVICE_ACCOUNT = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!BUCKET) {
  throw new Error('Missing DATA_BUCKET env var.');
}
if (!FIREBASE_SERVICE_ACCOUNT) {
  throw new Error('Missing FIREBASE_SERVICE_ACCOUNT env var.');
}

const s3 = new S3Client();

if (!getApps().length) {
  const sa = JSON.parse(Buffer.from(FIREBASE_SERVICE_ACCOUNT, 'base64').toString());
  initializeApp({ credential: cert(sa) });
}

const firebaseAuth = getAuth();
const db = getFirestore();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeTier(tier, fallback = 'standard') {
  if (tier === 'pro') return 'pro';
  if (tier === 'standard') return 'standard';
  return fallback;
}

function inferLegacyTier(user) {
  if (user?.tier === 'pro' || user?.plan === 'pro') return 'pro';
  if (typeof user?.amount === 'number' && user.amount >= 39900) return 'pro';
  return 'standard';
}

function sanitizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
}

async function readLegacyUsers() {
  const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: 'users.json' }));
  const json = await obj.Body.transformToString();
  const data = JSON.parse(json);
  if (!Array.isArray(data)) {
    throw new Error('users.json is not an array.');
  }
  return data;
}

async function upsertEntitlement(entitlementId, payload) {
  if (DRY_RUN) return;
  await db.doc(`entitlements/${entitlementId}`).set(payload, { merge: true });
}

async function upsertUser(uid, payload) {
  if (DRY_RUN) return;
  await db.doc(`users/${uid}`).set(payload, { merge: true });
}

async function run() {
  const users = await readLegacyUsers();
  const now = new Date().toISOString();
  const summary = {
    total: users.length,
    migratedEntitlements: 0,
    linkedUsers: 0,
    unmatchedUsers: 0,
    skippedInvalid: 0,
    errors: 0,
  };
  const unmatchedEmails = [];
  const failures = [];

  for (const entry of users) {
    try {
      const email = normalizeEmail(entry?.email);
      const code = sanitizeCode(entry?.code);
      if (!email || !code) {
        summary.skippedInvalid += 1;
        continue;
      }

      const tier = normalizeTier(inferLegacyTier(entry));
      const entitlementId = `legacy_code_${code}`;
      const entitlementPayload = {
        source: 'code',
        status: 'active',
        tier,
        code,
        emailNormalized: email,
        stripeSessionId: entry?.stripeSessionId || null,
        createdAt: entry?.createdAt || now,
        updatedAt: now,
      };
      await upsertEntitlement(entitlementId, entitlementPayload);
      summary.migratedEntitlements += 1;

      try {
        const authUser = await firebaseAuth.getUserByEmail(email);
        await upsertEntitlement(entitlementId, {
          userUid: authUser.uid,
          linkedAt: now,
          updatedAt: now,
        });
        await upsertUser(authUser.uid, {
          premium: true,
          tier,
          entitlementSource: 'code',
          entitlementStatus: 'active',
          entitlementId,
          customerEmailNormalized: email,
          premiumActivatedAt: now,
          premiumUpdatedAt: now,
          activatedAt: now,
          sessionId: code,
          email,
        });
        summary.linkedUsers += 1;
      } catch (err) {
        if (err?.code === 'auth/user-not-found') {
          summary.unmatchedUsers += 1;
          unmatchedEmails.push(email);
          continue;
        }
        throw err;
      }
    } catch (err) {
      summary.errors += 1;
      failures.push({ email: entry?.email || null, error: String(err?.message || err) });
    }
  }

  console.log(`\nLegacy migration finished (${DRY_RUN ? 'DRY RUN' : 'LIVE'}):`);
  console.log(JSON.stringify(summary, null, 2));

  if (unmatchedEmails.length) {
    console.log('\nUnmatched emails (no Firebase user):');
    for (const email of unmatchedEmails.slice(0, 50)) {
      console.log(`- ${email}`);
    }
    if (unmatchedEmails.length > 50) {
      console.log(`...and ${unmatchedEmails.length - 50} more`);
    }
  }

  if (failures.length) {
    console.log('\nFailures:');
    for (const failure of failures.slice(0, 20)) {
      console.log(`- ${failure.email || '(unknown)'}: ${failure.error}`);
    }
    if (failures.length > 20) {
      console.log(`...and ${failures.length - 20} more`);
    }
  }
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
