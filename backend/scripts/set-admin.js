#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// scripts/set-admin.js — Bootstrap the first admin user
//
// Usage:  node scripts/set-admin.js <firebase-uid>
// Run from the backend/ directory so it finds service-account.json
// ─────────────────────────────────────────────────────────────

import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const uid = process.argv[2];
if (!uid || uid === 'FIREBASE_USER_UID') {
  console.error('Usage: node scripts/set-admin.js <firebase-uid>');
  console.error('');
  console.error('  Get your UID from Firebase Console → Authentication → Users');
  process.exit(1);
}

// Load service account
const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : resolve(__dirname, '..', 'service-account.json');

let credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
} else {
  const sa = JSON.parse(readFileSync(saPath, 'utf8'));
  credential = cert(sa);
}

initializeApp({ credential });

try {
  await getAuth().setCustomUserClaims(uid, { role: 'admin', roles: ['admin'] });
  const user = await getAuth().getUser(uid);
  console.log(`\n✅ Admin claims set for:`);
  console.log(`   UID:   ${user.uid}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Claims: ${JSON.stringify(user.customClaims)}`);
  console.log(`\nThe user must sign out and sign back in for claims to take effect.\n`);
} catch (err) {
  console.error('❌ Failed to set claims:', err.message);
  process.exit(1);
}
