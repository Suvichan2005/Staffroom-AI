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
  Timestamp
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
    
    // Prepare data for Firestore
    const firestoreData = {
      ...session,
      updatedAt: serverTimestamp(),
      // Ensure messages have string timestamps
      messages: (session.messages || []).map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date 
          ? msg.timestamp.toISOString() 
          : msg.timestamp,
      })),
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
