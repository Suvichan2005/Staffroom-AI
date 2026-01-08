/**
 * useAIProvider Hook
 * 
 * React hook for interacting with the AI provider system.
 * Provides easy access to provider-agnostic AI generation and voice features.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  generateAI,
  generateStreamAI,
  createVoiceSession,
  checkProviderHealth,
  getActiveProvider,
  switchProvider,
} from '../services/providers/index.js';

/**
 * Hook for AI text generation
 */
export function useAIGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const abortControllerRef = useRef(null);

  const generate = useCallback(async (options) => {
    setLoading(true);
    setError(null);
    
    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();
    
    try {
      const response = await generateAI({
        ...options,
        signal: abortControllerRef.current.signal
      });
      
      setResult(response);
      return response;
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('[useAIGenerate] Request cancelled');
        return null;
      }
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    generate,
    cancel,
    reset,
    loading,
    error,
    result
  };
}

/**
 * Hook for AI streaming generation
 */
export function useAIStream() {
  const [streaming, setStreaming] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [complete, setComplete] = useState(false);
  const abortRef = useRef(false);

  const stream = useCallback(async (options) => {
    setStreaming(true);
    setError(null);
    setText('');
    setComplete(false);
    abortRef.current = false;
    
    try {
      const result = await generateStreamAI(options, (chunk) => {
        if (abortRef.current) return;
        setText(prev => prev + chunk);
      });
      
      if (!abortRef.current) {
        setComplete(true);
      }
      return result;
    } catch (err) {
      if (!abortRef.current) {
        setError(err);
      }
      throw err;
    } finally {
      setStreaming(false);
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current = true;
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setText('');
    setError(null);
    setComplete(false);
  }, []);

  return {
    stream,
    cancel,
    reset,
    streaming,
    text,
    error,
    complete
  };
}

/**
 * Hook for voice/speech functionality
 */
export function useAIVoice() {
  const [session, setSession] = useState(null);
  const [connected, setConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const sessionRef = useRef(null);

  const startSession = useCallback(async (options = {}) => {
    if (sessionRef.current) {
      console.warn('[useAIVoice] Session already active');
      return sessionRef.current;
    }

    try {
      const voiceSession = await createVoiceSession({
        ...options,
        onTranscript: (text, isFinal) => {
          setTranscript(prev => isFinal ? text : prev + text);
          options.onTranscript?.(text, isFinal);
        },
        onConnected: () => {
          setConnected(true);
          options.onConnected?.();
        },
        onDisconnected: () => {
          setConnected(false);
          options.onDisconnected?.();
        },
        onError: (err) => {
          setError(err);
          options.onError?.(err);
        }
      });

      sessionRef.current = voiceSession;
      setSession(voiceSession);
      
      // Start the session
      await voiceSession.start();
      
      return voiceSession;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, []);

  const stopSession = useCallback(async () => {
    if (sessionRef.current) {
      await sessionRef.current.stop();
      sessionRef.current = null;
      setSession(null);
      setConnected(false);
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return {
    startSession,
    stopSession,
    clearTranscript,
    session,
    connected,
    transcript,
    error
  };
}

/**
 * Hook for provider management
 */
export function useAIProvider() {
  const [provider, setProvider] = useState(() => getActiveProvider('text'));
  const [health, setHealth] = useState({ available: false, checked: false });
  const [checking, setChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const result = await checkProviderHealth('text');
      setHealth({ ...result, checked: true });
      return result;
    } catch (err) {
      setHealth({ available: false, error: err.message, checked: true });
      return { available: false, error: err.message };
    } finally {
      setChecking(false);
    }
  }, []);

  const changeProvider = useCallback(async (newProvider) => {
    switchProvider('text', newProvider);
    setProvider(newProvider);
    
    // Check health of new provider
    const result = await checkHealth();
    return result.available;
  }, [checkHealth]);

  // Initial health check
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    provider,
    changeProvider,
    checkHealth,
    health,
    checking,
    availableProviders: ['azure', 'gemini', 'mock']
  };
}

/**
 * Combined hook for common AI operations
 */
export function useAI() {
  const generate = useAIGenerate();
  const stream = useAIStream();
  const voice = useAIVoice();
  const providerInfo = useAIProvider();

  return {
    // Generation
    generate: generate.generate,
    generateLoading: generate.loading,
    generateError: generate.error,
    generateResult: generate.result,
    cancelGenerate: generate.cancel,
    
    // Streaming
    stream: stream.stream,
    streamText: stream.text,
    streaming: stream.streaming,
    streamComplete: stream.complete,
    cancelStream: stream.cancel,
    
    // Voice
    startVoice: voice.startSession,
    stopVoice: voice.stopSession,
    voiceConnected: voice.connected,
    transcript: voice.transcript,
    clearTranscript: voice.clearTranscript,
    
    // Provider
    provider: providerInfo.provider,
    changeProvider: providerInfo.changeProvider,
    providerHealth: providerInfo.health,
    checkProviderHealth: providerInfo.checkHealth
  };
}

export default useAI;
