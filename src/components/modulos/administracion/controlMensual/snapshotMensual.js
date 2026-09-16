import { doc, getDoc, setDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { COLECCIONES } from './constants';

const idSnapshot = (anio, mesId, moduloId) => `${anio}_${mesId}_${moduloId}`;

// Suma los documentos crudos de un módulo/mes/año. Costosa: solo debe usarse
// al cerrar un período (una vez) o como fallback lazy si no hay snapshot guardado.
export const calcularTotalMesDesdeDocumentos = async (moduloId, anio, mesId) => {
  try {
    const docsRef = collection(db, `${moduloId}_imputadas`, String(anio), "meses", mesId, "documentos");
    const snap = await getDocs(docsRef);
    let montoTotal = 0;
    snap.docs.forEach(d => { montoTotal += Number(d.data().total || 0); });
    return { cantidad: snap.size, montoTotal };
  } catch {
    return { cantidad: 0, montoTotal: 0 };
  }
};

export const guardarSnapshotMensual = async (moduloId, anio, mesId, { cantidad, montoTotal }, origen = 'cierre') => {
  const ref = doc(db, COLECCIONES.IMPUTACIONES, idSnapshot(anio, mesId, moduloId));
  await setDoc(ref, {
    anio: String(anio),
    mes: mesId,
    modulo: moduloId,
    cantidad,
    montoTotal,
    origen,
    generadoEn: serverTimestamp()
  }, { merge: true });
};

// Se llama al reabrir un período cerrado: el snapshot deja de ser confiable
// porque puede haber correcciones retroactivas. Se borra y se regenera en el
// próximo cierre (o vía fallback lazy si se consulta antes de volver a cerrarlo).
export const invalidarSnapshotMensual = async (moduloId, anio, mesId) => {
  const ref = doc(db, COLECCIONES.IMPUTACIONES, idSnapshot(anio, mesId, moduloId));
  await deleteDoc(ref).catch(() => {});
};

// Lee el snapshot guardado; si no existe (mes histórico nunca cerrado con este
// mecanismo), lo calcula una única vez desde los documentos crudos y lo cachea.
export const obtenerSnapshotMensual = async (moduloId, anio, mesId) => {
  const ref = doc(db, COLECCIONES.IMPUTACIONES, idSnapshot(anio, mesId, moduloId));
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    return { cantidad: data.cantidad || 0, montoTotal: data.montoTotal || 0 };
  }

  const calculado = await calcularTotalMesDesdeDocumentos(moduloId, anio, mesId);
  await guardarSnapshotMensual(moduloId, anio, mesId, calculado, 'lazy');
  return calculado;
};
