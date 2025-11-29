/**
 * Chat Plugins Index
 * 
 * Wired-in by plugin integration pass — user asked to keep files intact.
 * 
 * Central export point for all chat plugins and the plugin system.
 * Import from here to automatically register all plugins.
 */

// Plugin System Core
export {
  registerChatPlugin,
  unregisterChatPlugin,
  getChatPlugins,
  getChatPlugin,
  setPluginEnabled,
  subscribeToPluginEvent,
  emitEvent,
  initializePlugins,
  processMessageThroughPlugins,
  ChatPluginProvider,
  useChatPlugins,
} from './chat-plugins';

// Individual Plugins
export { default as voiceProgressLoggerPlugin } from './voiceProgressLoggerPlugin';
export { default as syllabusAIHelperPlugin } from './syllabusAIHelperPlugin';

// Plugin Components (for direct use)
export {
  VoiceRecordButton,
  VoiceProgressPanel,
  VoiceProgressControls,
} from './voiceProgressLoggerPlugin';

export {
  SyllabusAIPanel,
  SyllabusQuickActions,
  QuickActionButton,
} from './syllabusAIHelperPlugin';

/**
 * Initialize all Staffroom plugins
 * Call this at app startup to ensure all plugins are registered
 */
export function initializeStaffroomPlugins() {
  // Plugins auto-register when imported via the import statements above
  // This function exists for explicit initialization if needed
  console.log('[Plugins] Staffroom plugins initialized');
}

/**
 * Initialize all plugins - alias for backward compatibility
 */
export function initializeAllPlugins() {
  initializeStaffroomPlugins();
}

/**
 * Create plugin API for message handling
 * @param {Object} options - API options
 * @returns {Object} - Plugin API
 */
export function createPluginAPI({ addMessage, setLoading, getContext, updateContext }) {
  return {
    addMessage,
    setLoading,
    getContext,
    updateContext,
    sendMessage: (content) => addMessage(content, {}),
    addAssistantMessage: (content, metadata) => addMessage(content, metadata),
    subscribe: () => () => {}, // Placeholder
    getMessages: () => [], // Placeholder
  };
}

export default {
  initializeStaffroomPlugins,
  initializeAllPlugins,
  createPluginAPI,
};

