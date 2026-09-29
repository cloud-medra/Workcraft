import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';

const MARGEN_VIEWPORT = 8;
const SEPARACION = 4;

// Posiciona un panel desplegable renderizado en un portal a document.body
// (position: fixed) respecto de su ancla. Así el panel no queda recortado por
// ancestros con overflow:hidden ni tapado por contextos de apilamiento
// posteriores (filtros, tabla).
//  - Se abre hacia abajo; si abajo no cabe `alturaMax` y arriba hay más
//    espacio, se abre hacia arriba (anclado por `bottom`, así sigue pegado al
//    input aunque el contenido cambie de alto al filtrar).
//  - Ancho = ancho del ancla (`anchoIgual`) o como mínimo ese ancho.
//  - Sigue al ancla en scroll (de cualquier ancestro) y resize.
//  - Se cierra con clic fuera (ancla y panel) y con Escape.
export function useDropdownFlotante({ abierto, cerrar, alturaMax = 300, anchoIgual = false }) {
  const anclaRef = useRef(null);
  const panelRef = useRef(null);
  const [estilo, setEstilo] = useState({ position: 'fixed', top: 0, left: 0, visibility: 'hidden' });

  const posicionar = useCallback(() => {
    const ancla = anclaRef.current;
    if (!ancla) return;
    const rect = ancla.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    const espacioAbajo = vh - rect.bottom - SEPARACION - MARGEN_VIEWPORT;
    const espacioArriba = rect.top - SEPARACION - MARGEN_VIEWPORT;
    const haciaArriba = espacioAbajo < alturaMax && espacioArriba > espacioAbajo;

    // Evita que un panel más ancho que el ancla se salga por la derecha.
    const anchoPanel = Math.max(panelRef.current?.offsetWidth || 0, rect.width);
    const left = Math.max(MARGEN_VIEWPORT, Math.min(rect.left, vw - anchoPanel - MARGEN_VIEWPORT));

    setEstilo({
      position: 'fixed',
      left,
      ...(anchoIgual ? { width: rect.width } : { minWidth: rect.width }),
      maxHeight: Math.max(0, Math.min(alturaMax, haciaArriba ? espacioArriba : espacioAbajo)),
      ...(haciaArriba
        ? { bottom: vh - rect.top + SEPARACION }
        : { top: rect.bottom + SEPARACION }),
    });
  }, [alturaMax, anchoIgual]);

  // useLayoutEffect: el panel ya está montado (se puede medir) y se ubica
  // antes del primer pintado, sin parpadeo en (0,0).
  useLayoutEffect(() => {
    if (!abierto) return;
    posicionar();
    window.addEventListener('scroll', posicionar, true);
    window.addEventListener('resize', posicionar);
    return () => {
      window.removeEventListener('scroll', posicionar, true);
      window.removeEventListener('resize', posicionar);
    };
  }, [abierto, posicionar]);

  useEffect(() => {
    if (!abierto) return;
    const onMouseDown = (e) => {
      if (anclaRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      cerrar();
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') cerrar();
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [abierto, cerrar]);

  return { anclaRef, panelRef, estilo };
}
