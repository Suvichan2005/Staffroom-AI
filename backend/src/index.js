// ─────────────────────────────────────────────────────────────
// src/index.js — Staffroom AI Backend Entry Point
//
// Production-grade Express server with:
// • Firebase Admin SDK for auth verification
// • Redis-backed per-user rate limiting
// • Strict CORS allowlist
// • Centralised error handling
// • Helmet security headers
// • Request size limits
// • Graceful shutdown
// ─────────────────────────────────────────────────────────────

import 'dotenv/config';               // Load .env BEFORE anything reads process.env
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import hpp from 'hpp';

// Config (validates env vars on import — fails fast)
import config from './config/env.js';
import corsOptions from './config/cors.js';

// Middleware
import errorHandler from './middleware/errorHandler.js';
import { closeRedis } from './middleware/rateLimiter.js';

// Routes
import aiRoutes from './routes/ai.js';
import healthRoutes from './routes/health.js';
import adminRoutes from './routes/admin.js';

// ── App ─────────────────────────────────────────────────────
const app = express();

// ── Security headers ────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,  // API-only — no HTML served
  crossOriginEmbedderPolicy: false,
}));

// ── CORS ────────────────────────────────────────────────────
app.use(cors(corsOptions));

// ── Body parsing ────────────────────────────────────────────
// 50 MB limit for audio uploads (base64-encoded ≈ 35 MB raw)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── HTTP parameter pollution protection ─────────────────────
app.use(hpp());

// ── Compression ─────────────────────────────────────────────
app.use(compression());

// ── Trust proxy (Railway / Render / Cloud Run sit behind LB) ─
app.set('trust proxy', 1);

// ── Request logging (lightweight) ───────────────────────────
app.use((req, _res, next) => {
  if (req.path !== '/api/health') {
    console.log(`${req.method} ${req.path} from ${req.ip}`);
  }
  next();
});

// ── Routes ──────────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/ai',     aiRoutes);
app.use('/api/admin',  adminRoutes);

// ── 404 catch-all ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'Route does not exist.' });
});

// ── Error handler (must be last) ────────────────────────────
app.use(errorHandler);

// ── Start server ────────────────────────────────────────────
const server = app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════╗
║  Staffroom AI Backend                    ║
║  Port:  ${String(config.port).padEnd(33)}║
║  Env:   ${String(config.nodeEnv).padEnd(33)}║
║  CORS:  ${String(config.cors.allowedOrigins.length + ' origins').padEnd(33)}║
╚══════════════════════════════════════════╝
  `);
});

// ── Graceful shutdown ───────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully…`);

  server.close(() => {
    console.log('[shutdown] HTTP server closed.');
  });

  await closeRedis();
  console.log('[shutdown] Redis closed.');

  process.exit(0);
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Catch unhandled rejections so the process doesn't crash silently
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

export default app;
