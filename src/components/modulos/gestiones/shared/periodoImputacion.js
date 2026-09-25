import { useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { usePeriodoAbiertoStore } from '../../../../hooks/usePeriodoAbiertoStore';

// Período de imputación abierto de un módulo de Gestiones ('laboratorio' |
// 'vacunatorio'), según cierres_periodos. El período se asigna al documento
// recién al finalizarlo (ingreso de orden / acta / salida), no al iniciar el
// proceso.

const COL_CIERRES = 'cierres_periodos';
const ESTADOS_ABIERTOS = ['ABIERTO', 'REABIERTO'];

const queryPeriodoAbierto = (moduloId) => query(
  collection(db, COL_CIERRES),
  where('modulo', '==', moduloId),
  where('estado', 'in', ESTADOS_ABIERTOS)
);

const aPeriodo = (snap) => {
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return data.mes && data.anio ? { mes: data.mes, anio: String(data.anio) } : null;
};

export const formatearPeriodo = (periodo) => {
  if (!periodo?.mes || !periodo?.anio) return 'No especificado';
  return `${periodo.mes.charAt(0).toUpperCase()}${periodo.mes.slice(1)} ${periodo.anio}`;
};

// Lectura puntual (sin caché de listener) para validar justo antes de escribir.
export const obtenerPeriodoAbierto = async (moduloId) =>
  aPeriodo(await getDocs(queryPeriodoAbierto(moduloId)));

// Suscripción en vivo: { periodo: {mes, anio} | null, cargando, error }.
// Usa el listener compartido de cierres_periodos (src/stores/periodosStore.js).
export const usePeriodoAbierto = (moduloId) => {
  const { periodo, cargando, error } = usePeriodoAbiertoStore(moduloId);
  const periodoSimple = useMemo(
    () => (periodo?.mes && periodo?.anio ? { mes: periodo.mes, anio: String(periodo.anio) } : null),
    [periodo]
  );
  return { periodo: periodoSimple, cargando, error };
};
