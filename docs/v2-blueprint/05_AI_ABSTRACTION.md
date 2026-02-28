# SECTION E — AI PROVIDER-AGNOSTIC DESIGN

> **Purpose:** Define a strict AI abstraction layer that enables hot-swapping providers  
> **Requirement:** Changing from Gemini to OpenAI must require only configuration changes

---

## 1. Design Goals

1. **Provider Independence:** Business logic never imports provider SDKs directly
2. **Unified Interface:** Same API for text, streaming, structured output, voice
3. **Cost Awareness:** Automatic routing to cost-appropriate models
4. **Graceful Degradation:** Fallback chain when primary provider fails
5. **Observability:** Track costs, latency, and errors per provider
6. **Offline Queue:** AI requests work offline and sync when connected

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AI ABSTRACTION ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                        APPLICATION LAYER                                │ │
│  │                                                                         │ │
│  │   useAI() hook  │  AttendanceParser  │  QuizGenerator  │  ChatAgent   │ │
│  │                                                                         │ │
│  │   These components know NOTHING about Gemini, OpenAI, Anthropic        │ │
│  └─────────────────────────────────────────────────────────────────────┬──┘ │
│                                                                        │    │
│  ┌─────────────────────────────────────────────────────────────────────▼──┐ │
│  │                        AI GATEWAY (The Abstraction)                    │ │
│  │                                                                         │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │ │
│  │  │ Input       │  │ Provider    │  │ Output      │  │ Offline     │   │ │
│  │  │ Normalizer  │──│ Router      │──│ Normalizer  │──│ Queue       │   │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘   │ │
│  │                         │                                              │ │
│  │  ┌─────────────────────┴──────────────────────────────────┐           │ │
│  │  │                    Circuit Breaker                      │           │ │
│  │  │  Failure tracking  │  Cooldown  │  Fallback chain       │           │ │
│  │  └────────────────────────────────────────────────────────┘           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                         │                                   │
│  ┌──────────────────────────────────────┴───────────────────────────────┐  │
│  │                        PROVIDER ADAPTERS                              │  │
│  │                                                                        │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐          │  │
│  │  │  Gemini   │  │  OpenAI   │  │ Anthropic │  │   Mock    │          │  │
│  │  │  Adapter  │  │  Adapter  │  │  Adapter  │  │  Adapter  │          │  │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘          │  │
│  │                                                                        │  │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐                         │  │
│  │  │ Deepgram  │  │ AssemblyAI│  │Web Speech │  (STT Adapters)         │  │
│  │  │  Adapter  │  │  Adapter  │  │  Adapter  │                         │  │
│  │  └───────────┘  └───────────┘  └───────────┘                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Interfaces

### 3.1 AI Gateway Interface

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// CORE AI GATEWAY INTERFACE - The only interface application code should use
// ═══════════════════════════════════════════════════════════════════════════

interface AIGateway {
  // ─────────────────────────────────────────────────────────────────────────
  // Text Generation
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Generate a text response (non-streaming)
   */
  generate(options: GenerateOptions): Promise<GenerateResult>;
  
  /**
   * Generate a streaming text response
   */
  stream(options: GenerateOptions): AsyncGenerator<StreamChunk, void, unknown>;
  
  /**
   * Generate a structured output matching a schema
   */
  generateStructured<T>(options: StructuredOptions<T>): Promise<T>;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Tool Calling
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Generate with function/tool calling capability
   */
  generateWithTools(options: ToolOptions): Promise<ToolResult>;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Voice / Audio
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Transcribe audio to text
   */
  transcribe(audio: AudioInput): Promise<TranscriptResult>;
  
  /**
   * Create a real-time voice session (bidirectional streaming)
   */
  createVoiceSession(config: VoiceSessionConfig): VoiceSession;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Configuration & Observability
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Get current provider configuration
   */
  getConfig(): GatewayConfig;
  
  /**
   * Switch active provider at runtime
   */
  setProvider(providerId: ProviderId): void;
  
  /**
   * Get usage metrics
   */
  getUsage(options: UsageQueryOptions): Promise<UsageMetrics>;
}
```

### 3.2 Input/Output Types

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// INPUT TYPES - Normalized across all providers
// ═══════════════════════════════════════════════════════════════════════════

interface GenerateOptions {
  // Required
  prompt: string;
  
  // Optional context
  systemPrompt?: string;
  messages?: Message[];  // For chat history
  
  // Generation parameters
  temperature?: number;      // 0-2, default 0.7
  maxTokens?: number;        // Max output tokens
  stopSequences?: string[];  // Stop generation at these
  
  // Task routing
  useCase?: UseCase;         // 'chat' | 'attendance' | 'quiz' | 'analysis'
  tier?: ModelTier;          // 'fast' | 'standard' | 'pro' | 'reasoning'
  
  // Reliability
  useFallback?: boolean;     // Enable fallback chain, default true
  timeout?: number;          // Timeout in ms
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image' | 'audio';
  text?: string;
  imageUrl?: string;
  audioData?: ArrayBuffer;
  mimeType?: string;
}

interface ToolOptions extends GenerateOptions {
  tools: ToolDefinition[];
  toolChoice?: 'auto' | 'required' | { name: string };
}

interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
}

interface AudioInput {
  data: ArrayBuffer | Blob;
  mimeType: 'audio/wav' | 'audio/mp3' | 'audio/webm' | 'audio/pcm';
  sampleRate?: number;
  language?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT TYPES - Normalized across all providers
// ═══════════════════════════════════════════════════════════════════════════

interface GenerateResult {
  text: string;
  
  // Metadata
  usage: UsageInfo;
  provider: ProviderId;
  model: string;
  latencyMs: number;
  
  // For debugging
  finishReason: 'stop' | 'length' | 'tool_call' | 'content_filter';
}

interface StreamChunk {
  text: string;         // Incremental text
  done: boolean;        // Is this the final chunk?
  usage?: UsageInfo;    // Only on final chunk
}

interface ToolResult extends GenerateResult {
  toolCalls: ToolCall[];
}

interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

interface TranscriptResult {
  text: string;
  confidence: number;           // 0-1
  words?: WordTiming[];         // Word-level timestamps
  language?: string;            // Detected language
  latencyMs: number;
  provider: ProviderId;
}

interface WordTiming {
  word: string;
  start: number;    // Seconds
  end: number;      // Seconds
  confidence: number;
}

interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
}
```

### 3.3 Voice Session Interface

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// VOICE SESSION - For real-time bidirectional voice interaction
// ═══════════════════════════════════════════════════════════════════════════

interface VoiceSession {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): void;
  
  // Audio streaming
  sendAudio(chunk: ArrayBuffer): void;
  
  // Configuration
  updateConfig(config: Partial<VoiceSessionConfig>): void;
  
  // Events
  on(event: 'transcript', handler: (t: TranscriptEvent) => void): void;
  on(event: 'response', handler: (r: ResponseEvent) => void): void;
  on(event: 'toolCall', handler: (t: ToolCallEvent) => void): void;
  on(event: 'error', handler: (e: ErrorEvent) => void): void;
  on(event: 'status', handler: (s: StatusEvent) => void): void;
  
  // State
  getStatus(): SessionStatus;
  getTranscript(): string;  // Full accumulated transcript
}

interface VoiceSessionConfig {
  // System context
  systemPrompt: string;
  
  // Tools available during voice
  tools?: ToolDefinition[];
  
  // Audio settings
  inputFormat: 'pcm16' | 'opus';
  sampleRate: 16000 | 24000 | 48000;
  
  // Behavior
  language?: string;               // 'en-IN', 'hi-IN', etc.
  interimResults?: boolean;        // Show partial transcripts
  endpointing?: 'auto' | number;   // Silence detection in ms
}

interface TranscriptEvent {
  text: string;
  isFinal: boolean;
  confidence: number;
}

interface ToolCallEvent {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  confidence: number;
}

type SessionStatus = 'connecting' | 'connected' | 'streaming' | 'processing' | 'disconnected' | 'error';
```

---

## 4. Provider Adapter Pattern

### 4.1 Base Adapter Interface

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER ADAPTER - Each provider implements this interface
// ═══════════════════════════════════════════════════════════════════════════

interface AIProviderAdapter {
  // Identification
  readonly id: ProviderId;
  readonly name: string;
  readonly supportedFeatures: FeatureSet;
  
  // Health check
  isAvailable(): Promise<boolean>;
  
  // Core operations (may throw if not supported)
  generate(options: InternalGenerateOptions): Promise<GenerateResult>;
  stream(options: InternalGenerateOptions): AsyncGenerator<StreamChunk>;
  
  // Optional capabilities
  generateStructured?<T>(options: InternalStructuredOptions<T>): Promise<T>;
  generateWithTools?(options: InternalToolOptions): Promise<ToolResult>;
  transcribe?(audio: AudioInput): Promise<TranscriptResult>;
  createVoiceSession?(config: VoiceSessionConfig): VoiceSession;
}

interface FeatureSet {
  textGeneration: boolean;
  streaming: boolean;
  structuredOutput: boolean;
  toolCalling: boolean;
  imageInput: boolean;
  audioInput: boolean;
  voiceSession: boolean;
}

type ProviderId = 
  | 'gemini-flash' 
  | 'gemini-pro' 
  | 'gpt-4o-mini' 
  | 'gpt-4o' 
  | 'claude-sonnet' 
  | 'claude-opus'
  | 'deepgram'
  | 'assemblyai'
  | 'webspeech'
  | 'mock';
```

### 4.2 Example: Gemini Adapter

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// GEMINI ADAPTER IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

class GeminiAdapter implements AIProviderAdapter {
  readonly id = 'gemini-flash' as const;
  readonly name = 'Google Gemini Flash';
  readonly supportedFeatures: FeatureSet = {
    textGeneration: true,
    streaming: true,
    structuredOutput: true,
    toolCalling: true,
    imageInput: true,
    audioInput: true,
    voiceSession: true,  // Gemini Live
  };
  
  private client: GoogleGenerativeAI;
  private model: GenerativeModel;
  
  constructor(config: GeminiConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.model = this.client.getGenerativeModel({ 
      model: config.model ?? 'gemini-2.5-flash' 
    });
  }
  
  async isAvailable(): Promise<boolean> {
    try {
      // Quick health check
      await this.model.generateContent('test');
      return true;
    } catch {
      return false;
    }
  }
  
  async generate(options: InternalGenerateOptions): Promise<GenerateResult> {
    const startTime = Date.now();
    
    // Transform normalized options to Gemini format
    const geminiRequest = this.transformRequest(options);
    
    const response = await this.model.generateContent(geminiRequest);
    const result = response.response;
    
    // Transform Gemini response to normalized format
    return {
      text: result.text(),
      usage: this.extractUsage(result),
      provider: this.id,
      model: 'gemini-2.5-flash',
      latencyMs: Date.now() - startTime,
      finishReason: this.mapFinishReason(result.candidates?.[0]?.finishReason),
    };
  }
  
  async *stream(options: InternalGenerateOptions): AsyncGenerator<StreamChunk> {
    const geminiRequest = this.transformRequest(options);
    const result = await this.model.generateContentStream(geminiRequest);
    
    let fullText = '';
    for await (const chunk of result.stream) {
      const text = chunk.text();
      fullText += text;
      yield { text, done: false };
    }
    
    yield { 
      text: '', 
      done: true, 
      usage: this.extractUsage(await result.response) 
    };
  }
  
  async generateWithTools(options: InternalToolOptions): Promise<ToolResult> {
    const geminiRequest = {
      ...this.transformRequest(options),
      tools: options.tools.map(t => this.transformTool(t)),
    };
    
    const response = await this.model.generateContent(geminiRequest);
    const result = response.response;
    const candidate = result.candidates?.[0];
    
    // Extract function calls
    const toolCalls = candidate?.content?.parts
      ?.filter(p => p.functionCall)
      ?.map(p => ({
        id: crypto.randomUUID(),
        name: p.functionCall!.name,
        arguments: p.functionCall!.args,
      })) ?? [];
    
    return {
      text: result.text() ?? '',
      toolCalls,
      usage: this.extractUsage(result),
      provider: this.id,
      model: 'gemini-2.5-flash',
      latencyMs: 0,
      finishReason: toolCalls.length > 0 ? 'tool_call' : 'stop',
    };
  }
  
  createVoiceSession(config: VoiceSessionConfig): VoiceSession {
    return new GeminiLiveSession(this.config, config);
  }
  
  // ... private helper methods
}
```

### 4.3 Example: OpenAI Adapter

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// OPENAI ADAPTER IMPLEMENTATION (abbreviated)
// ═══════════════════════════════════════════════════════════════════════════

class OpenAIAdapter implements AIProviderAdapter {
  readonly id = 'gpt-4o-mini' as const;
  readonly name = 'OpenAI GPT-4o Mini';
  readonly supportedFeatures: FeatureSet = {
    textGeneration: true,
    streaming: true,
    structuredOutput: true,
    toolCalling: true,
    imageInput: true,
    audioInput: false,  // Whisper is separate
    voiceSession: false,
  };
  
  private client: OpenAI;
  
  async generate(options: InternalGenerateOptions): Promise<GenerateResult> {
    const startTime = Date.now();
    
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: this.transformMessages(options),
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens,
      stop: options.stopSequences,
    });
    
    const choice = response.choices[0];
    
    return {
      text: choice.message.content ?? '',
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
        estimatedCostUsd: this.calculateCost(response.usage),
      },
      provider: this.id,
      model: 'gpt-4o-mini',
      latencyMs: Date.now() - startTime,
      finishReason: this.mapFinishReason(choice.finish_reason),
    };
  }
  
  // ... streaming, tool calling implementations
}
```

---

## 5. Provider Router & Circuit Breaker

### 5.1 Router Implementation

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// PROVIDER ROUTER - Selects appropriate provider based on task and health
// ═══════════════════════════════════════════════════════════════════════════

interface RouteConfig {
  // Map use cases to preferred providers
  useCaseRouting: Record<UseCase, ProviderId[]>;
  
  // Map tiers to providers
  tierRouting: Record<ModelTier, ProviderId>;
  
  // Fallback chain
  fallbackChain: ProviderId[];
  
  // Circuit breaker settings
  circuitBreaker: {
    failureThreshold: number;    // Failures before open
    resetTimeoutMs: number;      // Time before retry
    halfOpenMaxCalls: number;    // Calls in half-open state
  };
}

class ProviderRouter {
  private adapters: Map<ProviderId, AIProviderAdapter>;
  private circuitState: Map<ProviderId, CircuitState>;
  private config: RouteConfig;
  
  selectProvider(options: GenerateOptions): ProviderId {
    // 1. Get candidates based on use case or tier
    let candidates: ProviderId[];
    
    if (options.useCase) {
      candidates = this.config.useCaseRouting[options.useCase];
    } else if (options.tier) {
      candidates = [this.config.tierRouting[options.tier]];
    } else {
      candidates = this.config.fallbackChain;
    }
    
    // 2. Filter by circuit breaker state
    candidates = candidates.filter(id => this.isCircuitClosed(id));
    
    // 3. Return first available or throw
    if (candidates.length === 0) {
      throw new AllProvidersUnavailableError();
    }
    
    return candidates[0];
  }
  
  async executeWithFallback<T>(
    operation: (adapter: AIProviderAdapter) => Promise<T>,
    options: GenerateOptions
  ): Promise<T> {
    const candidates = this.getCandidates(options);
    
    for (const providerId of candidates) {
      const adapter = this.adapters.get(providerId)!;
      
      try {
        const result = await operation(adapter);
        this.recordSuccess(providerId);
        return result;
      } catch (error) {
        this.recordFailure(providerId, error);
        console.warn(`Provider ${providerId} failed, trying next...`);
        continue;
      }
    }
    
    throw new AllProvidersFailedError();
  }
  
  private isCircuitClosed(providerId: ProviderId): boolean {
    const state = this.circuitState.get(providerId);
    if (!state) return true;
    
    switch (state.status) {
      case 'closed': return true;
      case 'open': {
        // Check if enough time passed to try again
        if (Date.now() - state.lastFailure > this.config.circuitBreaker.resetTimeoutMs) {
          this.circuitState.set(providerId, { ...state, status: 'half-open' });
          return true;
        }
        return false;
      }
      case 'half-open': {
        // Limited calls in half-open
        return state.halfOpenCalls < this.config.circuitBreaker.halfOpenMaxCalls;
      }
    }
  }
  
  private recordFailure(providerId: ProviderId, error: Error): void {
    const state = this.circuitState.get(providerId) ?? {
      status: 'closed' as const,
      failures: 0,
      lastFailure: 0,
      halfOpenCalls: 0,
    };
    
    state.failures++;
    state.lastFailure = Date.now();
    
    if (state.failures >= this.config.circuitBreaker.failureThreshold) {
      state.status = 'open';
      console.error(`Circuit opened for ${providerId} after ${state.failures} failures`);
    }
    
    this.circuitState.set(providerId, state);
  }
  
  private recordSuccess(providerId: ProviderId): void {
    // Reset circuit on success
    this.circuitState.set(providerId, {
      status: 'closed',
      failures: 0,
      lastFailure: 0,
      halfOpenCalls: 0,
    });
  }
}

interface CircuitState {
  status: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: number;
  halfOpenCalls: number;
}
```

---

## 6. Cost-Aware Routing

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// COST CONFIGURATION - Prices as of January 2026
// ═══════════════════════════════════════════════════════════════════════════

const PROVIDER_PRICING: Record<ProviderId, PricingInfo> = {
  'gemini-flash': {
    inputPer1M: 0.15,
    outputPer1M: 0.60,
    tier: 'fast',
  },
  'gemini-pro': {
    inputPer1M: 1.25,
    outputPer1M: 5.00,
    tier: 'standard',
  },
  'gpt-4o-mini': {
    inputPer1M: 0.15,
    outputPer1M: 0.60,
    tier: 'fast',
  },
  'gpt-4o': {
    inputPer1M: 2.50,
    outputPer1M: 10.00,
    tier: 'pro',
  },
  'claude-sonnet': {
    inputPer1M: 3.00,
    outputPer1M: 15.00,
    tier: 'pro',
  },
  'deepgram': {
    perMinute: 0.0043,
    tier: 'stt',
  },
};

// Use case → tier mapping
const USE_CASE_TIER: Record<UseCase, ModelTier> = {
  'chat': 'fast',
  'attendance': 'fast',
  'quiz': 'fast',
  'summary': 'fast',
  'analysis': 'standard',
  'syllabus': 'standard',
  'reasoning': 'pro',
  'complex': 'pro',
};

// Tier → default provider
const TIER_PROVIDER: Record<ModelTier, ProviderId> = {
  'fast': 'gemini-flash',
  'standard': 'gemini-pro',
  'pro': 'claude-sonnet',
  'reasoning': 'claude-sonnet',
  'stt': 'deepgram',
};

type UseCase = 'chat' | 'attendance' | 'quiz' | 'summary' | 'analysis' | 'syllabus' | 'reasoning' | 'complex';
type ModelTier = 'fast' | 'standard' | 'pro' | 'reasoning' | 'stt';
```

---

## 7. Offline Queue

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// OFFLINE QUEUE - Store AI requests when offline, process when online
// ═══════════════════════════════════════════════════════════════════════════

interface QueuedRequest {
  id: string;
  timestamp: number;
  type: 'generate' | 'transcribe' | 'tool';
  options: GenerateOptions | AudioInput | ToolOptions;
  callback?: string;  // Name of function to call with result
  retries: number;
  maxRetries: number;
}

class OfflineAIQueue {
  private db: IDBDatabase;
  private readonly STORE_NAME = 'ai_queue';
  
  async enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>): Promise<string> {
    const id = crypto.randomUUID();
    const queuedRequest: QueuedRequest = {
      ...request,
      id,
      timestamp: Date.now(),
      retries: 0,
    };
    
    await this.saveToStore(queuedRequest);
    
    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
    
    return id;
  }
  
  async processQueue(): Promise<void> {
    if (!navigator.onLine) return;
    
    const pending = await this.getPendingRequests();
    
    for (const request of pending) {
      try {
        const result = await this.processRequest(request);
        
        // Call callback if specified
        if (request.callback) {
          await this.invokeCallback(request.callback, result);
        }
        
        await this.removeFromStore(request.id);
      } catch (error) {
        request.retries++;
        
        if (request.retries >= request.maxRetries) {
          await this.moveToDeadLetter(request, error);
        } else {
          await this.saveToStore(request);
        }
      }
    }
  }
  
  // Listen for online event
  init(): void {
    window.addEventListener('online', () => this.processQueue());
  }
}
```

---

## 8. Lifecycle Diagrams

### 8.1 Text Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     TEXT GENERATION LIFECYCLE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Application calls gateway.generate(options)                             │
│     │                                                                        │
│     ▼                                                                        │
│  2. Input Normalizer validates and transforms options                       │
│     │                                                                        │
│     ▼                                                                        │
│  3. Router selects provider based on useCase/tier                           │
│     │                                                                        │
│     ├── Circuit open? ──► Try next provider in fallback chain              │
│     │                                                                        │
│     ▼                                                                        │
│  4. Adapter transforms to provider-specific format                          │
│     │                                                                        │
│     ▼                                                                        │
│  5. API call to provider                                                    │
│     │                                                                        │
│     ├── Success ──► Record success, reset circuit                          │
│     │                                                                        │
│     └── Failure ──► Record failure, try fallback if available              │
│                                                                              │
│     ▼                                                                        │
│  6. Output Normalizer transforms response to standard format                │
│     │                                                                        │
│     ▼                                                                        │
│  7. Metrics recorded (latency, tokens, cost)                                │
│     │                                                                        │
│     ▼                                                                        │
│  8. Result returned to application                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.2 Voice Session Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        VOICE SESSION LIFECYCLE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Application calls gateway.createVoiceSession(config)                    │
│     │                                                                        │
│     ▼                                                                        │
│  2. Select STT provider (Deepgram > WebSpeech)                              │
│     │                                                                        │
│     ▼                                                                        │
│  3. Create WebSocket connection                                             │
│     │                                                                        │
│     ▼                                                                        │
│  4. Send session configuration (system prompt, tools)                       │
│     │                                                                        │
│     ▼                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     STREAMING LOOP                                   │    │
│  │                                                                      │    │
│  │  Browser ──PCM Audio──► Provider                                    │    │
│  │                                                                      │    │
│  │  Provider ──Transcript──► Application (interim results)             │    │
│  │  Provider ──ToolCall──► Application (execute & respond)             │    │
│  │  Provider ──Response──► Application (AI response text)              │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│     │                                                                        │
│     ▼                                                                        │
│  5. Session.disconnect() called or error                                    │
│     │                                                                        │
│     ▼                                                                        │
│  6. Cleanup: close WebSocket, release microphone                            │
│     │                                                                        │
│     ▼                                                                        │
│  7. Final transcript and metrics available                                  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Error Handling

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// ERROR TYPES - Normalized across providers
// ═══════════════════════════════════════════════════════════════════════════

class AIGatewayError extends Error {
  constructor(
    message: string,
    public readonly code: AIErrorCode,
    public readonly provider: ProviderId | null,
    public readonly retryable: boolean,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'AIGatewayError';
  }
}

type AIErrorCode = 
  | 'RATE_LIMITED'       // 429 - Back off and retry
  | 'QUOTA_EXCEEDED'     // Monthly quota hit
  | 'INVALID_REQUEST'    // Bad input
  | 'CONTENT_FILTERED'   // Safety filter triggered
  | 'CONTEXT_LENGTH'     // Too many tokens
  | 'PROVIDER_ERROR'     // Provider internal error
  | 'NETWORK_ERROR'      // Connection failed
  | 'TIMEOUT'            // Request took too long
  | 'ALL_PROVIDERS_FAILED';

// Error recovery strategy
const ERROR_HANDLING: Record<AIErrorCode, ErrorStrategy> = {
  'RATE_LIMITED': { retry: true, backoff: 'exponential', fallback: true },
  'QUOTA_EXCEEDED': { retry: false, fallback: true, alert: true },
  'INVALID_REQUEST': { retry: false, fallback: false },
  'CONTENT_FILTERED': { retry: false, fallback: false },
  'CONTEXT_LENGTH': { retry: false, fallback: false, truncate: true },
  'PROVIDER_ERROR': { retry: true, backoff: 'linear', fallback: true },
  'NETWORK_ERROR': { retry: true, backoff: 'exponential', fallback: true, offline: true },
  'TIMEOUT': { retry: true, backoff: 'linear', fallback: true },
  'ALL_PROVIDERS_FAILED': { retry: false, fallback: false, offline: true },
};
```

---

## 10. Usage Example

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// EXAMPLE: Using AI Gateway in a component
// ═══════════════════════════════════════════════════════════════════════════

// In a React component
function AttendanceParser() {
  const ai = useAI();  // Hook that returns gateway
  
  const parseAttendance = async (transcript: string, students: Student[]) => {
    const result = await ai.generateWithTools({
      prompt: transcript,
      systemPrompt: buildAttendancePrompt(students),
      useCase: 'attendance',  // Routes to fast/cheap model
      tools: [
        {
          name: 'mark_student_present',
          description: 'Mark a student as present',
          parameters: {
            type: 'object',
            properties: {
              studentId: { type: 'string' },
              confidence: { type: 'number' },
            },
            required: ['studentId'],
          },
        },
        {
          name: 'mark_student_absent',
          description: 'Mark a student as absent',
          parameters: {
            type: 'object',
            properties: {
              studentId: { type: 'string' },
            },
            required: ['studentId'],
          },
        },
      ],
    });
    
    // Process tool calls
    for (const toolCall of result.toolCalls) {
      if (toolCall.name === 'mark_student_present') {
        markPresent(toolCall.arguments.studentId);
      } else if (toolCall.name === 'mark_student_absent') {
        markAbsent(toolCall.arguments.studentId);
      }
    }
  };
  
  // ... rest of component
}
```
