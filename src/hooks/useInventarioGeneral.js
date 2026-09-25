import { useEffect, useSyncExternalStore } from 'react';
import {
  retenerInventarioGeneral,
  suscribirInventarioGeneral,
  obtenerEstadoInventarioGeneral
} from '../stores/inventarioGeneralStore';

const SIN_DATOS = [];

/**
 * Cajas de inventario_general desde el listener compartido
 * (src/stores/inventarioGeneralStore.js). Sin ordenar: cada pantalla ordena
 * en memoria.
 */
export function useInventarioGeneral({ habilitado = true } = {}) {
  const estado = useSyncExternalStore(suscribirInventarioGeneral, obtenerEstadoInventarioGeneral);

  useEffect(() => {
    if (!habilitado) return undefined;
    return retenerInventarioGeneral();
  }, [habilitado]);

  return {
    cajas: estado.datos ?? SIN_DATOS,
    cargando: habilitado && estado.datos === null && !estado.error,
    error: estado.error
  };
}
