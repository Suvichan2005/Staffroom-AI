/**
 * AIContext — Pure helper/utility functions
 */

/** Read a File as base64 (strip data URL prefix, return only base64) */
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/** Read a File as text */
export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Serialize a message for safe storage (localStorage + Firestore).
 * Strips non-serializable fields: File objects, blob URLs, streaming state.
 */
export function serializeMessageForStorage(msg) {
  const serialized = {
    id: msg.id,
    role: msg.role,
    content: msg.content || '',
    timestamp: msg.timestamp instanceof Date ? msg.timestamp.toISOString() : (msg.timestamp || new Date().toISOString()),
  };
  if (msg.thinking) serialized.thinking = msg.thinking;
  if (msg.isVoice) serialized.isVoice = true;
  if (msg.type) serialized.type = msg.type;
  // Attachments: keep metadata only (strip File objects, blob URLs)
  if (msg.attachments && msg.attachments.length > 0) {
    serialized.attachments = msg.attachments.map(att => ({
      name: att.name,
      type: att.type,
      mimeType: att.mimeType,
      size: att.size,
      ...(att.previewUrl && !att.previewUrl.startsWith('blob:') ? { previewUrl: att.previewUrl } : {}),
    }));
  }
  return serialized;
}

/** Create a text progress bar (e.g. "████░░░░░░ 40%") */
export function getProgressBar(percent) {
  const filled = Math.round(percent / 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

/** Default welcome message object */
export function createWelcomeMessage() {
  return {
    id: 'welcome',
    role: 'assistant',
    content: "Hi! I'm your AI teaching assistant. I can help you with lesson planning, generate quizzes, track student progress, and more. What would you like help with?",
    timestamp: new Date(),
  };
}

/** Format session messages for display (convert timestamps, add welcome fallback) */
export function formatSessionMessages(session) {
  const msgs = (session?.messages || []).map(msg => ({
    ...msg,
    timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
  }));
  return msgs.length > 0 ? msgs : [createWelcomeMessage()];
}
