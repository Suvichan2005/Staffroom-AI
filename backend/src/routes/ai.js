// ─────────────────────────────────────────────────────────────
// routes/ai.js — AI gateway routes
//
// All routes require authentication (requireAuth).
// Rate limiting is applied per-user via Redis.
// Input is validated before reaching the AI router.
// ─────────────────────────────────────────────────────────────

import { Router } from 'express';
import requireAuth from '../middleware/requireAuth.js';
import requireRole from '../middleware/requireRole.js';
import { aiRateLimiter, strictRateLimiter } from '../middleware/rateLimiter.js';
import { validateGenerateBody } from '../middleware/validate.js';
import { generate, generateVision, generateAgent, getProviderStatus, getLiveWsUrl } from '../services/aiRouter.js';

const router = Router();

// ── POST /api/ai/generate ───────────────────────────────────
router.post(
  '/generate',
  requireAuth,
  aiRateLimiter,
  validateGenerateBody,
  async (req, res, next) => {
    try {
      const { messages, type, tools, systemInstruction, toolConfig, generationConfig } = req.body;

      console.log(`[ai/generate] uid=${req.user.uid} type=${type || 'default'} msgs=${messages.length}`);

      const result = await generate({ messages, type, tools, systemInstruction, toolConfig, generationConfig });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
);

// ── POST /api/ai/vision ────────────────────────────────────
// For document parsing with inline images.
// Body: { prompt, imageBase64, mimeType, systemInstruction?, generationConfig? }
router.post(
  '/vision',
  requireAuth,
  aiRateLimiter,
  async (req, res, next) => {
    try {
      const { prompt, imageBase64, mimeType, systemInstruction, generationConfig } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: 'Validation Error', message: '`prompt` is required.' });
      }
      if (!imageBase64 || typeof imageBase64 !== 'string') {
        return res.status(400).json({ error: 'Validation Error', message: '`imageBase64` is required.' });
      }
      if (!mimeType || typeof mimeType !== 'string') {
        return res.status(400).json({ error: 'Validation Error', message: '`mimeType` is required.' });
      }

      // Limit image payload (~50 MB base64)
      if (imageBase64.length > 70_000_000) {
        return res.status(400).json({ error: 'Validation Error', message: 'Image data too large.' });
      }

      console.log(`[ai/vision] uid=${req.user.uid} mime=${mimeType}`);

      const result = await generateVision({ prompt, imageBase64, mimeType, systemInstruction, generationConfig });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
);

// ── POST /api/ai/agent ──────────────────────────────────────
// For the onboarding agent (forced function calling).
// Body: { contents, systemInstruction, tools, toolConfig, generationConfig }
router.post(
  '/agent',
  requireAuth,
  aiRateLimiter,
  async (req, res, next) => {
    try {
      const { contents, systemInstruction, tools, toolConfig, generationConfig } = req.body;

      if (!contents || !Array.isArray(contents)) {
        return res.status(400).json({ error: 'Validation Error', message: '`contents` array is required.' });
      }
      if (!tools || !Array.isArray(tools)) {
        return res.status(400).json({ error: 'Validation Error', message: '`tools` array is required.' });
      }

      console.log(`[ai/agent] uid=${req.user.uid} tools=${tools.length}`);

      const result = await generateAgent({ contents, systemInstruction, tools, toolConfig, generationConfig });
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
);

// ── GET /api/ai/live-token ──────────────────────────────────
router.get(
  '/live-token',
  requireAuth,
  strictRateLimiter,
  (req, res) => {
    console.log(`[ai/live-token] uid=${req.user.uid}`);
    const wsUrl = getLiveWsUrl();
    return res.status(200).json({ wsUrl, expiresIn: 3600 });
  }
);

// ── GET /api/ai/providers ───────────────────────────────────
router.get(
  '/providers',
  requireAuth,
  requireRole(['admin']),
  (_req, res) => {
    return res.status(200).json(getProviderStatus());
  }
);

export default router;
