// ─────────────────────────────────────────────────────────────
// middleware/validate.js — Input validation for AI endpoints
//
// • Validates the messages array structure
// • Enforces max 100 messages
// • Enforces max 32 000 chars per message content
// • Rejects malformed tool declarations
// ─────────────────────────────────────────────────────────────

const MAX_MESSAGES = 100;
const MAX_CHARS_PER_MESSAGE = 32_000;
const ALLOWED_ROLES = new Set(['system', 'user', 'assistant', 'tool', 'function', 'model']);

/**
 * Validate and sanitise the AI generate request body.
 *
 * Expected shape:
 * {
 *   messages: [{ role: string, content: string }],
 *   type?: 'fast' | 'default' | 'complex',
 *   provider?: 'gemini' | 'openai' | 'azure',
 *   tools?: Array<object>,
 *   systemInstruction?: string
 * }
 */
export function validateGenerateBody(req, res, next) {
  const { messages, type, provider, tools, systemInstruction } = req.body;

  // ── messages ──────────────────────────────────────────────
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: '`messages` must be a non-empty array.',
    });
  }

  if (messages.length === 0) {
    return res.status(400).json({
      error: 'Validation Error',
      message: '`messages` array must contain at least one message.',
    });
  }

  if (messages.length > MAX_MESSAGES) {
    return res.status(400).json({
      error: 'Validation Error',
      message: `Too many messages. Maximum is ${MAX_MESSAGES}.`,
    });
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (!msg || typeof msg !== 'object') {
      return res.status(400).json({
        error: 'Validation Error',
        message: `messages[${i}] must be an object with { role, content }.`,
      });
    }

    // role
    if (!msg.role || typeof msg.role !== 'string' || !ALLOWED_ROLES.has(msg.role)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `messages[${i}].role must be one of: ${[...ALLOWED_ROLES].join(', ')}`,
      });
    }

    // content — string or null (tool_calls messages may have null content)
    if (msg.content !== null && msg.content !== undefined) {
      if (typeof msg.content !== 'string') {
        return res.status(400).json({
          error: 'Validation Error',
          message: `messages[${i}].content must be a string or null.`,
        });
      }

      if (msg.content.length > MAX_CHARS_PER_MESSAGE) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `messages[${i}].content exceeds ${MAX_CHARS_PER_MESSAGE} chars.`,
        });
      }
    }
  }

  // ── type ──────────────────────────────────────────────────
  if (type !== undefined) {
    const allowed = ['fast', 'default', 'complex'];
    if (!allowed.includes(type)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `\`type\` must be one of: ${allowed.join(', ')}`,
      });
    }
  }

  // ── provider ──────────────────────────────────────────────
  if (provider !== undefined) {
    const allowed = ['gemini', 'openai', 'azure'];
    if (!allowed.includes(provider)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `\`provider\` must be one of: ${allowed.join(', ')}`,
      });
    }
  }

  // ── tools ─────────────────────────────────────────────────
  if (tools !== undefined) {
    if (!Array.isArray(tools)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: '`tools` must be an array.',
      });
    }
    if (tools.length > 64) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Maximum 64 tool declarations allowed.',
      });
    }
  }

  // ── systemInstruction ─────────────────────────────────────
  if (systemInstruction !== undefined) {
    if (typeof systemInstruction !== 'string') {
      return res.status(400).json({
        error: 'Validation Error',
        message: '`systemInstruction` must be a string.',
      });
    }
    if (systemInstruction.length > MAX_CHARS_PER_MESSAGE) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `\`systemInstruction\` exceeds ${MAX_CHARS_PER_MESSAGE} chars.`,
      });
    }
  }

  return next();
}

/**
 * Validate the transcription / audio upload body.
 */
export function validateTranscribeBody(req, res, next) {
  const { audio, mimeType } = req.body;

  if (!audio || typeof audio !== 'string') {
    return res.status(400).json({
      error: 'Validation Error',
      message: '`audio` must be a base64-encoded string.',
    });
  }

  // ~33% base64 overhead → 25 MB binary ≈ 33 MB base64
  if (audio.length > 35_000_000) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Audio data too large. Maximum 25 MB.',
    });
  }

  const validMimes = new Set([
    'audio/webm', 'audio/mp3', 'audio/mpeg', 'audio/wav',
    'audio/ogg', 'audio/m4a', 'audio/flac', 'audio/mp4',
  ]);

  if (mimeType && !validMimes.has(mimeType)) {
    return res.status(400).json({
      error: 'Validation Error',
      message: `Unsupported audio MIME type: ${mimeType}`,
    });
  }

  return next();
}
