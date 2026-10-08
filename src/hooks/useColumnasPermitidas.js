import { useMemo } from 'react';
import { useGranularPermission } from './useGranularPermission';

// Granularidad por columnas de una tabla. Cada columna `{ key }` de la
// lista corresponde al elemento `col_<key>` de la sección `seccion` de la
// vista en componentMaps (mismo criterio que las vistas que ya gateaban
// columnas a mano con hasPermission(PATH, seccion, 'col_...')).
// Columnas con `fija: true` (ej. el checkbox de selección) no se gatean.
//
// Igual que useGranularPermission, una columna sin configurar se permite:
// los usuarios existentes siguen viendo todas las columnas hasta que el
// admin desmarque alguna.
//
// Devuelve:
//   columnasVisibles: la lista filtrada (para <colgroup>, <thead>,
//                     useColumnResize, colSpan y exportaciones)
//   ver(key):         si la columna se muestra (para cada <td>)
//
// coberturaPermisos.test.js lee la llamada `useColumnasPermitidas(RUTA,
// 'seccion', LISTA)` y la `const LISTA = [...]` del mismo archivo para
// verificar que cada `col_<key>` exista en el mapa.
export const useColumnasPermitidas = (pathVista, seccion, columnas) => {
  const { hasPermission } = useGranularPermission();
  const claves = columnas
    .filter((col) => col.fija || hasPermission(pathVista, seccion, `col_${col.key}`))
    .map((col) => col.key)
    .join('|');
  // Misma referencia mientras no cambie qué columnas se ven (la lista va a
  // useColumnResize, que tiene efectos que dependen de ella).
  const columnasVisibles = useMemo(() => {
    const permitidas = new Set(claves.split('|'));
    return columnas.filter((col) => permitidas.has(col.key));
  }, [columnas, claves]);
  const visibles = new Set(columnasVisibles.map((col) => col.key));
  return { columnasVisibles, ver: (key) => visibles.has(key) };
};

// Filtra las filas de una exportación a Excel/CSV: `cabeceraAColumna`
// relaciona cada encabezado del archivo con la key de la columna de la
// tabla. Los encabezados sin columna asociada se exportan siempre.
export const filtrarFilasExport = (filas, cabeceraAColumna, ver) =>
  filas.map((fila) => Object.fromEntries(
    Object.entries(fila).filter(([cabecera]) => {
      const key = cabeceraAColumna[cabecera];
      return !key || ver(key);
    })
  ));
