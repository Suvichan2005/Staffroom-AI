/**
 * Chat Plugin System
 * 
 * Wired-in by plugin integration pass ─ user asked to keep files intact.
 * 
 * Provides a standardized interface for extending the AI chat functionality
 * with additional features like VoiceProgressLogger and SyllabusAIHelper.
 * 
 * Usage:
 *   import { registerChatPlugin, getChatPlugins, ChatPluginProvider } from './plugins/chat-plugins';
 *   
 *   registerChatPlugin({
 *     id: 'my-plugin',
 *     init: (api) => { ... },
 *     onMessage: async (message, context) => { ... },
 *     renderControls: (props) => <MyControls {...props} />
 *   });
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Debug flag for plugin integration logging
const DEBUG_PLUGIN_INTEGRATIONS = import.meta.env.VITE_DEBUG_PLUGINS === 'true' || 
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

/**
 * @typedef {Object} ChatAPI
 * @property {function(string): void} sendMessage - Send a message to the chat
 * @property {function(string, Object): void} addAssistantMessage - Add an assistant message
 * @property {function(string): void} subscribe - Subscribe to chat events
 * @property {function(): Object} getContext - Get current AI context (courseId, sectionId, etc.)
 * @property {function(Object): void} updateContext - Update AI context
 * @property {function(): Array} getMessages - Get current messages
 * @property {function(boolean): void} setLoading - Set loading state
 */

/**
 * @typedef {Object} ChatPlugin
 * @property {string} id - Unique plugin identifier
 * @property {string} [name] - Display name
 * @property {string} [description] - Plugin description
 * @property {function(ChatAPI): void} [init] - Called when plugin is registered
 * @property {function(Object, Object): Promise<Object|null>} [onMessage] - Process incoming messages
 * @property {function(Object): JSX.Element|null} [renderControls] - Render plugin controls in chat
 * @property {function(Object): JSX.Element|null} [renderPanel] - Render expanded panel (for tools tab)
 * @property {function(): void} [destroy] - Cleanup when plugin is unregistered
 * @property {number} [priority] - Plugin execution priority (higher = first)
 * @property {boolean} [enabled] - Whether plugin is enabled
 */

// Plugin registry
const pluginRegistry = new Map();

// Event subscribers
const eventSubscribers = new Map();

/**
 * Log debug message if debug mode is enabled
 * @param {...any} args - Arguments to log
 */
function debugLog(...args) {
  if (DEBUG_PLUGIN_INTEGRATIONS) {
    console.log('[ChatPlugins]', ...args);
  }
}

/**
 * Register a chat plugin
 * @param {ChatPlugin} plugin - Plugin to register
 * @returns {boolean} - Whether registration was successful
 */
export function registerChatPlugin(plugin) {
  if (!plugin?.id) {
    console.error('[ChatPlugins] Plugin must have an id');
    return false;
  }

  if (pluginRegistry.has(plugin.id)) {
    debugLog(`Plugin ${plugin.id} already registered, updating...`);
  }

  // Set defaults
  const normalizedPlugin = {
    enabled: true,
    priority: 0,
    ...plugin,
  };

  pluginRegistry.set(plugin.id, normalizedPlugin);
  debugLog(`Registered plugin: ${plugin.id}`, normalizedPlugin);

  // Emit registration event
  emitEvent('plugin:registered', { pluginId: plugin.id, plugin: normalizedPlugin });

  return true;
}

/**
 * Unregister a chat plugin
 * @param {string} pluginId - Plugin ID to unregister
 */
export function unregisterChatPlugin(pluginId) {
  const plugin = pluginRegistry.get(pluginId);
  if (plugin) {
    if (typeof plugin.destroy === 'function') {
      try {
        plugin.destroy();
      } catch (err) {
        console.error(`[ChatPlugins] Error destroying plugin ${pluginId}:`, err);
      }
    }
    pluginRegistry.delete(pluginId);
    debugLog(`Unregistered plugin: ${pluginId}`);
    emitEvent('plugin:unregistered', { pluginId });
  }
}

/**
 * Get all registered plugins
 * @returns {ChatPlugin[]}
 */
export function getChatPlugins() {
  return Array.from(pluginRegistry.values())
    .filter(p => p.enabled)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Get a specific plugin by ID
 * @param {string} pluginId
 * @returns {ChatPlugin|undefined}
 */
export function getChatPlugin(pluginId) {
  return pluginRegistry.get(pluginId);
}

/**
 * Enable or disable a plugin
 * @param {string} pluginId
 * @param {boolean} enabled
 */
export function setPluginEnabled(pluginId, enabled) {
  const plugin = pluginRegistry.get(pluginId);
  if (plugin) {
    plugin.enabled = enabled;
    debugLog(`Plugin ${pluginId} ${enabled ? 'enabled' : 'disabled'}`);
    emitEvent('plugin:toggled', { pluginId, enabled });
  }
}

/**
 * Subscribe to plugin events
 * @param {string} event - Event name
 * @param {function} callback - Event handler
 * @returns {function} - Unsubscribe function
 */
export function subscribeToPluginEvent(event, callback) {
  if (!eventSubscribers.has(event)) {
    eventSubscribers.set(event, new Set());
  }
  eventSubscribers.get(event).add(callback);
  
  return () => {
    eventSubscribers.get(event)?.delete(callback);
  };
}

/**
 * Emit a plugin event
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export function emitEvent(event, data) {
  const subscribers = eventSubscribers.get(event);
  if (subscribers) {
    subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`[ChatPlugins] Error in event handler for ${event}:`, err);
      }
    });
  }
}

/**
 * Initialize all plugins with the chat API
 * @param {ChatAPI} api - Chat API instance
 */
export function initializePlugins(api) {
  const plugins = getChatPlugins();
  plugins.forEach(plugin => {
    if (typeof plugin.init === 'function') {
      try {
        plugin.init(api);
        debugLog(`Initialized plugin: ${plugin.id}`);
      } catch (err) {
        console.error(`[ChatPlugins] Error initializing plugin ${plugin.id}:`, err);
      }
    }
  });
}

/**
 * Process a message through all plugins
 * @param {Object} message - The message to process
 * @param {Object} context - Current context
 * @returns {Promise<Object|null>} - Plugin response or null
 */
export async function processMessageThroughPlugins(message, context) {
  const plugins = getChatPlugins();
  
  for (const plugin of plugins) {
    if (typeof plugin.onMessage === 'function') {
      try {
        const result = await plugin.onMessage(message, context);
        if (result) {
          debugLog(`Plugin ${plugin.id} handled message:`, result);
          return { pluginId: plugin.id, ...result };
        }
      } catch (err) {
        console.error(`[ChatPlugins] Error in plugin ${plugin.id} onMessage:`, err);
      }
    }
  }
  
  return null;
}

// ============================================
// React Context for Plugin Integration
// ============================================

const ChatPluginContext = createContext(null);

/**
 * Chat Plugin Provider Component
 * Wraps the app to provide plugin functionality to chat components
 */
export function ChatPluginProvider({ children }) {
  const [plugins, setPlugins] = useState([]);
  const [initialized, setInitialized] = useState(false);

  // Update plugins list when registry changes
  useEffect(() => {
    const updatePlugins = () => {
      setPlugins(getChatPlugins());
    };

    // Initial load
    updatePlugins();

    // Subscribe to plugin events
    const unsubRegister = subscribeToPluginEvent('plugin:registered', updatePlugins);
    const unsubUnregister = subscribeToPluginEvent('plugin:unregistered', updatePlugins);
    const unsubToggle = subscribeToPluginEvent('plugin:toggled', updatePlugins);

    return () => {
      unsubRegister();
      unsubUnregister();
      unsubToggle();
    };
  }, []);

  // Initialize plugins with API
  const initializeWithAPI = useCallback((api) => {
    if (!initialized) {
      initializePlugins(api);
      setInitialized(true);
    }
  }, [initialized]);

  // Get plugin controls to render
  const getPluginControls = useCallback((props) => {
    return plugins
      .filter(p => typeof p.renderControls === 'function')
      .map(p => ({
        id: p.id,
        name: p.name || p.id,
        render: () => p.renderControls(props)
      }));
  }, [plugins]);

  // Get plugin panels (for tools tab)
  const getPluginPanels = useCallback((props) => {
    return plugins
      .filter(p => typeof p.renderPanel === 'function')
      .map(p => ({
        id: p.id,
        name: p.name || p.id,
        description: p.description,
        render: () => p.renderPanel(props)
      }));
  }, [plugins]);

  const value = {
    plugins,
    initialized,
    initializeWithAPI,
    getPluginControls,
    getPluginPanels,
    processMessage: processMessageThroughPlugins,
    registerPlugin: registerChatPlugin,
    unregisterPlugin: unregisterChatPlugin,
    setPluginEnabled,
  };

  return (
    <ChatPluginContext.Provider value={value}>
      {children}
    </ChatPluginContext.Provider>
  );
}

/**
 * Hook to access chat plugin functionality
 * @returns {Object} Plugin context value
 */
export function useChatPlugins() {
  const context = useContext(ChatPluginContext);
  if (!context) {
    // Return a safe fallback if not in provider
    return {
      plugins: [],
      initialized: false,
      initializeWithAPI: () => {},
      getPluginControls: () => [],
      getPluginPanels: () => [],
      processMessage: async () => null,
      registerPlugin: () => false,
      unregisterPlugin: () => {},
      setPluginEnabled: () => {},
    };
  }
  return context;
}

// Export default for convenience
export default {
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
};
