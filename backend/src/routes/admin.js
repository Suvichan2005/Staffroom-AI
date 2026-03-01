// ─────────────────────────────────────────────────────────────
// routes/admin.js — Admin-only management endpoints
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { auth } from '../config/firebase.js';

const router = Router();

// ── POST /api/admin/set-role ────────────────────────────────
router.post(
  '/set-role',
  requireAuth,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const { uid, role } = req.body;

      if (!uid || typeof uid !== 'string') {
        return res.status(400).json({ error: 'Validation Error', message: '`uid` is required.' });
      }

      const VALID_ROLES = ['teacher', 'hod', 'admin'];
      if (!role || !VALID_ROLES.includes(role)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `\`role\` must be one of: ${VALID_ROLES.join(', ')}`,
        });
      }

      if (uid === req.user.uid && role !== 'admin') {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Cannot remove your own admin role.',
        });
      }

      await auth.setCustomUserClaims(uid, { role, roles: [role] });
      await auth.revokeRefreshTokens(uid);

      console.log(`[admin/set-role] admin=${req.user.uid} target=${uid} role=${role}`);

      return res.status(200).json({
        success: true,
        message: `Role "${role}" set for user ${uid}. Token revoked — user must re-authenticate.`,
      });
    } catch (err) {
      return next(err);
    }
  }
);

// ── GET /api/admin/user/:uid ────────────────────────────────
router.get(
  '/user/:uid',
  requireAuth,
  requireRole(['admin']),
  async (req, res, next) => {
    try {
      const user = await auth.getUser(req.params.uid);
      return res.status(200).json({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        customClaims: user.customClaims || {},
        disabled: user.disabled,
        lastSignIn: user.metadata.lastSignInTime,
      });
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'Not Found', message: 'User not found.' });
      }
      return next(err);
    }
  }
);

export default router;
