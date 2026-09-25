const CHANNEL_NAME = "medra-session-sync";
const REQUEST_TIMEOUT_MS = 300;
const FIREBASE_KEY_PREFIX = "firebase:";

const LS_REQUEST_KEY = "__medra_session_sync_request__";
const LS_RESPONSE_PREFIX = "__medra_session_sync_response__:";

function hasBroadcastChannel() {
  return typeof BroadcastChannel !== "undefined";
}

function getFirebaseSessionEntries() {
  const entries = {};
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(FIREBASE_KEY_PREFIX)) {
      entries[key] = sessionStorage.getItem(key);
    }
  }
  return entries;
}

function applySessionEntries(entries) {
  if (!entries) return;
  Object.entries(entries).forEach(([key, value]) => {
    sessionStorage.setItem(key, value);
  });
}

function listenViaBroadcastChannel() {
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event) => {
    const { type, id } = event.data || {};
    if (type !== "REQUEST") return;
    const entries = getFirebaseSessionEntries();
    if (Object.keys(entries).length === 0) return;
    channel.postMessage({ type: "RESPONSE", id, entries });
  };
}

function requestViaBroadcastChannel() {
  return new Promise((resolve) => {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      channel.close();
      resolve(result);
    };

    channel.onmessage = (event) => {
      const data = event.data || {};
      if (data.type === "RESPONSE" && data.id === id) {
        finish(data.entries || null);
      }
    };

    const timer = setTimeout(() => finish(null), REQUEST_TIMEOUT_MS);
    channel.postMessage({ type: "REQUEST", id });
  });
}

function listenViaLocalStorage() {
  window.addEventListener("storage", (event) => {
    if (event.key !== LS_REQUEST_KEY || !event.newValue) return;
    let payload;
    try {
      payload = JSON.parse(event.newValue);
    } catch {
      return;
    }
    const entries = getFirebaseSessionEntries();
    if (Object.keys(entries).length === 0) return;
    const responseKey = LS_RESPONSE_PREFIX + payload.id;
    localStorage.setItem(responseKey, JSON.stringify(entries));
    // Es solo un mensaje de paso: se borra apenas se escribe.
    setTimeout(() => localStorage.removeItem(responseKey), 0);
  });
}

function requestViaLocalStorage() {
  return new Promise((resolve) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const responseKey = LS_RESPONSE_PREFIX + id;
    let settled = false;

    const cleanup = () => {
      window.removeEventListener("storage", onStorage);
      localStorage.removeItem(LS_REQUEST_KEY);
      localStorage.removeItem(responseKey);
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve(result);
    };

    const onStorage = (event) => {
      if (event.key !== responseKey || !event.newValue) return;
      try {
        finish(JSON.parse(event.newValue));
      } catch {
        finish(null);
      }
    };

    window.addEventListener("storage", onStorage);
    const timer = setTimeout(() => finish(null), REQUEST_TIMEOUT_MS);
    localStorage.setItem(LS_REQUEST_KEY, JSON.stringify({ id, ts: Date.now() }));
    setTimeout(() => localStorage.removeItem(LS_REQUEST_KEY), 0);
  });
}

export function listenForSessionRequests() {
  if (hasBroadcastChannel()) {
    listenViaBroadcastChannel();
  } else {
    listenViaLocalStorage();
  }
}

// Tras cerrar sesión la página se recarga (para descartar datos en
// memoria); esta marca evita que en esa recarga se copie la sesión de otra
// pestaña abierta y el usuario quede logueado de nuevo.
const SKIP_SYNC_KEY = "__medra_session_sync_skip__";

export function omitirSincronizacionEnProximaCarga() {
  sessionStorage.setItem(SKIP_SYNC_KEY, "1");
}

export async function syncSessionFromOtherTabs() {
  if (sessionStorage.getItem(SKIP_SYNC_KEY)) {
    sessionStorage.removeItem(SKIP_SYNC_KEY);
    return;
  }

  if (Object.keys(getFirebaseSessionEntries()).length > 0) {
    return;
  }

  const entries = hasBroadcastChannel()
    ? await requestViaBroadcastChannel()
    : await requestViaLocalStorage();

  applySessionEntries(entries);
}
