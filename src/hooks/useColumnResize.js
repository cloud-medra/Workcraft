import { useState, useCallback } from 'react';

/**
 * Maneja el estado de anchos de columnas redimensionables por arrastre.
 * `columnas` es un array de { key, ancho, min } — mismo contrato que
 * COLUMNAS en GestionesImplantesTable.jsx.
 */
export const useColumnResize = (columnas) => {
  const anchosPorDefecto = useCallback(
    () => columnas.reduce((acc, col) => ({ ...acc, [col.key]: col.ancho }), {}),
    [columnas]
  );

  const [anchos, setAnchos] = useState(anchosPorDefecto);

  const handleResize = useCallback((colKey, nuevoAncho) => {
    setAnchos(prev => (prev[colKey] === nuevoAncho ? prev : { ...prev, [colKey]: nuevoAncho }));
  }, []);

  const restablecerAnchos = useCallback(() => setAnchos(anchosPorDefecto()), [anchosPorDefecto]);

  const anchoTotalTabla = columnas.reduce((suma, col) => suma + (anchos[col.key] || col.ancho), 0);

  return { anchos, handleResize, restablecerAnchos, anchoTotalTabla };
};
