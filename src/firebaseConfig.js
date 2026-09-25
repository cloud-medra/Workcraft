import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  terminate,
  clearIndexedDbPersistence
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

setPersistence(auth, browserSessionPersistence);

// =====================================================================
// Firestore con caché persistente (IndexedDB) compartida entre pestañas
// =====================================================================
// Al volver a una pantalla o reabrir un listener dentro de los 30 min, el
// SDK reutiliza lo guardado y solo cobra lo que cambió. Reglas de seguridad
// de la caché (las reglas de Firestore NO se aplican a lo que ya está en
// IndexedDB):
//   - Al cerrar sesión se borra (limpiarCacheAlCerrarSesion).
//   - Al iniciar sesión, si la caché es de otro usuario (o quedó una
//     limpieza pendiente) se borra ANTES de la primera consulta
//     (prepararCacheParaUsuario). Hace falta porque con la sesión por
//     pestaña (browserSessionPersistence) cerrar la pestaña no pasa por
//     signOut.
//   - clearIndexedDbPersistence falla si otra pestaña tiene la caché
//     abierta: queda marcada para limpiar en el próximo inicio de sesión y,
//     si el usuario que entra es otro, esta pestaña trabaja con caché en
//     memoria para no leer datos ajenos.
//   - Sin IndexedDB (o si falla al inicializar) se usa caché en memoria.
//
// `db` es `let`: los módulos que hacen `import { db }` reciben siempre la
// instancia vigente (binding vivo de ES modules) tras reinicializarla.
const CLAVE_UID_CACHE = '__fs_cache_uid__';
const CLAVE_LIMPIEZA_PENDIENTE = '__fs_cache_limpiar__';

const leerLS = (clave) => { try { return localStorage.getItem(clave); } catch { return null; } };
const escribirLS = (clave, valor) => { try { localStorage.setItem(clave, valor); } catch { /* sin storage */ } };
const borrarLS = (clave) => { try { localStorage.removeItem(clave); } catch { /* sin storage */ } };

const indexedDbDisponible = () => {
  try { return typeof indexedDB !== 'undefined' && indexedDB !== null; } catch { return false; }
};

let usandoPersistencia = false;

const crearFirestore = (persistente = true) => {
  if (persistente && indexedDbDisponible()) {
    try {
      const instancia = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
      usandoPersistencia = true;
      return instancia;
    } catch (error) {
      console.warn('Caché persistente de Firestore no disponible; se usa caché en memoria.', error);
    }
  }
  usandoPersistencia = false;
  return initializeFirestore(app, { localCache: memoryLocalCache() });
};

export let db = crearFirestore();

// Termina la instancia actual e intenta borrar la caché de IndexedDB.
// Devuelve true si quedó borrada. La instancia queda terminada: el
// llamador debe crear una nueva con crearFirestore().
const terminarYLimpiar = async () => {
  try {
    await terminate(db);
  } catch (error) {
    console.warn('No se pudo terminar Firestore:', error);
  }
  try {
    await clearIndexedDbPersistence(db);
    borrarLS(CLAVE_LIMPIEZA_PENDIENTE);
    return true;
  } catch (error) {
    // failed-precondition: otra pestaña tiene la caché abierta.
    console.warn('No se pudo borrar la caché local de Firestore; queda pendiente.', error?.code || error);
    escribirLS(CLAVE_LIMPIEZA_PENDIENTE, '1');
    return false;
  }
};

let preparacionEnCurso = null;

/**
 * Debe llamarse (y esperarse) al detectar el usuario autenticado, antes de
 * cualquier lectura. Si la caché local pertenece a otro usuario o quedó una
 * limpieza pendiente, la borra y reinicializa Firestore.
 */
export const prepararCacheParaUsuario = (uid) => {
  if (!usandoPersistencia && leerLS(CLAVE_LIMPIEZA_PENDIENTE) !== '1') return Promise.resolve();
  if (preparacionEnCurso) return preparacionEnCurso;

  const anterior = leerLS(CLAVE_UID_CACHE);
  const pendiente = leerLS(CLAVE_LIMPIEZA_PENDIENTE) === '1';
  if (anterior === uid && !pendiente) return Promise.resolve();

  preparacionEnCurso = (async () => {
    const limpia = await terminarYLimpiar();
    if (limpia || anterior === uid) {
      // Caché vacía, o con datos del mismo usuario: se puede persistir.
      escribirLS(CLAVE_UID_CACHE, uid);
      db = crearFirestore(true);
    } else {
      // Otra pestaña mantiene abierta la caché de OTRO usuario: esta
      // pestaña trabaja aislada en memoria hasta que se pueda limpiar.
      db = crearFirestore(false);
    }
  })().finally(() => { preparacionEnCurso = null; });

  return preparacionEnCurso;
};

/**
 * Al cerrar sesión: termina Firestore (cierra todos los listeners) y borra
 * la caché local. Si otra pestaña la tiene abierta, queda marcada para
 * limpiarse en el próximo inicio de sesión. Después de esto hay que
 * recargar la página (ver handleLogout en Dashboard) para descartar también
 * los datos que quedaron en memoria.
 */
export const limpiarCacheAlCerrarSesion = async () => {
  await terminarYLimpiar();
  borrarLS(CLAVE_UID_CACHE);
};

export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");
