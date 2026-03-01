// ─────────────────────────────────────────────────────────────
// middleware/requireRole.js — Role-based access control
//
// Checks Firebase custom claims set via admin SDK:
//   admin.auth().setCustomUserClaims(uid, { role: 'admin' })
//
// Usage:
//   router.get('/admin', requireAuth, requireRole(['admin']), handler)
//   router.post('/hod',  requireAuth, requireRole(['admin', 'hod']), handler)
// ─────────────────────────────────────────────────────────────

/**
 * Factory that returns middleware enforcing one or more roles.
 *
 * @param {string[]} allowedRoles — e.g. ['admin'], ['admin','hod']
 * @returns {import('express').RequestHandler}
 */
export default function requireRole(allowedRoles) {
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('requireRole() needs a non-empty array of role strings');
  }

  return (req, res, next) => {
    // requireAuth must run first and attach req.user
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required before role check.',
      });
    }

    const userRole = req.user.role;          // single role claim
    const userRoles = req.user.roles || [];  // array claim

    // Check against both single and array variants
    const hasRole =
      allowedRoles.includes(userRole) ||
      userRoles.some((r) => allowedRoles.includes(r));

    if (!hasRole) {
      console.warn(
        `[requireRole] Forbidden: uid=${req.user.uid} role=${userRole} needed=${allowedRoles.join(',')}`
      );

      return res.status(403).json({
        error: 'Forbidden',
        message: `This action requires one of: ${allowedRoles.join(', ')}`,
      });
    }

    return next();
  };
}
