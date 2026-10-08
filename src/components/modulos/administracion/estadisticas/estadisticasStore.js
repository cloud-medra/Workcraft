// Lecturas de Estadísticas: solo getDoc puntuales (nunca listeners), y cada
// documento se lee una vez por sesión. Cambiar de pestaña, de filtro, de
// fila o volver a un período ya visto no vuelve a leer.

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { COLECCION_ESTADISTICAS, ID_INDICE } from './estadisticasConfig';

const cache = new Map(); // id -> Promise<data | null>

const leer = (id) => {
  if (!cache.has(id)) {
    const promesa = getDoc(doc(db, COLECCION_ESTADISTICAS, id))
      .then((s) => (s.exists() ? s.data() : null))
      .catch((err) => { cache.delete(id); throw err; });
    cache.set(id, promesa);
  }
  return cache.get(id);
};

// Índice de períodos con estadísticas: { periodos: { modulo: { 'AAAA-MM': { definitivo } } } }.
export const obtenerIndice = () => leer(ID_INDICE);

// Documento de un módulo y período, con sus partes si no cabía en uno
// (`piezas`). null si ese período no tiene estadísticas.
export const obtenerPeriodo = async (modulo, clave) => {
  const id = `${modulo}_${clave}`;
  const base = await leer(id);
  if (!base) return null;
  const extra = await Promise.all(
    Array.from({ length: Math.max(0, (base.partes || 1) - 1) }, (_, i) => leer(`${id}__p${i + 1}`))
  );
  return { ...base, modulo, piezas: [base, ...extra.filter(Boolean)] };
};

// Tras un recálculo manual: descarta lo leído de ese período y el índice.
export const invalidarPeriodo = (modulo, clave) => {
  [...cache.keys()].forEach((id) => {
    if (id === ID_INDICE || id === `${modulo}_${clave}` || id.startsWith(`${modulo}_${clave}__p`)) cache.delete(id);
  });
};

// Solo para tests.
export const limpiarCacheEstadisticas = () => cache.clear();
