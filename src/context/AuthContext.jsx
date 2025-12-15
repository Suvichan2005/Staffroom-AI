import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/client';
import { setStorageUserId, clearStorageUserId } from '../utils/userScopedStorage';
import { seedDemoDataForUser, needsDemoSeeding } from '../data/dummyData';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [demoSeeded, setDemoSeeded] = useState(false);

    useEffect(() => {
        let unsubscribe = () => {};
        (async () => {
            try {
                await setPersistence(auth, indexedDBLocalPersistence);
            } catch (err) {
                console.warn('Failed to set indexedDB persistence, falling back to localStorage', err?.message || err);
                try {
                    await setPersistence(auth, browserLocalPersistence);
                } catch (err2) {
                    console.warn('Failed to set browserLocalPersistence', err2?.message || err2);
                }
            }
            unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    // Set user ID for storage scoping
                    setStorageUserId(user.uid);
                    
                    // Seed demo data for new users
                    if (needsDemoSeeding()) {
                        seedDemoDataForUser();
                        setDemoSeeded(true);
                    } else {
                        setDemoSeeded(true);
                    }
                } else {
                    // Clear user ID on logout
                    clearStorageUserId();
                    setDemoSeeded(false);
                }
                setUser(user);
                setLoading(false);
            });
        })();
        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        return await signInWithPopup(auth, googleProvider);
    }
    const loginWithEmail = async (email, password) => {
        return await signInWithEmailAndPassword(auth, email, password);
    }
    const registerWithEmail = async (email, password) => {
        return await createUserWithEmailAndPassword(auth, email, password);
    }
    const logout = async () => {
        clearStorageUserId();
        return await signOut(auth);
    }

    return (
        <AuthContext.Provider value={{ user, loading, demoSeeded, loginWithGoogle, loginWithEmail, registerWithEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);