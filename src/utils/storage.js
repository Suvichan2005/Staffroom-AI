const isBrowser = typeof window !== "undefined";

const getNamespacedKey = (key) => `staffroom:${key}`;

export function loadState(key, fallback) {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(getNamespacedKey(key));
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveState(key, value) {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(getNamespacedKey(key), JSON.stringify(value));
  } catch {
    /* swallow */
  }
}

export function removeState(key) {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(getNamespacedKey(key));
  } catch {
    /* swallow */
  }
}

export function resetNamespace() {
  if (!isBrowser) return;
  try {
    const keys = Object.keys(window.localStorage);
    keys.forEach((key) => {
      if (key.startsWith("staffroom:")) {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    /* swallow */
  }
}
