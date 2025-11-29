import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setPersistence(auth, browserLocalPersistence).catch((err) => {
            console.warn('Failed to set auth persistence', err?.message || err);
        });
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
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
        return await signOut(auth);
    }

    return (
        <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);