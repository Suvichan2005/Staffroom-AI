// ─────────────────────────────────────────────────────────────
// config/firebase.js — Firebase Admin SDK singleton
// Uses GOOGLE_APPLICATION_CREDENTIALS (service-account JSON)
// or auto-detects credentials when running on GCP.
// ─────────────────────────────────────────────────────────────

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

let app;

if (getApps().length === 0) {
  // When GOOGLE_APPLICATION_CREDENTIALS is set, the SDK reads it automatically.
  // When running on Cloud Run / GCE, Application Default Credentials are used.
  // Explicit cert() is only needed if you pass the JSON inline.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64) {
    // Base64-encoded JSON for environments where multiline secrets are awkward
    const decoded = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decoded);
    app = initializeApp({ credential: cert(serviceAccount) });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    // For platforms that inject the JSON as a string env var (Render, etc.)
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    app = initializeApp({ credential: cert(serviceAccount) });
  } else {
    // Uses GOOGLE_APPLICATION_CREDENTIALS file path or ADC
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
