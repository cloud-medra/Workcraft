// Persistencia del índice de OC:
//   - El índice completo es UN archivo JSON en Firebase Storage (mismo
//     criterio que el snapshot de hashes de Importar Detalles OC: no gasta
//     lecturas de Firestore y no choca con el límite de 1 MiB por documento).
//   - ocImport/meta es un documento chico en Firestore con la versión. Es lo
//     único que se lee en cada sincronización (1 lectura); el archivo se
//     descarga solo si la versión cambió respecto de la caché local.
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadString, getBytes } from 'firebase/storage';
import { db, storage } from '../../../../../firebaseConfig';
import { rangoFechasIndiceOC, FORMATO_INDICE_OC } from './indiceOC';
import { leerCacheIndiceOC, guardarCacheIndiceOC } from './cacheIndiceOC';

const RUTA_INDICE = 'snapshots/indiceOC/indiceOC.json';
const refMeta = () => doc(db, 'ocImport', 'meta');

// Índice completo desde Storage ({} si todavía no existe).
export const descargarIndiceOC = async () => {
  try {
    const bytes = await getBytes(ref(storage, RUTA_INDICE));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    // Índice de un formato anterior: se descarta (se rearma al importar).
    if (data?.formato !== FORMATO_INDICE_OC) return { indice: {}, version: null };
    return { indice: data?.indice || {}, version: data?.version || null };
  } catch (err) {
    if (err?.code === 'storage/object-not-found') return { indice: {}, version: null };
    throw err;
  }
};

// Sube el índice y publica la nueva versión en ocImport/meta (1 escritura).
// La versión nueva invalida la caché local de todos los clientes. La caché
// de este cliente queda al día sin volver a descargar.
export const publicarIndiceOC = async (indice) => {
  const version = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const totalEntradas = Object.keys(indice).length;
  await uploadString(
    ref(storage, RUTA_INDICE),
    JSON.stringify({ formato: FORMATO_INDICE_OC, version, actualizadoEn: new Date().toISOString(), totalEntradas, indice }),
    'raw',
    { contentType: 'application/json' }
  );
  await setDoc(refMeta(), {
    version,
    totalEntradas,
    ...rangoFechasIndiceOC(indice),
    updatedAt: serverTimestamp()
  }, { merge: true });
  await guardarCacheIndiceOC({ version, indice });
  return version;
};

// Meta (1 lectura) + índice: desde la caché local si la versión coincide,
// o descargado de Storage (0 lecturas de Firestore) si cambió.
export const obtenerIndiceOC = async () => {
  const snap = await getDoc(refMeta());
  if (!snap.exists()) return { meta: null, indice: {}, desdeCache: false };
  const meta = snap.data();

  const cache = await leerCacheIndiceOC();
  if (cache?.version === meta.version) return { meta, indice: cache.indice, desdeCache: true };

  const { indice } = await descargarIndiceOC();
  await guardarCacheIndiceOC({ version: meta.version, indice });
  return { meta, indice, desdeCache: false };
};

export const registrarSincronizacionOC = (version) =>
  updateDoc(refMeta(), { ultimaSyncVersion: version, ultimaSyncEn: serverTimestamp() });
