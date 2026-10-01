// Caché local del índice de OC en IndexedDB (puede tener miles de filas:
// localStorage se queda corto). Guarda { version, indice } y se compara
// contra ocImport/meta.version: si coincide, no se descarga nada.
// Si IndexedDB no está disponible (modo privado, tests) se cae a memoria.
// Contiene nombres de pacientes: se borra al cerrar sesión
// (limpiarCacheAlCerrarSesion en firebaseConfig.js).
export const NOMBRE_DB_INDICE_OC = 'workcraft_indice_oc';
const STORE = 'kv';
const CLAVE = 'indiceOC';


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

// Caché genérica por clave en la misma base (también la usa el snapshot de
// Importar Detalles OC). En memoria se guarda la última lectura de cada clave.
const enMemoriaPorClave = new Map();

export const leerCacheLocal = async (clave) => {
  if (enMemoriaPorClave.has(clave)) return enMemoriaPorClave.get(clave);
  let valor = null;
  try {
    valor = (await operar('readonly', s => s.get(clave))) || null;
  } catch (err) {
    console.warn(`No se pudo leer la caché local (${clave}):`, err);
  }
  if (valor) enMemoriaPorClave.set(clave, valor);
  return valor;
};

export const guardarCacheLocal = async (clave, valor) => {
  enMemoriaPorClave.set(clave, valor);
  try {
    await operar('readwrite', s => s.put(valor, clave));
  } catch (err) {
    console.warn(`No se pudo guardar la caché local (${clave}); queda solo en memoria:`, err);
  }
};

export const leerCacheIndiceOC = () => leerCacheLocal(CLAVE);
export const guardarCacheIndiceOC = (valor) => guardarCacheLocal(CLAVE, valor);
