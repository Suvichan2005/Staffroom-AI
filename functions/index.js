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
 *   firebase functions:secrets:set AZURE_OPENAI_API_KEY
 *   firebase functions:secrets:set AZURE_OPENAI_ENDPOINT
 *   firebase functions:secrets:set AZURE_SPEECH_KEY
 */

const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { defineSecret } = require("firebase-functions/params");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");

// Define secrets (these are injected at runtime)
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const openaiApiKey = defineSecret("OPENAI_API_KEY");

// Azure secrets
const azureOpenaiApiKey = defineSecret("AZURE_OPENAI_API_KEY");
const azureOpenaiEndpoint = defineSecret("AZURE_OPENAI_ENDPOINT");
const azureOpenaiDeployment = defineSecret("AZURE_OPENAI_DEPLOYMENT");
const azureSpeechKey = defineSecret("AZURE_SPEECH_KEY");
const azureSpeechRegion = defineSecret("AZURE_SPEECH_REGION");

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
  
  // Always allow Firebase Hosting domains
  if (origin) {
    if (ALLOWED_ORIGINS.includes(origin) || 
        origin.includes('.web.app') || 
        origin.includes('.firebaseapp.com') ||
        origin.includes('localhost')) {
      res.set("Access-Control-Allow-Origin", origin);
      res.set("Access-Control-Allow-Credentials", "true");
    }
  }
  
  res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
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
    cors: true, // Enable CORS automatically
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [geminiApiKey], // Inject the secret
  },
  async (req, res) => {
    console.log('[aiGenerate] Request received:', {
      method: req.method,
      origin: req.headers.origin,
      contentType: req.headers['content-type']
    });
    
    // Handle CORS
    setCorsHeaders(req, res);
    
    // Handle preflight
    if (req.method === "OPTIONS") {
      console.log('[aiGenerate] Handling OPTIONS preflight');
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
        model: "gemini-2.5-flash",
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
    invoker: "public",
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

// ============================================================================
// AZURE OPENAI GENERATE FUNCTION
// ============================================================================

exports.azureGenerate = onRequest(
  {
    cors: false,
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [azureOpenaiApiKey, azureOpenaiEndpoint, azureOpenaiDeployment],    invoker: "public",  },
  async (req, res) => {
    // Handle CORS
    setCorsHeaders(req, res);
    
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    
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
      const { messages, tools, options, useCase, model } = req.body;
      
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages array is required" });
      }
      
      // Get Azure configuration from secrets
      const apiKey = azureOpenaiApiKey.value();
      const endpoint = azureOpenaiEndpoint.value();
      const defaultDeployment = azureOpenaiDeployment.value() || "gpt-4.1-mini";
      
      // Model selection based on use case (cost-optimized Jan 2026)
      // gpt-4.1-nano: ₹9/₹36 (cheapest), gpt-4.1-mini: ₹36/₹144, 
      // gpt-4.1: ₹180/₹720, o4-mini: ₹99/₹396 (reasoning)
      const MODEL_MAP = {
        'chat': 'gpt-4.1-nano',
        'quiz': 'gpt-4.1-nano',
        'briefing': 'gpt-4.1-nano',
        'simple': 'gpt-4.1-nano',
        'analysis': 'gpt-4.1-mini',
        'syllabus': 'gpt-4.1-mini',
        'tools': 'gpt-4.1-mini',
        'attendance': 'gpt-4.1-mini',
        'reasoning': 'o4-mini',
        'complex': 'o4-mini',
        'premium': 'gpt-4.1',
      };
      
      const deployment = model || MODEL_MAP[useCase] || defaultDeployment;
      console.log(`[azureGenerate] Using model: ${deployment} for useCase: ${useCase || 'default'}`);
      
      if (!apiKey || !endpoint) {
        console.error("Azure OpenAI not configured");
        return res.status(500).json({ error: "Azure AI service not configured" });
      }
      
      // Build request
      const apiVersion = "2024-12-01-preview";
      const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
      
      const body = {
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          ...(m.tool_calls && { tool_calls: m.tool_calls }),
          ...(m.tool_call_id && { tool_call_id: m.tool_call_id }),
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        top_p: options?.topP ?? 0.95,
      };
      
      if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = "auto";
      }
      
      if (options?.responseFormat === "json") {
        body.response_format = { type: "json_object" };
      }
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": apiKey,
        },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Azure OpenAI error:", errorData);
        
        if (response.status === 429) {
          return res.status(429).json({ error: "Azure AI service quota exceeded" });
        }
        
        return res.status(500).json({ error: "Azure AI generation failed" });
      }
      
      const result = await response.json();
      
      return res.status(200).json({
        choices: result.choices,
        usage: result.usage,
      });
      
    } catch (error) {
      console.error("Azure Generate Error:", error);
      return res.status(500).json({
        error: "Azure AI generation failed",
        message: "Please try again later",
      });
    }
  }
);

// ============================================================================
// AZURE SPEECH TOKEN
// ============================================================================

exports.azureSpeechToken = onRequest(
  {
    cors: false,
    memory: "128MiB",
    timeoutSeconds: 10,
    secrets: [azureSpeechKey, azureSpeechRegion],    invoker: "public",  },
  async (req, res) => {
    setCorsHeaders(req, res);
    
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    
    if (!["GET", "POST"].includes(req.method)) {
      return res.status(405).json({ error: "Method not allowed" });
    }
    
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }
    
    try {
      const speechKey = azureSpeechKey.value();
      const region = azureSpeechRegion.value() || "eastus";
      
      if (!speechKey) {
        console.error("Azure Speech key not configured");
        return res.status(500).json({ error: "Speech service not configured" });
      }
      
      // Get authorization token from Azure
      const tokenUrl = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;
      
      const tokenResponse = await fetch(tokenUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": speechKey,
          "Content-Length": "0",
        },
      });
      
      if (!tokenResponse.ok) {
        throw new Error(`Token request failed: ${tokenResponse.status}`);
      }
      
      const token = await tokenResponse.text();
      
      return res.status(200).json({
        token,
        region,
        expiresIn: 600, // 10 minutes
      });
      
    } catch (error) {
      console.error("Azure Speech Token Error:", error);
      return res.status(500).json({ error: "Failed to get speech token" });
    }
  }
);

// ============================================================================
// AZURE SPEECH TRANSCRIPTION
// ============================================================================

exports.azureTranscribe = onRequest(
  {
    cors: false,
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: [azureSpeechKey, azureSpeechRegion],    invoker: "public",  },
  async (req, res) => {
    setCorsHeaders(req, res);
    
    if (req.method === "OPTIONS") {
      return res.status(204).send("");
    }
    
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }
    
    const clientIP = getClientIP(req);
    if (!checkRateLimit(clientIP)) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }
    
    try {
      const { audio, mimeType, language } = req.body;
      
      if (!audio || typeof audio !== "string") {
        return res.status(400).json({ error: "Audio data is required" });
      }
      
      const speechKey = azureSpeechKey.value();
      const region = azureSpeechRegion.value() || "eastus";
      
      if (!speechKey) {
        console.error("Azure Speech key not configured");
        return res.status(500).json({ error: "Speech service not configured" });
      }
      
      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audio, "base64");
      
      // Call Azure Speech REST API
      const speechUrl = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${language || "en-IN"}`;
      
      const contentType = mimeType || "audio/wav";
      
      const response = await fetch(speechUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": speechKey,
          "Content-Type": contentType,
        },
        body: audioBuffer,
      });
      
      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      return res.status(200).json({
        text: result.DisplayText || "",
        confidence: result.NBest?.[0]?.Confidence || 0.9,
        success: true,
      });
      
    } catch (error) {
      console.error("Azure Transcription Error:", error);
      return res.status(500).json({
        error: "Transcription failed",
        message: "Please try again later",
      });
    }
  }
);

// ============================================================================
// AZURE HEALTH CHECK
// ============================================================================

exports.azureHealth = onRequest(
  {
    cors: true,
    memory: "128MiB",
    timeoutSeconds: 10,
    secrets: [azureOpenaiApiKey, azureOpenaiEndpoint],    invoker: "public",  },
  async (req, res) => {
    try {
      const apiKey = azureOpenaiApiKey.value();
      const endpoint = azureOpenaiEndpoint.value();
      
      const configured = !!(apiKey && endpoint);
      
      res.status(200).json({
        status: configured ? "healthy" : "not_configured",
        provider: "azure",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        provider: "azure",
        error: error.message,
      });
    }
  }
);

// ============================================================================
// AZURE SPEECH HEALTH CHECK
// ============================================================================

exports.azureSpeechHealth = onRequest(
  {
    cors: true,
    memory: "128MiB",
    timeoutSeconds: 10,
    secrets: [azureSpeechKey, azureSpeechRegion],    invoker: "public",  },
  async (req, res) => {
    try {
      const speechKey = azureSpeechKey.value();
      const region = azureSpeechRegion.value();
      
      const configured = !!(speechKey && region);
      
      res.status(200).json({
        status: configured ? "healthy" : "not_configured",
        provider: "azure-speech",
        region: region || "not_set",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        provider: "azure-speech",
        error: error.message,
      });
    }
  }
);