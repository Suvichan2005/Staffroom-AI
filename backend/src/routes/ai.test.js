// Set test environment variable before any imports
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-mock-gemini-key-12345';

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Backend AI Gateway & Gemini 3.8 Router', () => {
  test('MODEL_MAP defines stable gemini-3.8 models', async () => {
    const { MODEL_MAP, LIVE_MODEL } = await import('../services/aiRouter.js');
    assert.equal(MODEL_MAP.fast, 'gemini-3.8-flash');
    assert.equal(MODEL_MAP.default, 'gemini-3.8-flash');
    assert.equal(MODEL_MAP.complex, 'gemini-3.8-pro');
    assert.equal(LIVE_MODEL, 'gemini-3.8-live');
  });

  test('getProviderStatus returns Gemini availability', async () => {
    const { getProviderStatus } = await import('../services/aiRouter.js');
    const status = getProviderStatus();
    assert.ok(status.gemini);
    assert.match(status.gemini.label, /3\.8/);
  });

  test('getLiveWsUrl constructs secure WebSocket URL', async () => {
    const { getLiveWsUrl } = await import('../services/aiRouter.js');
    const url = getLiveWsUrl();
    assert.ok(url.startsWith('wss://generativelanguage.googleapis.com'));
    assert.ok(url.includes('BidiGenerateContent'));
  });
});
