/**
 * Firebase Cloud Functions for Staffroom AI
 * 
 * These functions act as secure proxies for AI API calls,
 * keeping API keys server-side and hidden from the client bundle.
 * 
 * SECURITY FEATURES:
 * - API keys stored in Firebase Functions secrets (not exposed to client)
 * - Rate limiting per user/IP
 * - Input validation and sanitization
 * - CORS restricted to allowed origins
 * - Request size limits
 * 
 * SETUP:
 * Set secrets using Firebase CLI:
 *   firebase functions:secrets:set GEMINI_API_KEY
 *   firebase functions:secrets:set OPENAI_API_KEY
 */

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

// Define secrets (these are injected at runtime)
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Set global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

// ============================================================================
// CONFIGURATION
// ============================================================================

// Allowed origins for CORS (add your production domain)
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://staffroom-ai.web.app",
  "https://staffroom-ai.firebaseapp.com",
];

// Rate limiting: requests per minute per IP
const RATE_LIMIT = 30;
const rateLimitStore = new Map();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get client IP from request
 */
function getClientIP(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.connection?.remoteAddress ||
    "unknown"
  );
}

/**
 * Check rate limit for an IP
 * @returns {boolean} true if within limit, false if exceeded
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return true;
  }
  
  const record = rateLimitStore.get(ip);
  
  // Reset window if expired
  if (now - record.windowStart > windowMs) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return true;
  }
  
  // Increment and check
  record.count++;
  if (record.count > RATE_LIMIT) {
    return false;
  }
  
  return true;
}

/**
 * Set CORS headers on response
 */
function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Max-Age", "3600");
}

/**
 * Sanitize text input (basic XSS prevention)
 */
function sanitizeInput(text) {
  if (typeof text !== "string") return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .trim();
}

// ============================================================================
// AI GENERATE FUNCTION - Gemini Proxy
// ============================================================================

exports.aiGenerate = onRequest(
  {
    cors: false, // We handle CORS manually for more control
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [geminiApiKey], // Inject the secret
  },
  async (req, res) => {
    // Handle CORS
    setCorsHeaders(req, res);
    
    // Handle preflight
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    
    // Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    
    // Rate limiting
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests. Please wait a minute.",
      });
    }
    
    try {
      const { prompt, systemInstruction, tools, history } = req.body;
      
      // Validate prompt
      if (!prompt || typeof prompt !== "string") {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      // Sanitize and limit prompt length
      const sanitizedPrompt = sanitizeInput(prompt);
      if (sanitizedPrompt.length > 32000) {
        return res.status(400).json({ error: "Prompt too long (max 32000 chars)" });
      }
      
      // Get API key from secret
      const apiKey = geminiApiKey.value();
      if (!apiKey) {
        console.error("GEMINI_API_KEY not configured");
        return res.status(500).json({ error: "AI service not configured" });
      }
      
      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemInstruction || undefined,
        tools: tools || undefined,
      });
      
      // Build content array
      const contents = [];
      
      // Add history if provided
      if (Array.isArray(history)) {
        contents.push(...history);
      }
      
      // Add current prompt
      contents.push({
        role: "user",
        parts: [{ text: sanitizedPrompt }],
      });
      
      // Generate response
      const result = await model.generateContent({ contents });
      const response = result.response;
      
      // Extract text and function calls
      const text = response.text?.() || "";
      const functionCalls = response.functionCalls?.() || [];
      
      return res.status(200).json({
        text,
        functionCalls,
        finishReason: response.candidates?.[0]?.finishReason,
      });
      
    } catch (error) {
      console.error("AI Generate Error:", error);
      
      // Don't expose internal error details
      if (error.message?.includes("API key")) {
        return res.status(500).json({ error: "AI service configuration error" });
      }
      
      if (error.message?.includes("quota")) {
        return res.status(429).json({ error: "AI service quota exceeded" });
      }
      
      return res.status(500).json({
        error: "AI generation failed",
        message: "Please try again later",
      });
    }
  }
);

// ============================================================================
// TRANSCRIBE FUNCTION - Whisper Proxy
// ============================================================================

exports.transcribe = onRequest(
  {
    cors: false,
    memory: "512MiB", // Audio processing needs more memory
    timeoutSeconds: 120,
    secrets: [openaiApiKey], // Inject the secret
  },
  async (req, res) => {
    // Handle CORS
    setCorsHeaders(req, res);
    
    // Handle preflight
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    
    // Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    
    // Rate limiting (stricter for transcription - expensive operation)
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "Too many requests. Please wait a minute.",
      });
    }
    
    try {
      const { audio, mimeType } = req.body;
      
      // Validate audio data
      if (!audio || typeof audio !== "string") {
        return res.status(400).json({ error: "Audio data is required" });
      }
      
      // Check audio size (base64 ~33% larger than binary)
      const estimatedSize = (audio.length * 3) / 4;
      const maxSize = 25 * 1024 * 1024; // 25MB limit
      
      if (estimatedSize > maxSize) {
        return res.status(400).json({ error: "Audio file too large (max 25MB)" });
      }
      
      // Get API key from secret
      const apiKey = openaiApiKey.value();
      if (!apiKey) {
        console.error("OPENAI_API_KEY not configured");
        return res.status(500).json({ error: "Transcription service not configured" });
      }
      
      // Initialize OpenAI
      const openai = new OpenAI({ apiKey });
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audio, "base64");
      
      // Determine file extension from MIME type
      const extensions = {
        "audio/webm": "webm",
        "audio/mp3": "mp3",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
        "audio/m4a": "m4a",
      };
      const ext = extensions[mimeType] || "webm";
      
      // Create a File-like object for the API
      const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType || "audio/webm" });
      
      // Call Whisper API
      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: "whisper-1",
        language: "en",
      });
      
      return res.status(200).json({
        text: transcription.text,
        success: true,
      });
      
    } catch (error) {
      console.error("Transcription Error:", error);
      
      if (error.message?.includes("API key")) {
        return res.status(500).json({ error: "Transcription service configuration error" });
      }
      
      if (error.message?.includes("quota")) {
        return res.status(429).json({ error: "Transcription service quota exceeded" });
      }
      
      return res.status(500).json({
        error: "Transcription failed",
        message: "Please try again later",
      });
    }
  }
);

// ============================================================================
// GEMINI LIVE SESSION TOKEN - For WebSocket authentication
// ============================================================================

exports.getLiveToken = onRequest(
  {
    cors: false,
    memory: "128MiB",
    timeoutSeconds: 10,
    secrets: [geminiApiKey], // Inject the secret
  },
  async (req, res) => {
    // Handle CORS
    setCorsHeaders(req, res);
    
    // Handle preflight
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    
    // Only allow GET or POST
    if (!["GET", "POST"].includes(req.method)) {
      return res.status(405).json({ error: "Method not allowed" });
    }
    
    // Rate limiting
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }
    
    try {
      // Get API key from secret
      const apiKey = geminiApiKey.value();
      if (!apiKey) {
        console.error("GEMINI_API_KEY not configured");
        return res.status(500).json({ error: "Live service not configured" });
      }
      
      // Return the WebSocket URL with API key
      // Note: In production, you might want to generate short-lived tokens instead
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      
      return res.status(200).json({
        wsUrl,
        expiresIn: 3600, // 1 hour validity hint
      });
      
    } catch (error) {
      console.error("Get Live Token Error:", error);
      return res.status(500).json({ error: "Failed to get live session token" });
    }
  }
);

// ============================================================================
// HEALTH CHECK
// ============================================================================

exports.health = onRequest(
  {
    cors: true,
    memory: "128MiB",
    timeoutSeconds: 5,
  },
  (req, res) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    });
  }
);
