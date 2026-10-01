import { useState, useCallback, useEffect, useMemo } from 'react';

const PREFIJO_STORAGE = 'workcraft:anchosColumnas';

export const claveStorageAnchos = (clave, usuario) => `${PREFIJO_STORAGE}:${usuario || 'anonimo'}:${clave}`;

// Lee los anchos guardados ({} si no hay, si localStorage no está disponible
// o si el JSON está corrupto). Solo se aceptan columnas que siguen
// existiendo y valores numéricos, respetando el mínimo de cada una.
export const leerAnchosGuardados = (claveStorage, columnas) => {
  try {
    const crudo = JSON.parse(localStorage.getItem(claveStorage) || '{}');
    return columnas.reduce((acc, col) => {
      const v = crudo?.[col.key];
      if (typeof v === 'number' && Number.isFinite(v)) acc[col.key] = Math.max(col.min ?? 0, Math.round(v));
      return acc;
    }, {});
  } catch {
    return {};
  }
};

/**
 * Maneja el estado de anchos de columnas redimensionables por arrastre.
 * `columnas` es un array de { key, ancho, min } — mismo contrato que
 * COLUMNAS en GestionesImplantesTable.jsx.
 *
 * Opcional `{ clave, usuario }`: recuerda los anchos en localStorage del
 * navegador, por tabla (`clave`) y por usuario (uid). Nada va a Firestore.
 * Sin `clave` los anchos viven solo mientras la pantalla está montada.
 */
export const useColumnResize = (columnas, { clave, usuario } = {}) => {
  const anchosPorDefecto = useCallback(
    () => columnas.reduce((acc, col) => ({ ...acc, [col.key]: col.ancho }), {}),
    [columnas]
  );
  const claveStorage = clave ? claveStorageAnchos(clave, usuario) : null;

  const [anchos, setAnchos] = useState(() => ({
    ...anchosPorDefecto(),
    ...(claveStorage ? leerAnchosGuardados(claveStorage, columnas) : {})
  }));

  // El uid puede llegar después del primer render (sesión cargando): se
  // recargan los anchos de ese usuario cuando cambia la clave.
  const [claveCargada, setClaveCargada] = useState(claveStorage);
  if (claveStorage !== claveCargada) {
    setClaveCargada(claveStorage);
    setAnchos({ ...anchosPorDefecto(), ...(claveStorage ? leerAnchosGuardados(claveStorage, columnas) : {}) });
  }

  const handleResize = useCallback((colKey, nuevoAncho) => {
    setAnchos(prev => (prev[colKey] === nuevoAncho ? prev : { ...prev, [colKey]: nuevoAncho }));
  }, []);

  const restablecerAnchos = useCallback(() => {
    if (claveStorage) {
      try { localStorage.removeItem(claveStorage); } catch { /* sin localStorage */ }
    }
    setAnchos(anchosPorDefecto());
  }, [anchosPorDefecto, claveStorage]);

  const personalizados = useMemo(
    () => columnas.some(col => (anchos[col.key] ?? col.ancho) !== col.ancho),
    [columnas, anchos]
  );

  // Se guarda solo lo que difiere del ancho por defecto (así un cambio de
  // los valores por defecto en el código se aplica a quien no los tocó).
  useEffect(() => {
    if (!claveStorage || claveStorage !== claveCargada) return;
    try {
      const distintos = columnas.reduce((acc, col) => {
        if (anchos[col.key] !== undefined && anchos[col.key] !== col.ancho) acc[col.key] = anchos[col.key];
        return acc;
      }, {});
      if (Object.keys(distintos).length) localStorage.setItem(claveStorage, JSON.stringify(distintos));
      else localStorage.removeItem(claveStorage);
    } catch { /* sin localStorage: los anchos duran mientras la pantalla está abierta */ }
  }, [anchos, claveStorage, claveCargada, columnas]);

  const anchoTotalTabla = columnas.reduce((suma, col) => suma + (anchos[col.key] || col.ancho), 0);

  return { anchos, handleResize, restablecerAnchos, anchoTotalTabla, personalizados };
};
