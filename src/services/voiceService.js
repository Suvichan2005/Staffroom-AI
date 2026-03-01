/**
 * Voice Recording & Transcription Service
 * 
 * Supports:
 * 1. Browser Web Speech API (free, works offline) — primary
 * 2. OpenAI Whisper API (via backend proxy) — not yet implemented
 */

import { blobToBase64 } from './aiApiClient';

/**
 * Check if browser supports Web Speech API
 */
export function isSpeechRecognitionSupported() {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

/**
 * Transcribe using Browser's Web Speech API (free!)
 * 
 * @param {object} options - { onResult, onError, onInterim, manualStop }
 * @returns {object} - Recognition instance with start/stop methods
 */
export function startBrowserTranscription(options = {}) {
  const { onResult, onError, onInterim, manualStop = true } = options;
  
  // Support legacy signature: (onResult, onError)
  const resultCallback = typeof options === 'function' ? options : onResult;
  const errorCallback = typeof arguments[1] === 'function' ? arguments[1] : onError;
  
  if (!isSpeechRecognitionSupported()) {
    errorCallback?.(new Error('Speech recognition not supported in this browser'));
    return null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();

  recognition.lang = 'en-IN'; // Indian English
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let finalTranscript = '';
  let interimTranscript = '';
  let stopped = false;
  let restartOnEnd = false; // For handling browser auto-restarts

  recognition.onresult = (event) => {
    interimTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        finalTranscript += res[0].transcript + ' ';
      } else {
        interimTranscript += res[0].transcript;
      }
    }
    
    // Callback for live interim results
    if (onInterim) {
      onInterim({
        interim: interimTranscript,
        final: finalTranscript.trim(),
        combined: (finalTranscript + interimTranscript).trim()
      });
    }
  };

  recognition.onerror = (event) => {
    // Handle 'no-speech' gracefully in manual mode - just restart
    if (event.error === 'no-speech' && manualStop && !stopped) {
      restartOnEnd = true;
      return;
    }
    // Handle 'aborted' when manually stopped
    if (event.error === 'aborted' && stopped) {
      return;
    }
    errorCallback?.(new Error(event.error));
  };

  // Don't auto-stop when user pauses speaking in manual mode
  recognition.onspeechend = () => {
    if (!manualStop) {
      try { recognition.stop(); } catch (_) {}
    }
    // In manual mode, let it continue listening
  };

  recognition.onend = () => {
    // If we should restart (browser auto-stopped but user didn't press stop)
    if (restartOnEnd && !stopped) {
      restartOnEnd = false;
      try { 
        recognition.start(); 
      } catch (_) {
        // If restart fails, finalize
        stopped = true;
        finalize();
      }
      return;
    }
    
    stopped = true;
    finalize();
  };
  
  function finalize() {
    const combined = (finalTranscript || interimTranscript).trim();
    if (combined) {
      resultCallback?.({ transcript: combined, confidence: 0.9, method: 'browser' });
    } else {
      errorCallback?.(new Error('No speech detected'));
    }
  }
  
  // Add a manual stop method that properly finalizes
  recognition.manualStop = () => {
    stopped = true;
    restartOnEnd = false;
    try { recognition.stop(); } catch (_) {}
  };
  
  // Expose transcript getter for live access
  recognition.getTranscript = () => ({
    interim: interimTranscript,
    final: finalTranscript.trim(),
    combined: (finalTranscript + interimTranscript).trim()
  });

  return recognition;
}

/**
 * Transcribe using OpenAI Whisper API (via backend proxy)
 * 
 * NOTE: Whisper transcription is not yet available through the backend.
 * Falls back to browser Web Speech API instead. When the backend adds a
 * `/api/ai/transcribe` endpoint this can be wired up.
 * 
 * @param {Blob} audioBlob - Recorded audio
 * @returns {Promise<object>} - { transcript, confidence }
 */
export async function transcribeWithWhisper(audioBlob) {
  throw new Error(
    'Whisper transcription is not available yet. Use browser Web Speech API (startBrowserTranscription) instead.'
  );
}

/**
 * Record audio and transcribe (Smart method selection)
 * 
 * @param {object} options - { preferWhisper, onProgress }
 * @returns {Promise<object>} - { transcript, confidence, method }
 */
export async function recordAndTranscribe(options = {}) {
  const { preferWhisper = false, onProgress } = options;

  return new Promise((resolve, reject) => {
    // Always use browser method (free, zero API keys required)
    if (onProgress) onProgress({ status: 'listening', method: 'browser' });

    const recognition = startBrowserTranscription(
      (result) => resolve(result),
      (error) => reject(error)
    );

    if (recognition) {
      recognition.start();
    } else {
      reject(new Error('Speech recognition not available'));
    }
  });
}

/**
 * Record audio using MediaRecorder API
 * 
 * @param {number} maxDuration - Max recording time in ms (default: 30s)
 * @returns {Promise<Blob>} - Audio blob
 */
function recordAudio(maxDuration = 300000) {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        resolve(audioBlob);
      };

      mediaRecorder.start();

      // Auto-stop after maxDuration
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, maxDuration);

    } catch (error) {
      reject(error);
    }
  });
}

export default {
  isSpeechRecognitionSupported,
  startBrowserTranscription,
  transcribeWithWhisper,
  recordAndTranscribe,
};
