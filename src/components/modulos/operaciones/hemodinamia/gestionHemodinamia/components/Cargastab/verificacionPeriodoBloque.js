import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../../../../firebaseConfig';
import { obtenerPeriodosDeItems } from './cargasHelpers';

const MODULO_HEMODINAMIA = 'hemodinamia';

export const periodoEstaAbierto = async (anio, mes) => {
  const q = query(
    collection(db, 'cierres_periodos'),
    where('modulo', '==', MODULO_HEMODINAMIA),
    where('anio', '==', anio),
    where('mes', '==', mes),
    where('estado', 'in', ['ABIERTO', 'REABIERTO'])
  );
  const snap = await getDocs(q);
  return !snap.empty;
};

/**
 * Verifica, para el candado de bloqueo de un bloque de Cargas, si TODOS los
 * períodos presentes en sus ítems están actualmente abiertos.
 */
export const verificarPeriodosBloque = async (items) => {
  const periodos = obtenerPeriodosDeItems(items);
  if (periodos.length === 0) {
    return { estado: 'DESCONOCIDO', periodosCerrados: [] };
  }

  const resultados = await Promise.all(
    periodos.map(async (p) => ({ ...p, abierto: await periodoEstaAbierto(p.anio, p.mes) }))
  );
  const periodosCerrados = resultados.filter(r => !r.abierto).map(({ anio, mes }) => ({ anio, mes }));

  return periodosCerrados.length === 0
    ? { estado: 'ABIERTO', periodosCerrados: [] }
    : { estado: 'CERRADO', periodosCerrados };
};
