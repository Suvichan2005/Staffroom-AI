# AI Provider System

> **Provider-Agnostic AI Architecture for Staffroom AI**  
> Supports Azure OpenAI, Google Gemini, and Mock providers with runtime switching and automatic fallback.

## Overview

The AI Provider System provides a unified interface for all AI functionality in Staffroom AI, enabling:

- **Provider Switching**: Toggle between Azure OpenAI and Google Gemini at runtime
- **Automatic Fallback**: Circuit breaker pattern with cascading fallback
- **Feature Parity**: Same capabilities across providers (text generation, streaming, tool calling, voice)
- **Zero UI Changes**: All existing features work transparently with any provider

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
│  (AIContext, ChatPage, AttendanceVoice, etc.)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Unified AI Client                            │
│  generateAI(), generateStreamAI(), createVoiceSession()        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Provider Registry                            │
│  - Provider selection (azure/gemini/mock)                       │
│  - Circuit breaker (3 failures, 60s reset)                      │
│  - Fallback chain                                               │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│ Azure OpenAI  │     │ Google Gemini │     │ Mock Provider │
│ Provider      │     │ Provider      │     │ (Testing)     │
│               │     │               │     │               │
│ - GPT-4o      │     │ - 2.5 Flash   │     │ - Local only  │
│ - Azure Speech│     │ - Gemini Live │     │ - No API      │
└───────────────┘     └───────────────┘     └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cloud Functions Proxy (Production)                 │
│  /api/ai/azure/generate, /api/ai/gemini/generate, etc.         │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Configure Environment

Add to your `.env.local`:

```bash
# Provider Selection
VITE_AI_PROVIDER=azure          # 'azure' | 'gemini' | 'mock'
VITE_AI_FALLBACK_ENABLED=true
VITE_AI_FALLBACK_ORDER=azure,gemini,mock

# Azure OpenAI Endpoint
VITE_AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
VITE_AZURE_OPENAI_API_KEY=your-key
VITE_AZURE_OPENAI_API_VERSION=2024-12-01-preview

# Cost-Optimized Model Deployments (Jan 2026 Pricing)
VITE_AZURE_DEPLOYMENT_FAST=gpt-4.1-nano      # ₹9/₹36 per 1M tokens
VITE_AZURE_DEPLOYMENT_STANDARD=gpt-4.1-mini  # ₹36/₹144 per 1M tokens
VITE_AZURE_DEPLOYMENT_PRO=gpt-4.1            # ₹180/₹720 per 1M tokens
VITE_AZURE_DEPLOYMENT_REASONING=o4-mini      # ₹99/₹396 per 1M tokens

# Azure Speech
VITE_AZURE_SPEECH_KEY=your-speech-key
VITE_AZURE_SPEECH_REGION=eastus
```

## Model Selection Strategy

The system automatically selects the most cost-effective model for each use case:

| Use Case | Model | Cost (₹/1M tokens) | When Used |
|----------|-------|-------------------|-----------|
| Chat, Quiz, Briefing | `gpt-4.1-nano` | ₹9 in / ₹36 out | Simple generation tasks |
| Analysis, Syllabus | `gpt-4.1-mini` | ₹36 in / ₹144 out | Complex analysis, function calling |
| Tool Calling | `gpt-4.1-mini` | ₹36 in / ₹144 out | Attendance, data tools |
| Complex Reasoning | `o4-mini` | ₹99 in / ₹396 out | Math, coding, multi-step logic |
| Premium | `gpt-4.1` | ₹180 in / ₹720 out | Maximum capability |

### Use Case-Based Routing

```javascript
// Automatically uses gpt-4.1-nano (cheapest)
const quiz = await generateAI({
  prompt: 'Generate 5 quiz questions',
  useCase: 'quiz'  // Routes to FAST tier
});

// Automatically uses gpt-4.1-mini (balanced)
const analysis = await generateAI({
  prompt: 'Analyze student performance',
  useCase: 'analysis'  // Routes to STANDARD tier
});

// Automatically uses o4-mini (reasoning)
const solution = await generateAI({
  prompt: 'Solve this complex problem step by step',
  useCase: 'reasoning'  // Routes to REASONING tier
});
```

### 2. Use in Components

```jsx
import { useAI } from '../hooks/useAIProvider';

function MyComponent() {
  const { generate, provider, changeProvider } = useAI();
  
  const handleGenerate = async () => {
    const result = await generate({
      prompt: 'Generate a quiz about photosynthesis',
      systemPrompt: 'You are a helpful teaching assistant.',
      useCase: 'quiz'  // Uses gpt-4.1-nano (cheapest)
    });
    console.log(result.text);
  };
  
  return (
    <div>
      <p>Current provider: {provider}</p>
      <button onClick={() => changeProvider('azure')}>Switch to Azure</button>
      <button onClick={handleGenerate}>Generate</button>
    </div>
  );
}
```

### 3. Direct API Usage

```javascript
import { generateAI, generateStreamAI } from '../services/providers';

// Simple generation
const result = await generateAI({
  prompt: 'Explain quantum entanglement',
  temperature: 0.7
});

// Streaming
await generateStreamAI(
  { prompt: 'Write a story about...' },
  (chunk) => console.log(chunk)
);
```

## Provider Configuration

### Azure OpenAI

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_AZURE_OPENAI_ENDPOINT` | Azure OpenAI resource endpoint | `https://my-resource.openai.azure.com` |
| `VITE_AZURE_OPENAI_API_KEY` | API key | `abc123...` |
| `VITE_AZURE_OPENAI_DEPLOYMENT` | Deployment name | `gpt-4o` |
| `VITE_AZURE_OPENAI_API_VERSION` | API version | `2024-08-01-preview` |

### Azure Speech

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_AZURE_SPEECH_KEY` | Speech service key | `xyz789...` |
| `VITE_AZURE_SPEECH_REGION` | Azure region | `eastus` |
| `VITE_AZURE_SPEECH_LANGUAGE` | Default language | `en-IN` |

### Google Gemini

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_GEMINI_API_KEY` | Google AI API key | `AIza...` |

## API Reference

### `generateAI(options)`

Generate text using the active provider.

```typescript
interface GenerateOptions {
  prompt: string;              // User prompt
  systemPrompt?: string;       // System instruction
  messages?: Message[];        // Conversation history
  temperature?: number;        // 0-2, default 0.7
  maxTokens?: number;          // Max response tokens
  tools?: Tool[];              // Function calling tools
  useFallback?: boolean;       // Enable fallback chain
}

interface GenerateResult {
  text: string;
  toolCalls?: ToolCall[];
  provider: string;
  usage?: { prompt: number; completion: number; total: number };
}
```

### `generateStreamAI(options, onChunk)`

Stream generated text.

```typescript
await generateStreamAI(
  { prompt: 'Write a long essay...' },
  (chunk: string) => {
    // Called for each text chunk
    appendToOutput(chunk);
  }
);
```

### `createVoiceSession(options)`

Create a real-time voice transcription session.

```typescript
const session = await createVoiceSession({
  onTranscript: (text, isFinal) => {
    console.log(isFinal ? 'Final:' : 'Interim:', text);
  },
  onToolCall: (toolCall) => {
    // Handle detected tool calls (e.g., attendance marking)
  },
  language: 'en-IN'
});

await session.start();  // Starts microphone
await session.stop();   // Stops session
```

### `transcribeAudio(options)`

Transcribe audio file.

```typescript
const result = await transcribeAudio({
  audio: audioBlob,      // Blob, ArrayBuffer, or base64
  language: 'en-IN',
  format: 'wav'
});
console.log(result.text);
```

## React Hooks

### `useAI()`

Combined hook for common operations.

```jsx
const {
  // Generation
  generate,
  generateLoading,
  generateError,
  
  // Streaming
  stream,
  streamText,
  streaming,
  
  // Voice
  startVoice,
  stopVoice,
  transcript,
  
  // Provider
  provider,
  changeProvider,
  checkProviderHealth
} = useAI();
```

### `useAIProvider()`

Provider management hook.

```jsx
const {
  provider,           // Current provider name
  changeProvider,     // Switch provider
  health,             // { available: boolean, latency?: number }
  checking,           // Health check in progress
  availableProviders  // ['azure', 'gemini', 'mock']
} = useAIProvider();
```

## Components

### `<AIProviderStatus />`

Admin component showing provider status and switcher.

```jsx
import { AIProviderStatus } from '../components/admin/AIProviderStatus';

<AIProviderStatus showSwitcher={true} compact={false} />
```

## Fallback Behavior

The system uses a circuit breaker pattern:

1. **Normal**: Requests go to active provider
2. **Failure**: After 3 consecutive failures, circuit opens
3. **Fallback**: Requests go to next provider in fallback order
4. **Recovery**: After 60s, circuit half-opens to test original provider
5. **Reset**: On success, circuit closes and returns to normal

Configure fallback order:

```bash
VITE_AI_FALLBACK_ORDER=azure,gemini,mock
```

## Cloud Functions

The provider system uses Cloud Functions as a secure proxy in production:

| Endpoint | Provider | Description |
|----------|----------|-------------|
| `/api/ai/azure/generate` | Azure | Text generation |
| `/api/ai/azure/speech-token` | Azure | Get speech auth token |
| `/api/ai/azure/transcribe` | Azure | Audio transcription |
| `/api/ai/gemini/generate` | Gemini | Text generation |
| `/api/ai/gemini/live-token` | Gemini | WebSocket token |
| `/api/health/azure` | Azure | Health check |
| `/api/health/azure-speech` | Azure | Speech health check |

## Testing

Run provider tests:

```bash
npm test -- --grep "AI Providers"
```

Test with mock provider (no API calls):

```bash
VITE_AI_PROVIDER=mock npm run dev
```

## File Structure

```
src/services/providers/
├── index.js                 # Central exports
├── types.js                 # Type definitions & utilities
├── registry.js              # Provider registry & circuit breaker
├── unifiedAIClient.js       # High-level unified client
├── aiServiceBridge.js       # Bridge for existing aiService.js
├── azureProvider.js         # Azure OpenAI implementation
├── azureVoiceProvider.js    # Azure Speech implementation
├── geminiProvider.js        # Google Gemini implementation
├── geminiVoiceProvider.js   # Gemini Live implementation
└── mockProvider.js          # Mock for testing

src/hooks/
└── useAIProvider.jsx        # React hooks

src/components/admin/
└── AIProviderStatus.jsx     # Status component

functions/
└── index.js                 # Cloud Functions (Azure endpoints)
```

## Migration from Direct Gemini Calls

Before:
```javascript
import { callGemini } from '../services/aiService';
const result = await callGemini('Generate a quiz...');
```

After:
```javascript
import { generateWithProvider } from '../services/providers';
const result = await generateWithProvider('Generate a quiz...');
```

Or with the bridge (zero changes needed):
```javascript
// aiService.js now uses the provider system internally
import { generateQuiz } from '../services/aiService';
await generateQuiz(params);  // Works with both Azure and Gemini
```

## Imagine Cup Compliance

This architecture meets Microsoft Imagine Cup 2026 requirements:

- ✅ **Microsoft Cloud Integration**: Azure OpenAI + Azure AI Speech
- ✅ **Responsible AI**: Uses Azure's content safety filters
- ✅ **Cost-Effective**: Smart fallback minimizes failed API calls
- ✅ **Production-Ready**: Circuit breaker, retry logic, health checks
- ✅ **Testable**: Mock provider for development/testing
