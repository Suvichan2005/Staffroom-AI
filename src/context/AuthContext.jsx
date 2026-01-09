import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/client';
import { setStorageUserId, clearStorageUserId } from '../utils/userScopedStorage';
import { seedDemoDataForUser, needsDemoSeeding } from '../data/dummyData';
import { logAuthEvent, logInfo, LogCategory, setLoggerUserEmail } from '../services/activityLogger';

const AuthContext = createContext();

// Track if we've already logged the session restore for this session
let sessionRestoreLogged = false;

export function AuthProvider({ children }) {
    // Check if Firebase has cached auth state to prevent loading flash
    const initialUser = auth.currentUser;
    const [user, setUser] = useState(initialUser);
    const [loading, setLoading] = useState(!initialUser); // Don't show loading if user already cached
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
            unsubscribe = onAuthStateChanged(auth, async (user) => {
                if (user) {
                    // Set user ID for storage scoping
                    setStorageUserId(user.uid);
                    
                    // Set logger email FIRST before any logging
                    setLoggerUserEmail(user.email);
                    
                    // Log auth state restored (only once per session to avoid duplicates)
                    if (!sessionRestoreLogged) {
                        sessionRestoreLogged = true;
                        logInfo(LogCategory.AUTH, 'Session restored', {
                            userId: user.uid,
                            email: user.email,
                        });
                    }
                    
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
                    setLoggerUserEmail(null);
                    setDemoSeeded(false);
                    // Reset session restore flag on logout so next login is logged
                    sessionRestoreLogged = false;
                }
                setUser(user);
                setLoading(false);
            });
        })();
        return () => unsubscribe();
    }, []);

    const loginWithGoogle = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        // Log successful Google login with IP
        await logAuthEvent('login_google', result.user, {
            isNewUser: result._tokenResponse?.isNewUser || false,
        });
        return result;
    }
    const loginWithEmail = async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        // Log successful email login with IP
        await logAuthEvent('login_email', result.user);
        return result;
    }
    const registerWithEmail = async (email, password) => {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        // Log new user registration with IP
        await logAuthEvent('register', result.user);
        return result;
    }
    const logout = async () => {
        // Log logout before clearing user
        if (user) {
            await logAuthEvent('logout', user);
        }
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
