// ─────────────────────────────────────────────────────────────
// services/aiRouter.js — AI provider routing (Google GenAI SDK)
//
// Modernized to @google/genai SDK with stable Gemini 3.8 models:
// • Text / Fast / Default: gemini-3.8-flash
// • Complex / In-depth:    gemini-3.8-pro
// • Live Audio WebSocket:  gemini-3.8-live
//
// All keys are loaded from process.env, never from the client.
// ─────────────────────────────────────────────────────────────

import { GoogleGenAI } from '@google/genai';
import config from '../config/env.js';

// ── Lazy singleton ──────────────────────────────────────────

let _aiClient = null;

function getAIClient() {
  if (!_aiClient) {
    _aiClient = new GoogleGenAI({ apiKey: config.gemini.apiKey });
  }
  return _aiClient;
}

// ── Model tiers (Targeting stable Gemini 3.8 generation) ──────

export const MODEL_MAP = {
  fast:    'gemini-3.8-flash',
  default: 'gemini-3.8-flash',
  complex: 'gemini-3.8-pro',
};

export const LIVE_MODEL = 'gemini-3.8-live';

// ── Generate ────────────────────────────────────────────────

async function callGemini({ messages, tools, systemInstruction, type, toolConfig, generationConfig }) {
  const modelId = MODEL_MAP[type] || MODEL_MAP.default;
  const ai = getAIClient();

  // Convert incoming messages format to Gemini contents structure
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : m.role,
    parts: Array.isArray(m.parts) ? m.parts : [{ text: m.content || '' }],
  }));

  const genConfig = {
    temperature: generationConfig?.temperature ?? 0.7,
    maxOutputTokens: generationConfig?.maxOutputTokens ?? 4096,
  };

  if (systemInstruction) genConfig.systemInstruction = systemInstruction;
  if (tools) genConfig.tools = tools;
  if (toolConfig) genConfig.toolConfig = toolConfig;

  const response = await ai.models.generateContent({
    model: modelId,
    contents,
    config: genConfig,
  });

  return {
    provider: 'gemini',
    model: modelId,
    text: response.text || '',
    functionCalls: response.functionCalls || [],
    finishReason: response.candidates?.[0]?.finishReason || 'STOP',
  };
}

// ── Vision / document parsing ───────────────────────────────

/**
 * Call Gemini with inline image data (vision / document parsing).
 */
async function callGeminiVision({ prompt, imageBase64, mimeType, systemInstruction, generationConfig }) {
  const modelId = MODEL_MAP.default;
  const ai = getAIClient();

  const parts = [
    { text: prompt },
    { inlineData: { mimeType, data: imageBase64 } },
  ];

  const genConfig = {
    temperature: generationConfig?.temperature ?? 0.1,
    maxOutputTokens: generationConfig?.maxOutputTokens ?? 25000,
  };

  if (systemInstruction) genConfig.systemInstruction = systemInstruction;

  const response = await ai.models.generateContent({
    model: modelId,
    contents: [{ parts }],
    config: genConfig,
  });

  return {
    provider: 'gemini',
    model: modelId,
    text: response.text || '',
    functionCalls: response.functionCalls || [],
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
  const ai = getAIClient();

  const genConfig = {
    temperature: generationConfig?.temperature ?? 0.1,
    maxOutputTokens: generationConfig?.maxOutputTokens ?? 16384,
  };

  if (systemInstruction) genConfig.systemInstruction = systemInstruction;
  if (tools) genConfig.tools = tools;
  if (toolConfig) genConfig.toolConfig = toolConfig;

  const response = await ai.models.generateContent({
    model: modelId,
    contents,
    config: genConfig,
  });

  return {
    provider: 'gemini',
    model: modelId,
    text: response.text || '',
    functionCalls: response.functionCalls || [],
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
    gemini: { available: !!config.gemini.apiKey, label: 'Gemini (3.8 Flash / Pro)' },
  };
}

/**
 * Get the Gemini Live WebSocket URL (key stays server-side,
 * but delivered to the authenticated client for WS connection).
 */
export function getLiveWsUrl() {
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${config.gemini.apiKey}`;
}
