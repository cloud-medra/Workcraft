// Reporte Info → "Descripciones ocultas" (ver functions/descripcionesReporte):
// campos calculados de las filas importadas y acción rápida "Ocultar esta
// descripción". El backend los completa igual si faltan (trigger de fila).
import { collection, doc, documentId, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import {
  COLECCION_DESCRIPCIONES, CAMPO_OCULTA, camposFila, descripcionNormDe, idDescripcionReporte, admisionClaveDe,
} from '../../../../../../functions/descripcionesReporte/nucleo.mjs';

export { CAMPO_OCULTA, descripcionNormDe, admisionClaveDe };
export const moduloDeVista = (pathVista) => (String(pathVista).startsWith('/implantes/') ? 'implantes' : 'documentos');
export const NOMBRE_MODULO = { implantes: 'Implantes', documentos: 'Documentos' };
export const normDeFila = (r) => r.descripcionNorm || descripcionNormDe(r['Descripción']);

// { [id]: entrada } del Maestro para las descripciones dadas (lotes de 30).
export const cargarEntradas = async (descripciones) => {
  const ids = [...new Set(descripciones.map(idDescripcionReporte))];
  const entradas = {};
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await getDocs(query(collection(db, COLECCION_DESCRIPCIONES), where(documentId(), 'in', ids.slice(i, i + 30))));
    snap.docs.forEach((d) => { entradas[d.id] = d.data(); });
  }
  return entradas;
};

// Datos de una fila importada con sus campos calculados.
export const conCampos = (datos, entradas, marcas) => ({
  ...datos,
  ...camposFila(datos, entradas[idDescripcionReporte(datos['Descripción'])] || null, Boolean(marcas[admisionClaveDe(datos['Admisión'])])),
});

// Cantidad total de filas de la descripción (contador del Maestro).
export const filasDeDescripcion = async (norm) => {
  const snap = await getDoc(doc(db, COLECCION_DESCRIPCIONES, idDescripcionReporte(norm)));
  return snap.exists() ? (snap.data().filas ?? null) : null;
};

export const ocultarDescripcion = (norm, modulo, userData) => updateDoc(doc(db, COLECCION_DESCRIPCIONES, idDescripcionReporte(norm)), {
  [CAMPO_OCULTA[modulo]]: true,
  actualizadoPor: userData?.nombreCompleto || 'Usuario',
  actualizadoPorUid: userData?.uid || null,
  actualizadoEl: serverTimestamp(),
});
