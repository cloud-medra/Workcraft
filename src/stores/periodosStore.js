import { collection, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { onSnapshotVisible } from '../hooks/useVisibleSnapshot';

// =====================================================================
// Períodos de imputación ABIERTOS — un único listener compartido
// =====================================================================
// Antes cada pantalla/hook (usePeriodoAbierto de Gestiones,
// usePeriodoAbiertoModulo de Implantes y Hemodinamia, las vistas de detalle
// y Cargas Consolidado) abría su propio listener sobre cierres_periodos
// para un módulo. Ahora hay uno solo, sobre los períodos ABIERTO/REABIERTO
// de todos los módulos (unos pocos documentos), que se abre con el primer
// consumidor y se cierra con el último. Sigue en tiempo real: cerrar un mes
// debe bloquear las cargas de inmediato.
//
// Las validaciones justo antes de escribir NO usan este store: releen el
// servidor (obtenerPeriodoAbierto, verificacionPeriodoBloque...).
// =====================================================================

export const ESTADOS_ABIERTOS = ['ABIERTO', 'REABIERTO'];
const ESTADO_INICIAL = Object.freeze({ docs: null, error: null });

let estado = ESTADO_INICIAL;
let cancelar = null;
let referencias = 0;
const suscriptores = new Set();

const actualizar = (cambios) => {
  estado = { ...estado, ...cambios };
  suscriptores.forEach((cb) => cb());
};

const abrir = () => {
  cancelar = onSnapshotVisible(
    query(collection(db, 'cierres_periodos'), where('estado', 'in', ESTADOS_ABIERTOS)),
    (snap) => actualizar({ docs: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: null }),
    (error) => {
      console.error('Error al escuchar los períodos abiertos:', error);
      actualizar({ docs: [], error });
    }
  );
};

export const retenerPeriodos = () => {
  referencias += 1;
  if (!cancelar) abrir();
  let soltado = false;
  return () => {
    if (soltado) return;
    soltado = true;
    referencias = Math.max(0, referencias - 1);
    if (referencias === 0 && cancelar) {
      cancelar();
      cancelar = null;
      estado = ESTADO_INICIAL;
    }
  };
};

export const suscribirPeriodos = (cb) => {
  suscriptores.add(cb);
  return () => suscriptores.delete(cb);
};

export const obtenerEstadoPeriodos = () => estado;

/**
 * Período abierto más reciente del módulo ({ id, anio, mes, modulo, estado, ... })
 * o null. Si hubiera más de uno, gana el de fechaApertura más reciente.
 */
export const periodoAbiertoDe = (docs, moduloId) => {
  const delModulo = (docs || []).filter((d) => d.modulo === moduloId);
  if (!delModulo.length) return null;
  return [...delModulo].sort(
    (a, b) => (b.fechaApertura?.toMillis?.() || 0) - (a.fechaApertura?.toMillis?.() || 0)
  )[0];
};
