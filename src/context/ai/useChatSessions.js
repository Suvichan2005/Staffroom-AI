/**
 * AIContext — Chat session persistence hook
 *
 * Encapsulates:
 * - Session initialization (localStorage + Firestore)
 * - Real-time Firestore listeners (session list & current session)
 * - Session CRUD (create, load, delete, rename)
 * - Auto-save (pendingSaveRef) & beforeunload safety net
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  getAllChatSessions,
  getChatSession,
  saveChatSession,
  deleteChatSession,
  createNewChatSession,
  getCurrentSessionId,
  setCurrentSessionId,
  clearCurrentSession,
  addMessageToSession,
  updateChatTitle,
} from '../../utils/chatStorage';
import {
  getAllChatSessionsFromFirestore,
  getChatSessionFromFirestore,
  saveChatSessionToFirestore,
  deleteChatSessionFromFirestore,
  updateChatTitleInFirestore,
  syncLocalToFirestore,
  subscribeToChatSessions,
  subscribeToSession,
  saveActiveSessionIdToFirestore,
  getActiveSessionIdFromFirestore,
} from '../../services/firestoreChatService';
import { serializeMessageForStorage, createWelcomeMessage, formatSessionMessages } from './helpers';

/**
 * @param {{ isAuthed: boolean, authLoading: boolean, getContextFromURL: Function }} opts
 */
export function useChatSessions({ isAuthed, authLoading, getContextFromURL }) {
  // ── State ───────────────────────────────────────────────────────
  const [messages, setMessages] = useState([createWelcomeMessage()]);
  const [currentSessionId, setCurrentSessionIdState] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const sessionInitializedRef = useRef(false);
  const lastPathRef = useRef(null);

  // Refs for sync / voice callbacks
  const messagesRef = useRef([]);
  const currentSessionIdRef = useRef(null);
  const isAuthedRef = useRef(false);
  const pendingSaveRef = useRef(false);
  const loadingSessionRef = useRef(false);

  // Firestore listener unsub refs
  const sessionListenerRef = useRef(null);
  const sessionsListListenerRef = useRef(null);

  // Keep refs in sync with state
  useEffect(() => { messagesRef.current = messages; });
  useEffect(() => { currentSessionIdRef.current = currentSessionId; }, [currentSessionId]);
  useEffect(() => { isAuthedRef.current = isAuthed; }, [isAuthed]);

  // ── buildAndSaveSession ─────────────────────────────────────────
  const buildAndSaveSession = useCallback((msgs, sessionId, authed) => {
    if (!sessionId) return;
    const serialized = msgs.map(serializeMessageForStorage);

    let title = 'New Chat';
    const firstUserMsg = msgs.find(m => m.role === 'user');
    if (firstUserMsg?.content) {
      const t = firstUserMsg.content;
      title = t.length > 50 ? `${t.substring(0, 50)}...` : t;
    }

    const existing = getChatSession(sessionId);
    const session = {
      id: sessionId,
      title: existing?.title === 'New Chat' ? title : (existing?.title || title),
      messages: serialized,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      context: existing?.context || {},
    };

    saveChatSession(session);

    if (authed) {
      saveChatSessionToFirestore(session);
    } else {
      setChatHistory(prev => {
        const idx = prev.findIndex(s => s.id === session.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...session };
          return updated;
        }
        return [session, ...prev];
      });
    }
    console.log(`[AIContext] 💾 Saved session ${sessionId} (${serialized.length} msgs)`);
  }, []);

  // ── createAndSetNewSession ──────────────────────────────────────
  const createAndSetNewSession = useCallback((authenticated) => {
    const context = getContextFromURL();
    const newSession = createNewChatSession(context);

    saveChatSession(newSession);
    setCurrentSessionId(newSession.id);
    setCurrentSessionIdState(newSession.id);

    if (authenticated) {
      saveChatSessionToFirestore(newSession);
      saveActiveSessionIdToFirestore(newSession.id);
    }

    setMessages([createWelcomeMessage()]);

    if (!authenticated) {
      setChatHistory(getAllChatSessions());
    }

    console.log(`[AIContext] Started new session ${newSession.id}`);
    return newSession.id;
  }, [getContextFromURL]);

  // ── EFFECT 1: Initialize chat session after auth resolves ───────
  useEffect(() => {
    if (authLoading) {
      console.log('[AIContext] Auth still loading, deferring chat init');
      return;
    }

    let cancelled = false;
    const authed = isAuthed;

    const initChatHistory = async () => {
      sessionInitializedRef.current = true;
      try {
        let history = [];

        if (authed) {
          console.log('[AIContext] Authenticated — loading from Firestore');
          const firestoreHistory = await getAllChatSessionsFromFirestore();
          if (cancelled) return;

          const localHistory = getAllChatSessions();
          if (firestoreHistory.length === 0 && localHistory.length > 0) {
            console.log('[AIContext] Migrating local chat history to Firestore');
            await syncLocalToFirestore(localHistory);
            if (cancelled) return;
            history = localHistory;
          } else {
            history = firestoreHistory;
          }
        } else {
          console.log('[AIContext] Anonymous — using localStorage');
          history = getAllChatSessions();
        }

        if (cancelled) return;
        setChatHistory(history);

        let storedSessionId = getCurrentSessionId();
        if (!storedSessionId && authed) {
          storedSessionId = await getActiveSessionIdFromFirestore();
          if (cancelled) return;
        }

        if (storedSessionId && history.length > 0) {
          let session = history.find(s => s.id === storedSessionId);
          const localSession = getChatSession(storedSessionId);

          if (!session && authed) {
            session = await getChatSessionFromFirestore(storedSessionId);
            if (cancelled) return;
          }
          if (!session) session = localSession;

          if (session && localSession) {
            const fsMsgs = session.messages?.length || 0;
            const lsMsgs = localSession.messages?.length || 0;
            if (lsMsgs > fsMsgs) {
              console.log(`[AIContext] localStorage has more messages (${lsMsgs} vs ${fsMsgs}), using local`);
              session = localSession;
              if (authed) saveChatSessionToFirestore(localSession);
            }
          }

          if (session) {
            setCurrentSessionId(storedSessionId);
            setCurrentSessionIdState(storedSessionId);
            setMessages(formatSessionMessages(session));
            console.log(`[AIContext] Restored session ${storedSessionId} (${(session.messages || []).length} msgs)`);
          } else {
            createAndSetNewSession(authed);
          }
        } else if (history.length > 0) {
          const mostRecent = history[0];
          setCurrentSessionId(mostRecent.id);
          setCurrentSessionIdState(mostRecent.id);
          setMessages(formatSessionMessages(mostRecent));
          console.log(`[AIContext] Loaded most recent session`);
        } else {
          createAndSetNewSession(authed);
        }

        lastPathRef.current = window.location.pathname;
      } catch (error) {
        console.error('[AIContext] Error loading chat history:', error);
        if (cancelled) return;
        setChatHistory(getAllChatSessions());
        createAndSetNewSession(authed);
      }
    };

    initChatHistory();

    return () => {
      cancelled = true;
      sessionInitializedRef.current = false;
    };
  }, [isAuthed, authLoading, getContextFromURL, createAndSetNewSession]);

  // ── EFFECT 2: Firestore listener for session LIST (sidebar) ─────
  useEffect(() => {
    if (sessionsListListenerRef.current) {
      sessionsListListenerRef.current();
      sessionsListListenerRef.current = null;
    }
    if (!isAuthed || authLoading) return;

    const unsub = subscribeToChatSessions((sessions) => {
      setChatHistory(sessions);
    });
    sessionsListListenerRef.current = unsub;

    return () => {
      if (sessionsListListenerRef.current) {
        sessionsListListenerRef.current();
        sessionsListListenerRef.current = null;
      }
    };
  }, [isAuthed, authLoading]);

  // ── EFFECT 3: Firestore listener for CURRENT session (messages) ─
  useEffect(() => {
    if (sessionListenerRef.current) {
      sessionListenerRef.current();
      sessionListenerRef.current = null;
    }
    if (!isAuthed || authLoading || !currentSessionId) return;

    const unsub = subscribeToSession(currentSessionId, (session) => {
      if (!session) return;

      const remoteMsgs = session.messages || [];
      if (remoteMsgs.length === 0) return;

      const localMsgs = messagesRef.current;
      const remoteLastId = remoteMsgs[remoteMsgs.length - 1]?.id || null;
      const localLastId = localMsgs[localMsgs.length - 1]?.id || null;

      if (remoteMsgs.length === localMsgs.length && remoteLastId === localLastId) return;
      if (remoteMsgs.length <= localMsgs.length) return;

      console.log(`[AIContext] 🔄 Remote update: ${remoteMsgs.length} msgs (local: ${localMsgs.length})`);
      setMessages(formatSessionMessages(session));
      saveChatSession({
        ...session,
        messages: remoteMsgs.map(m => serializeMessageForStorage(m)),
      });
    });
    sessionListenerRef.current = unsub;

    return () => {
      if (sessionListenerRef.current) {
        sessionListenerRef.current();
        sessionListenerRef.current = null;
      }
    };
  }, [isAuthed, authLoading, currentSessionId]);

  // ── EFFECT 4: Save when local changes happen ───────────────────
  useEffect(() => {
    if (!pendingSaveRef.current) return;
    if (!currentSessionId || !sessionInitializedRef.current) return;
    if (messages.some(m => m.isStreaming)) return;

    pendingSaveRef.current = false;
    buildAndSaveSession(messages, currentSessionId, isAuthed);
  }, [messages, currentSessionId, isAuthed, buildAndSaveSession]);

  // ── EFFECT 5: beforeunload safety net ──────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!currentSessionId || !sessionInitializedRef.current) return;
      const msgs = messagesRef.current;
      if (msgs.length === 0) return;
      const serialized = msgs.map(m => serializeMessageForStorage(
        m.isStreaming ? { ...m, isStreaming: false } : m
      ));
      const existing = getChatSession(currentSessionId);
      const session = {
        id: currentSessionId,
        title: existing?.title || 'New Chat',
        messages: serialized,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        context: existing?.context || {},
      };
      saveChatSession(session);
      console.log(`[AIContext] 🛡️ beforeunload: saved ${serialized.length} msgs to localStorage`);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentSessionId]);

  // ── Session management functions ───────────────────────────────

  const startNewChatSession = useCallback(() => {
    return createAndSetNewSession(isAuthed);
  }, [createAndSetNewSession, isAuthed]);

  const loadChatSession = useCallback(async (sessionId) => {
    if (loadingSessionRef.current) return;
    if (sessionId === currentSessionId) return;

    loadingSessionRef.current = true;
    console.log(`[AIContext] Loading session: ${sessionId}`);

    try {
      let firestoreSession = null;
      if (isAuthed) {
        firestoreSession = await getChatSessionFromFirestore(sessionId);
      }
      const localSession = getChatSession(sessionId);

      let session = firestoreSession || localSession;
      if (firestoreSession && localSession) {
        const fsMsgs = firestoreSession.messages?.length || 0;
        const lsMsgs = localSession.messages?.length || 0;
        session = lsMsgs > fsMsgs ? localSession : firestoreSession;
      }

      if (session) {
        setCurrentSessionId(sessionId);
        setCurrentSessionIdState(sessionId);
        if (isAuthed) saveActiveSessionIdToFirestore(sessionId);
        setMessages(formatSessionMessages(session));
        console.log(`[AIContext] Loaded session ${sessionId} (${(session.messages || []).length} msgs)`);
      } else {
        console.warn(`[AIContext] Session ${sessionId} not found`);
      }
    } finally {
      loadingSessionRef.current = false;
    }
  }, [currentSessionId, isAuthed]);

  const deleteChatSessionById = useCallback(async (sessionId) => {
    if (isAuthed) {
      await deleteChatSessionFromFirestore(sessionId);
    }
    deleteChatSession(sessionId);

    if (!isAuthed) {
      setChatHistory(getAllChatSessions());
    }

    if (sessionId === currentSessionId) {
      startNewChatSession();
    }
  }, [currentSessionId, startNewChatSession, isAuthed]);

  const renameChatSession = useCallback(async (sessionId, newTitle) => {
    if (isAuthed) {
      await updateChatTitleInFirestore(sessionId, newTitle);
    }
    updateChatTitle(sessionId, newTitle);

    if (!isAuthed) {
      setChatHistory(getAllChatSessions());
    }
  }, [isAuthed]);

  // ── Mark pending save (called by AIProvider when local mutation happens) ──
  const markPendingSave = useCallback(() => {
    pendingSaveRef.current = true;
  }, []);

  return {
    // State
    messages,
    setMessages,
    currentSessionId,
    chatHistory,

    // Session management
    startNewChatSession,
    loadChatSession,
    deleteChatSessionById,
    renameChatSession,

    // For voice callbacks that need refs
    messagesRef,
    currentSessionIdRef,
    isAuthedRef,
    sessionInitializedRef,

    // Save helpers
    buildAndSaveSession,
    markPendingSave,
  };
}
