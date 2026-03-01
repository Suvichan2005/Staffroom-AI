// ─────────────────────────────────────────────────────────────
// routes/health.js — Health & readiness probes
//
// Unauthenticated so load-balancers and container orchestrators
// can hit them without tokens.
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import { getProviderStatus } from '../services/aiRouter.js';

const router = Router();

// ── GET /api/health ─────────────────────────────────────────
router.get('/', (_req, res) => {
  return res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: Math.round(process.uptime()),
  });
});

// ── GET /api/health/ready ───────────────────────────────────
// Returns 200 only if at least one AI provider is configured.
router.get('/ready', (_req, res) => {
  const providers = getProviderStatus();
  const anyAvailable = Object.values(providers).some((p) => p.available);

  return res.status(anyAvailable ? 200 : 503).json({
    status: anyAvailable ? 'ready' : 'degraded',
    providers,
    timestamp: new Date().toISOString(),
  });
});

export default router;
