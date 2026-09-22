// Snapshot liviano ({idFila: hash}) guardado como un único archivo JSON en
// Firebase Storage (no en Firestore): evita el límite de 1 MiB por
// documento (con miles de filas creciendo mes a mes, tarde o temprano lo
// superaría) y no gasta lecturas de Firestore — cuesta 1 descarga + 1
// subida de archivo por corrida, sin importar cuántas filas tenga.
import { ref, uploadString, getBytes } from 'firebase/storage';
import { storage } from '../../../../../../firebaseConfig';

const RUTA_SNAPSHOT = 'snapshots/documentos_sistema/detallesOC.json';

// {} si todavía no existe ningún snapshot (primera importación) — no es un
// error, es el estado inicial esperado.
export const leerSnapshotDetallesOC = async () => {
  try {
    const bytes = await getBytes(ref(storage, RUTA_SNAPSHOT));
    const texto = new TextDecoder().decode(bytes);
    const data = JSON.parse(texto);
    return data?.hashes || {};
  } catch (err) {
    if (err?.code === 'storage/object-not-found') return {};
    console.error('Error al leer el snapshot de Detalles OC:', err);
    throw err;
  }
};

export const guardarSnapshotDetallesOC = async (hashes) => {
  const payload = JSON.stringify({
    version: 1,
    actualizadoEn: new Date().toISOString(),
    totalFilas: Object.keys(hashes).length,
    hashes
  });
  await uploadString(ref(storage, RUTA_SNAPSHOT), payload, 'raw', { contentType: 'application/json' });
};
