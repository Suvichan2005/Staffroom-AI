// ─────────────────────────────────────────────────────────────
// middleware/requireAuth.js — Firebase ID-token verification
//
// Expects:  Authorization: Bearer <firebase-id-token>
// Attaches: req.user = { uid, email, role, ... }
// Rejects:  401 if missing / invalid / expired
// ─────────────────────────────────────────────────────────────

import { auth } from '../config/firebase.js';

/**
 * Express middleware that verifies the Firebase ID token.
 *
 * • Strips "Bearer " prefix
 * • Calls admin.auth().verifyIdToken() (checks signature, expiry, revocation)
 * • Attaches decoded token to req.user
 */
export default async function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
  }

  const idToken = header.split('Bearer ')[1];

  if (!idToken || idToken.length < 20) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid token format.',
    });
  }

  try {
    // checkRevoked: true ensures that if the token was revoked via
    // admin.auth().revokeRefreshTokens(), it will be rejected.
    const decoded = await auth.verifyIdToken(idToken, /* checkRevoked */ true);

    // Attach a clean user object — never forward the raw token
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      emailVerified: decoded.email_verified || false,
      role: decoded.role || 'teacher',          // custom claim
      roles: decoded.roles || [decoded.role || 'teacher'],  // array variant
      displayName: decoded.name || '',
      picture: decoded.picture || '',
    };

    return next();
  } catch (err) {
    // Firebase Auth error codes:
    // auth/id-token-expired, auth/id-token-revoked, auth/argument-error
    const code = err.code || '';
    const isExpired = code.includes('expired');
    const isRevoked = code.includes('revoked');

    console.warn(`[requireAuth] Token rejected: ${code} — ${err.message}`);

    return res.status(401).json({
      error: 'Unauthorized',
      message: isExpired
        ? 'Token expired. Please re-authenticate.'
        : isRevoked
          ? 'Token revoked. Please sign in again.'
          : 'Invalid authentication token.',
    });
  }
}
