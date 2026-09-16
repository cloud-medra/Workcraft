import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../../../../firebaseConfig';
import { obtenerPeriodosDeItems } from './cargasHelpers';

const MODULO_IMPLANTES = 'implantes';

// Consulta directa a cierres_periodos por período puntual — no depende de
// "el único período abierto" (usePeriodoAbiertoModulo asume un solo doc
// ABIERTO/REABIERTO por módulo, pero la Reapertura de Control Mensual no
// cierra automáticamente otros períodos que ya estén abiertos, así que en
// teoría podrían coexistir dos). Esto solo pregunta por el período exacto
// que nos interesa, sea cual sea el estado del resto.
export const periodoEstaAbierto = async (anio, mes) => {
  const q = query(
    collection(db, 'cierres_periodos'),
    where('modulo', '==', MODULO_IMPLANTES),
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
 *
 * Devuelve:
 *  - { estado: 'ABIERTO' }                              → se puede desbloquear/guardar
 *  - { estado: 'CERRADO', periodosCerrados: [...] }      → al menos un período ya cerró
 *  - { estado: 'DESCONOCIDO' }                           → ningún ítem tiene periodoAnio/periodoMes
 *    (registros legacy); no hay forma de verificar, así que por seguridad
 *    se trata como no-abierto en vez de asumir que está bien.
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
