import { useMemo } from 'react';
import { CATALOGOS, ordenarPor } from '../stores/catalogosStore';
import { useCatalogo } from './useCatalogo';

// Antes este hook hacía un getDocs de la colección completa en cada montaje
// (el estado vivía dentro del componente, así que no cacheaba nada: cada
// entrada a Códigos Maestros > Vista General leía los ~3.000 códigos).
// Ahora es un envoltorio del catalogosStore: la colección se lee una sola
// vez por sesión y la comparten todas las pantallas. Solo acepta
// colecciones registradas como catálogo.
const nombrePorColeccion = Object.fromEntries(
  Object.entries(CATALOGOS).map(([nombre, { coleccion }]) => [coleccion, nombre])
);

export function useCollectionCache(colName, orderField = 'fechaRegistro', orderDir = 'desc') {
  const nombre = nombrePorColeccion[colName];
  if (!nombre) throw new Error(`useCollectionCache: "${colName}" no está registrado en catalogosStore`);

  const { datos, cargando, error, refrescar } = useCatalogo(nombre);

  const allDocs = useMemo(
    () => [...datos].sort(ordenarPor(orderField, orderDir)),
    [datos, orderField, orderDir]
  );

  return {
    allDocs,
    loading: cargando,
    error,
    // En el catálogo en vivo (maestros_codigos) no relee nada: ya está al día.
    reload: refrescar
  };
}
