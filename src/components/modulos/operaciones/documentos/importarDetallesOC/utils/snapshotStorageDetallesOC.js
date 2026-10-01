// Snapshot de comparación de Importar Detalles OC: UN archivo JSON en
// Storage (no en Firestore: no gasta lecturas y no choca con el límite de
// 1 MiB por documento). Formato 2:
//   { formato: 2, version, actualizadoEn, totalFilas, filas: { [id]: entrada } }
// con los valores de cada fila (ver planificarImportacion.js), para comparar
// campo por campo y no pisar valores con vacíos.
//
// La versión vigente se publica en ocImport/meta.snapshotDetallesVersion. Al
// importar se lee ese meta (1 lectura) y el snapshot sale de la caché local
// (IndexedDB) si la versión coincide; si no, se descarga de Storage.
import { ref, uploadString, getBytes } from 'firebase/storage';
import { collectionGroup, query, where, orderBy, limit, startAfter, getDocs, documentId, doc, setDoc } from 'firebase/firestore';
import { storage, db } from '../../../../../../firebaseConfig';
import { leerCacheLocal, guardarCacheLocal } from '../../../shared/ocIndex/cacheIndiceOC';
import { FORMATO_SNAPSHOT, entradaSnapshot, valoresDeFila } from './planificarImportacion';
import { grupoFilaDetalleOC } from './idFilaDetalleOC';

const RUTA_SNAPSHOT = 'snapshots/documentos_sistema/detallesOC.json';
const CLAVE_CACHE = 'snapshotDetallesOC';

export class SnapshotAntiguoError extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'SnapshotAntiguoError';
  }
}

const MENSAJE_RECONSTRUIR = 'El snapshot de comparación está en el formato antiguo (o no se encuentra). '
  + 'Un administrador debe ejecutar "Reconstruir snapshot" antes de importar.';

const descargar = async () => {
  try {
    const bytes = await getBytes(ref(storage, RUTA_SNAPSHOT));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (err) {
    if (err?.code === 'storage/object-not-found') return null;
    throw err;
  }
};

// Snapshot vigente según el meta ya leído: { filas, version, desdeCache }.
// Lanza SnapshotAntiguoError si hay que reconstruirlo antes de importar.
export const obtenerSnapshotDetallesOC = async (meta) => {
  const versionMeta = meta?.snapshotDetallesVersion || null;
  if (versionMeta) {
    const cache = await leerCacheLocal(CLAVE_CACHE);
    if (cache?.version === versionMeta) return { filas: cache.filas, version: versionMeta, desdeCache: true };
  }
  const data = await descargar();
  if (!data) {
    // Sin archivo y sin versión publicada: primera importación de todas.
    if (!versionMeta) return { filas: {}, version: null, desdeCache: false };
    throw new SnapshotAntiguoError(MENSAJE_RECONSTRUIR);
  }
  if (data.formato !== FORMATO_SNAPSHOT) throw new SnapshotAntiguoError(MENSAJE_RECONSTRUIR);
  await guardarCacheLocal(CLAVE_CACHE, { version: data.version, filas: data.filas });
  return { filas: data.filas || {}, version: data.version, desdeCache: false };
};

// Sube el snapshot y lo deja en la caché local. Devuelve la versión nueva,
// que quien llama publica en ocImport/meta.
export const guardarSnapshotDetallesOC = async (filas) => {
  const version = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const payload = JSON.stringify({
    formato: FORMATO_SNAPSHOT,
    version,
    actualizadoEn: new Date().toISOString(),
    totalFilas: Object.keys(filas).length,
    filas
  });
  await uploadString(ref(storage, RUTA_SNAPSHOT), payload, 'raw', { contentType: 'application/json' });
  await guardarCacheLocal(CLAVE_CACHE, { version, filas });
  return version;
};

export const camposMetaSnapshot = (version) => ({
  snapshotDetallesVersion: version,
  snapshotDetallesFormato: FORMATO_SNAPSHOT,
  snapshotDetallesActualizadoEn: new Date().toISOString()
});

// Documento de Firestore -> entrada del snapshot (mismos valores que daría
// la fila del Excel).
export const entradaDesdeDocumento = (data) => {
  const fila = { ...data, fecha_cx: typeof data.fecha_cx?.toDate === 'function' ? data.fecha_cx.toDate() : data.fecha_cx };
  return entradaSnapshot({ ...fila, _grupo: grupoFilaDetalleOC(fila) }, valoresDeFila(fila));
};

// Acción de una sola vez (admin/dev): arma el snapshot formato 2 leyendo
// TODAS las filas de documentos_sistema (1 lectura por fila, en páginas de
// 1000). Misma forma de consulta que las pantallas de documentos
// (rango + orden descendente sobre __name__, índice ya desplegado).
const TAMANO_PAGINA = 1000;
export const reconstruirSnapshotDetallesOC = async ({ onProgreso } = {}) => {
  const filas = {};
  let lecturas = 0;
  let ultimo = null;
  for (;;) {
    const restricciones = [
      where(documentId(), '>=', 'documentos_sistema/0000'),
      where(documentId(), '<', 'documentos_sistema/9999'),
      orderBy(documentId(), 'desc'),
      limit(TAMANO_PAGINA)
    ];
    if (ultimo) restricciones.push(startAfter(ultimo));
    const snap = await getDocs(query(collectionGroup(db, 'detalles'), ...restricciones));
    lecturas += Math.max(1, snap.size);
    snap.docs.forEach((d) => { filas[d.id] = entradaDesdeDocumento(d.data()); });
    onProgreso?.({ leidas: Object.keys(filas).length });
    if (snap.size < TAMANO_PAGINA) break;
    ultimo = snap.docs[snap.docs.length - 1];
  }
  const version = await guardarSnapshotDetallesOC(filas);
  await setDoc(doc(db, 'ocImport', 'meta'), camposMetaSnapshot(version), { merge: true });
  return { filas, version, lecturas, escrituras: 1, totalFilas: Object.keys(filas).length };
};
