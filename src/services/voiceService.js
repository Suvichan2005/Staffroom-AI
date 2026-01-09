/**
 * Voice Recording & Transcription Service
 * 
 * Supports:
 * 1. Browser Web Speech API (free, works offline)
 * 2. OpenAI Whisper API (more accurate, requires API key)
 */

import { transcribeAudio, blobToBase64 } from './aiApiClient';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// In production, we use Firebase Cloud Functions proxy (API keys are server-side)
// Disable proxy - use direct browser API calls
const USE_PROXY = false;

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
 * Transcribe using OpenAI Whisper API (more accurate)
 * 
 * @param {Blob} audioBlob - Recorded audio
 * @returns {Promise<object>} - { transcript, confidence }
 */
export async function transcribeWithWhisper(audioBlob) {
  // Use proxy in production (API keys are server-side)
  if (USE_PROXY) {
    try {
      const audio = await blobToBase64(audioBlob);
      const result = await transcribeAudio({
        audio,
        mimeType: audioBlob.type || 'audio/webm'
      });
      
      return {
        transcript: result.text,
        confidence: 0.95,
        method: 'whisper-proxy'
      };
    } catch (error) {
      console.error('Whisper Proxy error:', error);
      throw error;
    }
  }
  
  // Direct API call (development mode)
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Using browser transcription instead.');
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Whisper API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      transcript: data.text,
      confidence: 0.95, // Whisper doesn't provide confidence, assume high
      method: 'whisper'
    };
  } catch (error) {
    console.error('Whisper API error:', error);
    throw error;
  }
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
    // Try browser method first (always works, free)
    if (!preferWhisper || !OPENAI_API_KEY) {
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
    } else {
      // Use Whisper API (requires recording audio first)
      recordAudio()
        .then(async (audioBlob) => {
          if (onProgress) onProgress({ status: 'transcribing', method: 'whisper' });
          const result = await transcribeWithWhisper(audioBlob);
          resolve(result);
        })
        .catch(reject);
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
