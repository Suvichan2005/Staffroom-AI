/**
 * Firestore-based Chat Storage Service
 * Persists chat sessions to Firestore for cross-device sync
 * 
 * Collection structure:
 * users/{userId}/chatSessions/{sessionId}
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from '../firebase/client';

// Helper to get current user ID
const getCurrentUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    console.warn('[FirestoreChat] No authenticated user');
    return null;
  }
  return user.uid;
};

// Helper to get user's chat collection reference
const getUserChatsCollection = () => {
  const userId = getCurrentUserId();
  if (!userId) return null;
  return collection(db, 'users', userId, 'chatSessions');
};

/**
 * Get all chat sessions for the current user from Firestore
 */
export async function getAllChatSessionsFromFirestore() {
  try {
    const chatsRef = getUserChatsCollection();
    if (!chatsRef) return [];

    const q = query(chatsRef, orderBy('updatedAt', 'desc'), limit(50));
    const snapshot = await getDocs(q);
    
    const sessions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert Firestore Timestamps to ISO strings
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });
    
    console.log(`[FirestoreChat] Loaded ${sessions.length} sessions`);
    return sessions;
  } catch (error) {
    console.error('[FirestoreChat] Error loading sessions:', error);
    return [];
  }
}

/**
 * Get a specific chat session from Firestore
 */
export async function getChatSessionFromFirestore(sessionId) {
  try {
    const userId = getCurrentUserId();
    if (!userId) return null;

    const docRef = doc(db, 'users', userId, 'chatSessions', sessionId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    
    const data = snapshot.data();
    return {
      id: snapshot.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
    };
  } catch (error) {
    console.error('[FirestoreChat] Error getting session:', error);
    return null;
  }
}

/**
 * Save or update a chat session in Firestore
 */
export async function saveChatSessionToFirestore(session) {
  try {
    const userId = getCurrentUserId();
    if (!userId) {
      console.warn('[FirestoreChat] Cannot save - no user');
      return null;
    }

    const docRef = doc(db, 'users', userId, 'chatSessions', session.id);
    
    // Prepare data for Firestore - strip any non-serializable fields
    // (File objects, blob URLs, streaming state will cause Firestore to throw)
    const firestoreData = {
      id: session.id,
      title: session.title || 'New Chat',
      context: session.context || {},
      createdAt: session.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp(),
      messages: (session.messages || []).map(msg => {
        const clean = {
          id: msg.id,
          role: msg.role,
          content: msg.content || '',
          timestamp: msg.timestamp instanceof Date 
            ? msg.timestamp.toISOString() 
            : (msg.timestamp || new Date().toISOString()),
        };
        if (msg.thinking) clean.thinking = msg.thinking;
        if (msg.isVoice) clean.isVoice = true;
        if (msg.type) clean.type = msg.type;
        // Attachments: metadata only (no File objects or blob URLs)
        if (msg.attachments && msg.attachments.length > 0) {
          clean.attachments = msg.attachments.map(att => ({
            name: att.name || 'file',
            type: att.type || '',
            mimeType: att.mimeType || att.type || '',
            size: att.size || 0,
          }));
        }
        return clean;
      }),
    };
    
    // Set createdAt only on new sessions
    const existingDoc = await getDoc(docRef);
    if (!existingDoc.exists()) {
      firestoreData.createdAt = serverTimestamp();
    }

    await setDoc(docRef, firestoreData, { merge: true });
    
    console.log(`[FirestoreChat] Saved session ${session.id}`);
    return session;
  } catch (error) {
    console.error('[FirestoreChat] Error saving session:', error);
    return null;
  }
}

/**
 * Delete a chat session from Firestore
 */
export async function deleteChatSessionFromFirestore(sessionId) {
  try {
    const userId = getCurrentUserId();
    if (!userId) return false;

    const docRef = doc(db, 'users', userId, 'chatSessions', sessionId);
    await deleteDoc(docRef);
    
    console.log(`[FirestoreChat] Deleted session ${sessionId}`);
    return true;
  } catch (error) {
    console.error('[FirestoreChat] Error deleting session:', error);
    return false;
  }
}

/**
 * Update chat session title in Firestore
 */
export async function updateChatTitleInFirestore(sessionId, newTitle) {
  try {
    const userId = getCurrentUserId();
    if (!userId) return false;

    const docRef = doc(db, 'users', userId, 'chatSessions', sessionId);
    await setDoc(docRef, { 
      title: newTitle,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('[FirestoreChat] Error updating title:', error);
    return false;
  }
}

/**
 * Sync local storage to Firestore (one-time migration)
 */
export async function syncLocalToFirestore(localSessions) {
  const userId = getCurrentUserId();
  if (!userId || !localSessions?.length) return;

  console.log(`[FirestoreChat] Migrating ${localSessions.length} local sessions to Firestore`);
  
  for (const session of localSessions) {
    await saveChatSessionToFirestore(session);
  }
  
  console.log('[FirestoreChat] Migration complete');
}

// ========================================================================
// REAL-TIME LISTENERS — for cross-device live sync
// ========================================================================

/**
 * Helper: convert a Firestore document snapshot to a clean session object
 */
function docToSession(docSnap) {
  const data = docSnap.data();
  if (!data) return null;
  return {
    id: docSnap.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
  };
}

/**
 * Subscribe to the chat session list (sidebar).
 * Fires `onUpdate(sessions[])` whenever any session is added/modified/deleted.
 * Returns an unsubscribe function.
 */
export function subscribeToChatSessions(onUpdate, onError) {
  const chatsRef = getUserChatsCollection();
  if (!chatsRef) {
    console.warn('[FirestoreChat] subscribeToChatSessions — no auth');
    return () => {};
  }

  const q = query(chatsRef, orderBy('updatedAt', 'desc'), limit(50));

  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(docToSession).filter(Boolean);
    console.log(`[FirestoreChat] 🔄 Real-time sessions update: ${sessions.length} sessions`);
    onUpdate(sessions);
  }, (err) => {
    console.error('[FirestoreChat] Session list listener error:', err);
    if (onError) onError(err);
  });
}

/**
 * Subscribe to a SINGLE chat session (messages).
 * Fires `onUpdate(session)` whenever that document changes (e.g. from another device).
 * Returns an unsubscribe function.
 */
export function subscribeToSession(sessionId, onUpdate, onError) {
  const userId = getCurrentUserId();
  if (!userId || !sessionId) {
    return () => {};
  }

  const docRef = doc(db, 'users', userId, 'chatSessions', sessionId);

  return onSnapshot(docRef, (snapshot) => {
    if (!snapshot.exists()) {
      console.warn(`[FirestoreChat] Session ${sessionId} deleted remotely`);
      onUpdate(null);
      return;
    }
    const session = docToSession(snapshot);
    console.log(`[FirestoreChat] 🔄 Real-time session update: ${sessionId} (${(session?.messages || []).length} msgs)`);
    onUpdate(session);
  }, (err) => {
    console.error(`[FirestoreChat] Session ${sessionId} listener error:`, err);
    if (onError) onError(err);
  });
}

/**
 * Save the user's "active session" pointer to Firestore,
 * so another device can open the same session.
 */
export async function saveActiveSessionIdToFirestore(sessionId) {
  try {
    const userId = getCurrentUserId();
    if (!userId) return;
    const docRef = doc(db, 'users', userId);
    await setDoc(docRef, { activeSessionId: sessionId, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('[FirestoreChat] Error saving active session pointer:', err);
  }
}

/**
 * Load the user's "active session" pointer from Firestore.
 */
export async function getActiveSessionIdFromFirestore() {
  try {
    const userId = getCurrentUserId();
    if (!userId) return null;
    const docRef = doc(db, 'users', userId);
    const snapshot = await getDoc(docRef);
    return snapshot.exists() ? snapshot.data()?.activeSessionId || null : null;
  } catch (err) {
    console.warn('[FirestoreChat] Error loading active session pointer:', err);
    return null;
  }
}
