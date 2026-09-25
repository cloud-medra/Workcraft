import { useEffect, useSyncExternalStore, useCallback } from 'react';
import {
  cargarCatalogo,
  suscribirCatalogo,
  obtenerEstadoCatalogo,
  refrescarCatalogo
} from '../stores/catalogosStore';

const SIN_DATOS = [];

/**
 * Lee un catálogo maestro del catalogosStore (ver src/stores/catalogosStore.js).
 * Lo carga la primera vez que alguien lo pide en la sesión; las demás
 * pantallas lo reutilizan sin nuevas lecturas.
 *
 * @param {'codigos'|'empresas'|'recargos'|'centros'|'prestadores'} nombre
 * @param {{ habilitado?: boolean }} [opciones] habilitado=false no dispara la carga.
 */
export function useCatalogo(nombre, { habilitado = true } = {}) {
  const estado = useSyncExternalStore(
    useCallback((cb) => suscribirCatalogo(nombre, cb), [nombre]),
    () => obtenerEstadoCatalogo(nombre)
  );

  useEffect(() => {
    if (habilitado) cargarCatalogo(nombre).catch(() => {});
  }, [nombre, habilitado]);

  const refrescar = useCallback(() => refrescarCatalogo(nombre).catch(() => {}), [nombre]);

  return {
    datos: estado.datos ?? SIN_DATOS,
    cargado: estado.datos !== null,
    cargando: estado.cargando || (habilitado && estado.datos === null && !estado.error),
    error: estado.error,
    refrescar
  };
}
