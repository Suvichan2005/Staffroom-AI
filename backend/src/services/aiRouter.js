// ─────────────────────────────────────────────────────────────
// services/aiRouter.js — AI provider routing (Gemini)
//
// Provider-agnostic interface — adding new providers in future
// only requires adding a new callXxx function + DISPATCH entry.
// All keys are loaded from process.env, never from the client.
// ─────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai';
import config from '../config/env.js';

// ── Lazy singleton ──────────────────────────────────────────

let _geminiClient = null;

function geminiClient() {
  if (!_geminiClient) {
    _geminiClient = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return _geminiClient;
}

// ── Model tiers ─────────────────────────────────────────────

const MODEL_MAP = {
  fast:    'gemini-2.5-flash',
  default: 'gemini-2.5-flash',
  complex: 'gemini-2.5-pro',
};

// ── Generate ────────────────────────────────────────────────

async function callGemini({ messages, tools, systemInstruction, type, toolConfig, generationConfig }) {
  const modelId = MODEL_MAP[type] || MODEL_MAP.default;

  const modelOpts = {
    model: modelId,
    systemInstruction: systemInstruction || undefined,
    tools: tools || undefined,
  };

  if (toolConfig) modelOpts.toolConfig = toolConfig;

  const model = geminiClient().getGenerativeModel(modelOpts);

  // Convert OpenAI-style messages → Gemini contents
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: Array.isArray(m.parts) ? m.parts : [{ text: m.content || '' }],
  }));

  const genConfig = {
    temperature: generationConfig?.temperature ?? 0.7,
    maxOutputTokens: generationConfig?.maxOutputTokens ?? 4096,
  };

  const result = await model.generateContent({ contents, generationConfig: genConfig });
  const response = result.response;

  return {
    provider: 'gemini',
    model: modelId,
    text: response.text?.() || '',
    functionCalls: response.functionCalls?.() || [],
    finishReason: response.candidates?.[0]?.finishReason || 'STOP',
  };
}

// ── Vision / document parsing ───────────────────────────────

/**
 * Call Gemini with inline image data (vision).
 */
async function callGeminiVision({ prompt, imageBase64, mimeType, systemInstruction, generationConfig }) {
  const model = geminiClient().getGenerativeModel({
    model: MODEL_MAP.default,
    systemInstruction: systemInstruction || undefined,
  });

  const parts = [
    { text: prompt },
    { inlineData: { mimeType, data: imageBase64 } },
  ];

  const genConfig = {
    temperature: generationConfig?.temperature ?? 0.1,
    maxOutputTokens: generationConfig?.maxOutputTokens ?? 25000,
  };

  const result = await model.generateContent({ contents: [{ parts }], generationConfig: genConfig });
  const response = result.response;

  return {
    provider: 'gemini',
    model: MODEL_MAP.default,
    text: response.text?.() || '',
    functionCalls: response.functionCalls?.() || [],
    finishReason: response.candidates?.[0]?.finishReason || 'STOP',
  };
}

// ── Agent call (with forced function calling) ───────────────

/**
 * Call Gemini with function-calling in ANY mode (forces at least one tool call).
 * Used by the onboarding agent.
 */
async function callGeminiAgent({ contents, systemInstruction, tools, toolConfig, generationConfig }) {
  const modelId = MODEL_MAP.default;

  const model = geminiClient().getGenerativeModel({
    model: modelId,
    systemInstruction: systemInstruction || undefined,
    tools: tools || undefined,
    toolConfig: toolConfig || undefined,
  });

  const genConfig = {
    temperature: generationConfig?.temperature ?? 0.1,
    maxOutputTokens: generationConfig?.maxOutputTokens ?? 16384,
  };

  const result = await model.generateContent({ contents, generationConfig: genConfig });
  const response = result.response;

  return {
    provider: 'gemini',
    model: modelId,
    text: response.text?.() || '',
    functionCalls: response.functionCalls?.() || [],
    finishReason: response.candidates?.[0]?.finishReason || 'STOP',
  };
}

// ── Public API ──────────────────────────────────────────────

export async function generate(opts) {
  return callGemini(opts);
}

export async function generateVision(opts) {
  return callGeminiVision(opts);
}

export async function generateAgent(opts) {
  return callGeminiAgent(opts);
}

export function getProviderStatus() {
  return {
    gemini: { available: !!config.gemini.apiKey, label: 'Gemini' },
  };
}

/**
 * Get the Gemini Live WebSocket URL (key stays server-side,
 * but delivered to the authenticated client for WS connection).
 */
export function getLiveWsUrl() {
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${config.gemini.apiKey}`;
}
