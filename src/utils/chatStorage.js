/**
 * Chat history storage and session management
 * Stores chat sessions in localStorage with metadata
 * 
 * NOW USER-SCOPED: All chat data is isolated per user
 */

import { loadUserState, saveUserState, removeUserState, getStorageUserId } from './userScopedStorage';

// Storage keys (now used within user-scoped namespace)
const STORAGE_KEY = 'chat_history';
const CURRENT_SESSION_KEY = 'current_chat_session';

/**
 * Chat session structure:
 * {
 *   id: string (timestamp-based)
 *   title: string (auto-generated from first message or user-set)
 *   messages: array of message objects
 *   createdAt: ISO string
 *   updatedAt: ISO string
 *   context: { courseId, sectionId, page } - page context when chat started
 * }
 */

/**
 * Get all chat sessions for the current user
 */
export function getAllChatSessions() {
  try {
    return loadUserState(STORAGE_KEY, []);
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
}

/**
 * Get a specific chat session by ID
 */
export function getChatSession(sessionId) {
  const sessions = getAllChatSessions();
  return sessions.find(s => s.id === sessionId);
}

/**
 * Save or update a chat session (user-scoped)
 */
export function saveChatSession(session) {
  try {
    const sessions = getAllChatSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    const updatedSession = {
      ...session,
      updatedAt: new Date().toISOString(),
    };
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = updatedSession;
    } else {
      sessions.push(updatedSession);
    }
    
    // Sort by updatedAt descending (most recent first)
    sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    
    // Keep only last 50 chats to prevent storage bloat
    const trimmedSessions = sessions.slice(0, 50);
    
    saveUserState(STORAGE_KEY, trimmedSessions);
    return updatedSession;
  } catch (error) {
    console.error('Error saving chat session:', error);
    return null;
  }
}

/**
 * Delete a chat session (user-scoped)
 */
export function deleteChatSession(sessionId) {
  try {
    const sessions = getAllChatSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    saveUserState(STORAGE_KEY, filtered);
    
    // If deleted session was current, clear current session
    const currentId = getCurrentSessionId();
    if (currentId === sessionId) {
      clearCurrentSession();
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting chat session:', error);
    return false;
  }
}

/**
 * Create a new chat session
 */
export function createNewChatSession(context = {}) {
  const userId = getStorageUserId() || 'anon';
  const sessionId = `chat_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const session = {
    id: sessionId,
    title: 'New Chat',
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    context: {
      courseId: context.courseId || null,
      sectionId: context.sectionId || null,
      page: context.page || window.location.pathname,
    },
  };
  
  return session;
}

/**
 * Get current active session ID (user-scoped)
 */
export function getCurrentSessionId() {
  try {
    return loadUserState(CURRENT_SESSION_KEY, null);
  } catch (error) {
    console.error('Error getting current session:', error);
    return null;
  }
}

/**
 * Set current active session ID (user-scoped)
 */
export function setCurrentSessionId(sessionId) {
  try {
    saveUserState(CURRENT_SESSION_KEY, sessionId);
  } catch (error) {
    console.error('Error setting current session:', error);
  }
}

/**
 * Clear current session (start fresh)
 */
export function clearCurrentSession() {
  try {
    removeUserState(CURRENT_SESSION_KEY);
  } catch (error) {
    console.error('Error clearing current session:', error);
  }
}

/**
 * Generate a title for a chat based on first message
 */
export function generateChatTitle(messages) {
  if (!messages || messages.length === 0) {
    return 'New Chat';
  }
  
  // Find first user message
  const firstUserMessage = messages.find(m => m.sender === 'user');
  if (firstUserMessage && firstUserMessage.text) {
    // Truncate to 50 chars
    const title = firstUserMessage.text.substring(0, 50);
    return title.length < firstUserMessage.text.length ? `${title}...` : title;
  }
  
  return 'New Chat';
}

/**
 * Update chat title
 */
export function updateChatTitle(sessionId, title) {
  const session = getChatSession(sessionId);
  if (session) {
    session.title = title;
    saveChatSession(session);
  }
}

/**
 * Add message to a session
 */
export function addMessageToSession(sessionId, message) {
  const session = getChatSession(sessionId);
  if (session) {
    session.messages.push(message);
    
    // Auto-generate title from first user message
    if (session.title === 'New Chat' && message.sender === 'user') {
      session.title = generateChatTitle(session.messages);
    }
    
    saveChatSession(session);
  }
}

/**
 * Clear all chat history for current user
 */
export function clearAllChatHistory() {
  try {
    removeUserState(STORAGE_KEY);
    removeUserState(CURRENT_SESSION_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return false;
  }
}
