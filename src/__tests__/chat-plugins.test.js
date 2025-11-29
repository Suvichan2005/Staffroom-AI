/**
 * Smoke Tests for Chat Plugin Integrations
 * 
 * These tests verify that VoiceProgressLogger and SyllabusAIHelper
 * are properly integrated into the chat interface.
 * 
 * Run with: npm test -- --testPathPattern=chat-plugins
 */

import React from 'react';

// Mock implementations for testing
const mockAIContext = {
  messages: [],
  inputValue: '',
  setInputValue: jest.fn(),
  isLoading: false,
  isRecording: false,
  toggleRecording: jest.fn(),
  sendMessage: jest.fn(),
  aiContext: {
    currentCourseId: 'geography-6',
    currentSectionId: '6A',
  },
  plugins: [],
  getPluginAPI: () => ({
    addMessage: jest.fn(),
    setLoading: jest.fn(),
    getContext: () => ({}),
    updateContext: jest.fn(),
  }),
};

// Test Suite
describe('Chat Plugin Integration', () => {
  describe('Plugin System', () => {
    test('should export registerChatPlugin function', () => {
      // Import dynamically to allow mocking
      const { registerChatPlugin } = require('../plugins/chat-plugins');
      expect(typeof registerChatPlugin).toBe('function');
    });

    test('should export getChatPlugins function', () => {
      const { getChatPlugins } = require('../plugins/chat-plugins');
      expect(typeof getChatPlugins).toBe('function');
    });

    test('should export createPluginAPI function', () => {
      const { createPluginAPI } = require('../plugins/chat-plugins');
      expect(typeof createPluginAPI).toBe('function');
    });

    test('should export initializeAllPlugins function', () => {
      const { initializeAllPlugins } = require('../plugins/chat-plugins');
      expect(typeof initializeAllPlugins).toBe('function');
    });

    test('should register plugins with correct interface', () => {
      const { registerChatPlugin, getChatPlugins } = require('../plugins/chat-plugins');
      
      // Register a test plugin
      registerChatPlugin({
        id: 'test-plugin',
        name: 'Test Plugin',
        description: 'A test plugin',
        init: () => console.log('Test plugin initialized'),
        onMessage: (msg) => false,
        renderControls: () => null,
        cleanup: () => {},
      });

      const plugins = getChatPlugins();
      const testPlugin = plugins.find(p => p.id === 'test-plugin');
      expect(testPlugin).toBeDefined();
      expect(testPlugin.name).toBe('Test Plugin');
    });
  });

  describe('VoiceProgressLogger Plugin', () => {
    test('should export voiceProgressLoggerPlugin', () => {
      const { voiceProgressLoggerPlugin } = require('../plugins/voiceProgressLoggerPlugin');
      expect(voiceProgressLoggerPlugin).toBeDefined();
      expect(voiceProgressLoggerPlugin.id).toBe('voice-progress-logger');
    });

    test('should have required plugin methods', () => {
      const { voiceProgressLoggerPlugin } = require('../plugins/voiceProgressLoggerPlugin');
      expect(typeof voiceProgressLoggerPlugin.init).toBe('function');
      expect(typeof voiceProgressLoggerPlugin.onMessage).toBe('function');
      expect(typeof voiceProgressLoggerPlugin.renderControls).toBe('function');
      expect(typeof voiceProgressLoggerPlugin.renderExpandedPanel).toBe('function');
    });

    test('should export VoiceControlButton component', () => {
      const { VoiceControlButton } = require('../plugins/voiceProgressLoggerPlugin');
      expect(VoiceControlButton).toBeDefined();
    });
  });

  describe('SyllabusAIHelper Plugin', () => {
    test('should export syllabusAIHelperPlugin', () => {
      const { syllabusAIHelperPlugin } = require('../plugins/syllabusAIHelperPlugin');
      expect(syllabusAIHelperPlugin).toBeDefined();
      expect(syllabusAIHelperPlugin.id).toBe('syllabus-ai-helper');
    });

    test('should have required plugin methods', () => {
      const { syllabusAIHelperPlugin } = require('../plugins/syllabusAIHelperPlugin');
      expect(typeof syllabusAIHelperPlugin.init).toBe('function');
      expect(typeof syllabusAIHelperPlugin.onMessage).toBe('function');
      expect(typeof syllabusAIHelperPlugin.renderControls).toBe('function');
      expect(typeof syllabusAIHelperPlugin.renderExpandedPanel).toBe('function');
    });

    test('should export SyllabusActionButtons component', () => {
      const { SyllabusActionButtons } = require('../plugins/syllabusAIHelperPlugin');
      expect(SyllabusActionButtons).toBeDefined();
    });
  });

  describe('Plugin Index Exports', () => {
    test('should export all plugins from index', () => {
      const plugins = require('../plugins');
      
      expect(plugins.registerChatPlugin).toBeDefined();
      expect(plugins.getChatPlugins).toBeDefined();
      expect(plugins.createPluginAPI).toBeDefined();
      expect(plugins.initializeAllPlugins).toBeDefined();
      expect(plugins.voiceProgressLoggerPlugin).toBeDefined();
      expect(plugins.syllabusAIHelperPlugin).toBeDefined();
      expect(plugins.initializeStaffroomPlugins).toBeDefined();
    });

    test('initializeStaffroomPlugins should register both plugins', () => {
      const { initializeStaffroomPlugins, getChatPlugins } = require('../plugins');
      
      initializeStaffroomPlugins();
      const plugins = getChatPlugins();
      
      const voicePlugin = plugins.find(p => p.id === 'voice-progress-logger');
      const syllabusPlugin = plugins.find(p => p.id === 'syllabus-ai-helper');
      
      expect(voicePlugin).toBeDefined();
      expect(syllabusPlugin).toBeDefined();
    });
  });
});

describe('AIContext Plugin Integration', () => {
  test('should expose plugin-related properties', () => {
    // This would be an integration test with React Testing Library
    // For now, we verify the exports
    const AIContext = require('../context/AIContext');
    expect(AIContext.AIProvider).toBeDefined();
    expect(AIContext.useAI).toBeDefined();
  });
});

describe('Chat Components Plugin Integration', () => {
  describe('PersistentChatBar', () => {
    test('should import getChatPlugins', () => {
      // Verify the import doesn't throw
      expect(() => require('../components/ai/PersistentChatBar')).not.toThrow();
    });
  });

  describe('DesktopChatBar', () => {
    test('should import getChatPlugins', () => {
      // Verify the import doesn't throw
      expect(() => require('../components/ai/DesktopChatBar')).not.toThrow();
    });
  });
});

// Integration test helpers
export const testPluginMessageHandling = async (plugin, message, api) => {
  const handled = await plugin.onMessage(message, api);
  return {
    handled,
    message,
  };
};

export const createTestPluginAPI = (overrides = {}) => ({
  addMessage: jest.fn(),
  setLoading: jest.fn(),
  getContext: () => ({
    currentCourseId: 'test-course',
    currentSectionId: 'test-section',
    ...overrides.context,
  }),
  updateContext: jest.fn(),
  ...overrides,
});
