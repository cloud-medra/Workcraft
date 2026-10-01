// Caché local del índice de OC en IndexedDB (puede tener miles de filas:
// localStorage se queda corto). Guarda { version, indice } y se compara
// contra ocImport/meta.version: si coincide, no se descarga nada.
// Si IndexedDB no está disponible (modo privado, tests) se cae a memoria.
// Contiene nombres de pacientes: se borra al cerrar sesión
// (limpiarCacheAlCerrarSesion en firebaseConfig.js).
export const NOMBRE_DB_INDICE_OC = 'workcraft_indice_oc';
const STORE = 'kv';
const CLAVE = 'indiceOC';

let enMemoria = null;

const abrir = () => new Promise((resolve, reject) => {
  const req = indexedDB.open(NOMBRE_DB_INDICE_OC, 1);
  req.onupgradeneeded = () => req.result.createObjectStore(STORE);
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const operar = async (modo, fn) => {
  const db = await abrir();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, modo);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
};

export const leerCacheIndiceOC = async () => {
  if (enMemoria) return enMemoria;
  try {
    enMemoria = (await operar('readonly', s => s.get(CLAVE))) || null;
  } catch (err) {
    console.warn('No se pudo leer la caché local del índice OC:', err);
  }
  return enMemoria;
};

export const guardarCacheIndiceOC = async (valor) => {
  enMemoria = valor;
  try {
    await operar('readwrite', s => s.put(valor, CLAVE));
  } catch (err) {
    console.warn('No se pudo guardar la caché local del índice OC (queda solo en memoria):', err);
  }
};
