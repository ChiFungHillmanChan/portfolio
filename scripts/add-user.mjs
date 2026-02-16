#!/usr/bin/env node
/**
 * Add a new user to users.json and upload to S3.
 *
 * Usage:
 *   node scripts/add-user.mjs <email>
 *   node scripts/add-user.mjs user@example.com
 *   node scripts/add-user.mjs user@example.com --code MY-CUSTOM-CODE
 *
 * If no --code is provided, a random one is generated (e.g. SA-A7X3K9).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { execSync } from 'node:child_process';

const DATA_FILE = join(import.meta.dirname, '..', 'lambda', 'data', 'users.json');
const S3_KEY = 'users.json';
const BUCKET = 'sa-classroom-data';

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const bytes = randomBytes(6);
  let code = 'SA-';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith('--'));

  if (!email || !email.includes('@')) {
    console.error('Usage: node scripts/add-user.mjs <email> [--code CODE]');
    process.exit(1);
  }

  const codeIdx = args.indexOf('--code');
  const code = codeIdx !== -1 && args[codeIdx + 1] ? args[codeIdx + 1] : generateCode();

  const users = JSON.parse(await readFile(DATA_FILE, 'utf-8'));

  // Check duplicate
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    console.error(`User ${email} already exists.`);
    process.exit(1);
  }

  users.push({ email: email.toLowerCase(), code });
  await writeFile(DATA_FILE, JSON.stringify(users, null, 2) + '\n', 'utf-8');

  console.log(`Added user: ${email}`);
  console.log(`Access code: ${code}`);
  console.log(`Total users: ${users.length}`);

  // Upload to S3
  try {
    execSync(`aws s3 cp "${DATA_FILE}" s3://${BUCKET}/${S3_KEY}`, { stdio: 'inherit' });
    console.log('Uploaded to S3 successfully.');
  } catch {
    console.warn('Warning: S3 upload failed. Upload manually later.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
