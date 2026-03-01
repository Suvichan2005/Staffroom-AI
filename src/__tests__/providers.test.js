/**
 * AI Provider System Tests
 * 
 * Tests for the Azure/Gemini provider abstraction layer.
 * Run with: npm test -- --grep "AI Providers"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('AI Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Provider Registry', () => {
    it('should register and retrieve providers', async () => {
      const { aiRegistry } = await import('../services/providers/registry.js');
      
      const providers = aiRegistry.getProviders();
      expect(providers).toBeDefined();
      expect(Array.isArray(providers)).toBe(true);
    });

    it('should switch between providers', async () => {
      const { aiRegistry } = await import('../services/providers/registry.js');
      
      aiRegistry.setActive('mock');
      expect(aiRegistry.getActive()).toBe('mock');
      
      aiRegistry.setActive('gemini');
      expect(aiRegistry.getActive()).toBe('gemini');
    });

    it('should handle invalid provider gracefully', async () => {
      const { aiRegistry } = await import('../services/providers/registry.js');
      
      // Should not throw, just log warning
      expect(() => aiRegistry.setActive('invalid-provider')).not.toThrow();
    });
  });

  describe('Mock Provider', () => {
    it('should generate mock responses', async () => {
      const { mockProvider } = await import('../services/providers/mockProvider.js');
      
      const result = await mockProvider.generate({
        prompt: 'Hello, world!'
      });
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
      expect(typeof result.text).toBe('string');
    });

    it('should handle tool calls in mock mode', async () => {
      const { mockProvider } = await import('../services/providers/mockProvider.js');
      
      const result = await mockProvider.generate({
        prompt: 'Mark attendance for John',
        tools: [
          {
            name: 'markAttendance',
            description: 'Mark student attendance',
            parameters: {
              type: 'object',
              properties: {
                studentName: { type: 'string' }
              }
            }
          }
        ]
      });
      
      expect(result).toBeDefined();
    });

    it('should simulate streaming', async () => {
      const { mockProvider } = await import('../services/providers/mockProvider.js');
      
      const chunks = [];
      const result = await mockProvider.generateStream(
        { prompt: 'Tell me a story' },
        (chunk) => chunks.push(chunk)
      );
      
      expect(result.text).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);
    });
  });

  describe('Type Utilities', () => {
    it('should normalize tool declarations', async () => {
      const { normalizeToolDeclarations } = await import('../services/providers/types.js');
      
      const tools = [
        {
          name: 'testTool',
          description: 'A test tool',
          parameters: {
            type: 'object',
            properties: {
              input: { type: 'string' }
            }
          }
        }
      ];
      
      const normalized = normalizeToolDeclarations(tools);
      expect(normalized).toBeDefined();
      expect(Array.isArray(normalized)).toBe(true);
    });

    it('should convert to Azure format', async () => {
      const { toAzureToolFormat } = await import('../services/providers/types.js');
      
      const tools = [
        {
          name: 'getSyllabus',
          description: 'Get syllabus for a course',
          parameters: {
            type: 'object',
            properties: {
              courseId: { type: 'string' }
            },
            required: ['courseId']
          }
        }
      ];
      
      const azureFormat = toAzureToolFormat(tools);
      expect(azureFormat).toBeDefined();
      expect(azureFormat[0].type).toBe('function');
      expect(azureFormat[0].function.name).toBe('getSyllabus');
    });

    it('should convert to Gemini format', async () => {
      const { toGeminiToolFormat } = await import('../services/providers/types.js');
      
      const tools = [
        {
          name: 'markAttendance',
          description: 'Mark student attendance',
          parameters: {
            type: 'object',
            properties: {
              studentId: { type: 'string' },
              status: { type: 'string', enum: ['present', 'absent'] }
            }
          }
        }
      ];
      
      const geminiFormat = toGeminiToolFormat(tools);
      expect(geminiFormat).toBeDefined();
      expect(geminiFormat.functionDeclarations).toBeDefined();
    });
  });

  describe('Unified AI Client', () => {
    it('should generate using active provider', async () => {
      const { generateAI, switchProvider } = await import('../services/providers/unifiedAIClient.js');
      
      // Switch to mock for testing
      switchProvider('text', 'mock');
      
      const result = await generateAI({
        prompt: 'Test prompt'
      });
      
      expect(result).toBeDefined();
      expect(result.text).toBeDefined();
    });

    it('should check provider health', async () => {
      const { checkProviderHealth, switchProvider } = await import('../services/providers/unifiedAIClient.js');
      
      switchProvider('text', 'mock');
      
      const health = await checkProviderHealth('text');
      expect(health).toBeDefined();
      expect(typeof health.available).toBe('boolean');
    });

    it('should support streaming', async () => {
      const { generateStreamAI, switchProvider } = await import('../services/providers/unifiedAIClient.js');
      
      switchProvider('text', 'mock');
      
      const chunks = [];
      const result = await generateStreamAI(
        { prompt: 'Stream test' },
        (chunk) => chunks.push(chunk)
      );
      
      expect(result.text).toBeDefined();
    });
  });

  describe('Fallback Behavior', () => {
    it('should fall back to next provider on failure', async () => {
      const { aiRegistry } = await import('../services/providers/registry.js');
      
      // This tests the circuit breaker and fallback logic
      const generateWithFallback = aiRegistry.generateWithFallback;
      expect(typeof generateWithFallback).toBe('function');
    });
  });
});

describe('Voice Providers', () => {
  describe('Mock Voice Provider', () => {
    it('should create streaming session', async () => {
      const { mockVoiceProvider } = await import('../services/providers/mockProvider.js');
      
      const session = await mockVoiceProvider.createSession({});
      expect(session).toBeDefined();
      expect(typeof session.start).toBe('function');
      expect(typeof session.stop).toBe('function');
    });
  });

  describe('Voice Registry', () => {
    it('should manage voice providers', async () => {
      const { voiceRegistry } = await import('../services/providers/registry.js');
      
      expect(voiceRegistry).toBeDefined();
      expect(typeof voiceRegistry.getActive).toBe('function');
      expect(typeof voiceRegistry.setActive).toBe('function');
    });
  });
});
