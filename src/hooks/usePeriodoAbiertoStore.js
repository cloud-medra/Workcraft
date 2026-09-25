import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  retenerPeriodos,
  suscribirPeriodos,
  obtenerEstadoPeriodos,
  periodoAbiertoDe
} from '../stores/periodosStore';

/**
 * Período abierto de un módulo desde el listener compartido
 * (src/stores/periodosStore.js): { periodo: doc | null, cargando, error }.
 */
export function usePeriodoAbiertoStore(moduloId) {
  const estado = useSyncExternalStore(suscribirPeriodos, obtenerEstadoPeriodos);
  useEffect(() => retenerPeriodos(), []);
  const periodo = useMemo(() => periodoAbiertoDe(estado.docs, moduloId), [estado.docs, moduloId]);
  return { periodo, cargando: estado.docs === null, error: estado.error };
}
