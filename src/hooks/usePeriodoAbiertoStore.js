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

/**
 * Todos los períodos abiertos (ABIERTO/REABIERTO, de todos los módulos) del
 * mismo listener compartido: { docs: [] | null, cargando, error }.
 */
export function usePeriodosAbiertos() {
  const estado = useSyncExternalStore(suscribirPeriodos, obtenerEstadoPeriodos);
  useEffect(() => retenerPeriodos(), []);
  return { docs: estado.docs || [], cargando: estado.docs === null, error: estado.error };
}
