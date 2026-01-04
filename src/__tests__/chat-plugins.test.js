/**
 * Smoke Tests for Chat Plugin Integrations
 * 
 * These tests verify that VoiceProgressLogger and SyllabusAIHelper
 * are properly integrated into the chat interface.
 * 
 * Run with: npm test -- --testPathPattern=chat-plugins
 */

import { describe, test, expect, vi } from 'vitest';

// Import using ESM syntax with proper file extensions
import {
  registerChatPlugin,
  getChatPlugins,
  initializePlugins,
} from '../plugins/chat-plugins.jsx';

import voiceProgressLoggerPlugin, {
  VoiceRecordButton,
  VoiceProgressPanel,
  VoiceProgressControls,
} from '../plugins/voiceProgressLoggerPlugin.jsx';

import syllabusAIHelperPlugin, {
  SyllabusAIPanel,
  SyllabusQuickActions,
  QuickActionButton,
} from '../plugins/syllabusAIHelperPlugin.jsx';

import * as pluginIndex from '../plugins/index.js';

// Test Suite
describe('Chat Plugin Integration', () => {
  describe('Plugin System', () => {
    test('should export registerChatPlugin function', () => {
      expect(typeof registerChatPlugin).toBe('function');
    });

    test('should export getChatPlugins function', () => {
      expect(typeof getChatPlugins).toBe('function');
    });

    test('should export initializePlugins function', () => {
      expect(typeof initializePlugins).toBe('function');
    });

    test('should register plugins with correct interface', () => {
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
      expect(voiceProgressLoggerPlugin).toBeDefined();
      expect(voiceProgressLoggerPlugin.id).toBe('voice-progress-logger');
    });

    test('should have required plugin methods', () => {
      expect(typeof voiceProgressLoggerPlugin.init).toBe('function');
      expect(typeof voiceProgressLoggerPlugin.onMessage).toBe('function');
      expect(typeof voiceProgressLoggerPlugin.renderControls).toBe('function');
      expect(typeof voiceProgressLoggerPlugin.renderExpandedPanel).toBe('function');
    });

    test('should export VoiceRecordButton component', () => {
      expect(VoiceRecordButton).toBeDefined();
    });

    test('should export VoiceProgressPanel component', () => {
      expect(VoiceProgressPanel).toBeDefined();
    });

    test('should export VoiceProgressControls component', () => {
      expect(VoiceProgressControls).toBeDefined();
    });
  });

  describe('SyllabusAIHelper Plugin', () => {
    test('should export syllabusAIHelperPlugin', () => {
      expect(syllabusAIHelperPlugin).toBeDefined();
      expect(syllabusAIHelperPlugin.id).toBe('syllabus-ai-helper');
    });

    test('should have required plugin methods', () => {
      expect(typeof syllabusAIHelperPlugin.init).toBe('function');
      expect(typeof syllabusAIHelperPlugin.onMessage).toBe('function');
      expect(typeof syllabusAIHelperPlugin.renderControls).toBe('function');
      expect(typeof syllabusAIHelperPlugin.renderExpandedPanel).toBe('function');
    });

    test('should export SyllabusAIPanel component', () => {
      expect(SyllabusAIPanel).toBeDefined();
    });

    test('should export SyllabusQuickActions component', () => {
      expect(SyllabusQuickActions).toBeDefined();
    });

    test('should export QuickActionButton component', () => {
      expect(QuickActionButton).toBeDefined();
    });
  });

  describe('Plugin Index Exports', () => {
    test('should export core plugin functions from index', () => {
      expect(pluginIndex.registerChatPlugin).toBeDefined();
      expect(pluginIndex.getChatPlugins).toBeDefined();
      expect(pluginIndex.initializePlugins).toBeDefined();
    });

    test('should export voiceProgressLoggerPlugin from index', () => {
      expect(pluginIndex.voiceProgressLoggerPlugin).toBeDefined();
    });

    test('should export syllabusAIHelperPlugin from index', () => {
      expect(pluginIndex.syllabusAIHelperPlugin).toBeDefined();
    });

    test('should export initializeStaffroomPlugins from index', () => {
      expect(pluginIndex.initializeStaffroomPlugins).toBeDefined();
      expect(typeof pluginIndex.initializeStaffroomPlugins).toBe('function');
    });

    test('initializeStaffroomPlugins should register both plugins', () => {
      pluginIndex.initializeStaffroomPlugins();
      const plugins = pluginIndex.getChatPlugins();
      
      const voicePlugin = plugins.find(p => p.id === 'voice-progress-logger');
      const syllabusPlugin = plugins.find(p => p.id === 'syllabus-ai-helper');
      
      expect(voicePlugin).toBeDefined();
      expect(syllabusPlugin).toBeDefined();
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
  addMessage: vi.fn(),
  setLoading: vi.fn(),
  getContext: () => ({
    currentCourseId: 'test-course',
    currentSectionId: 'test-section',
    ...overrides.context,
  }),
  updateContext: vi.fn(),
  ...overrides,
});
