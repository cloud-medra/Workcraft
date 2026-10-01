import { useRef, useCallback } from 'react';
import { medirAnchoContenidoColumna } from './medirAnchoColumna';

export const ManijaRedimension = ({ colKey, anchoActual, anchoMin, onResize }) => {
  const arrastrando = useRef(false);
  const xInicial = useRef(0);
  const anchoInicial = useRef(0);

  // La selección de texto se desactiva SOLO mientras dura el arrastre (en el
  // body, para que no se marque texto al pasar sobre otras celdas) y se
  // restaura tal como estaba al soltar. Fuera del arrastre las celdas se
  // seleccionan y copian normalmente.
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    arrastrando.current = true;
    xInicial.current = e.clientX;
    anchoInicial.current = anchoActual;
    const cursorPrevio = document.body.style.cursor;
    const seleccionPrevia = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const terminar = () => {
      if (!arrastrando.current) return;
      arrastrando.current = false;
      document.body.style.cursor = cursorPrevio;
      document.body.style.userSelect = seleccionPrevia;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', terminar);
      window.removeEventListener('blur', terminar);
    };

    function handleMouseMove(ev) {
      if (!arrastrando.current) return;
      // Se soltó el botón fuera de la ventana (no llegó el mouseup).
      if (ev.buttons === 0) { terminar(); return; }
      const delta = ev.clientX - xInicial.current;
      onResize(colKey, Math.max(anchoMin, Math.round(anchoInicial.current + delta)));
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', terminar);
    window.addEventListener('blur', terminar);
  }, [colKey, anchoActual, anchoMin, onResize]);

  const handleDoubleClick = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const ancho = medirAnchoContenidoColumna(e.currentTarget.closest('th'), { anchoMin });
    if (ancho) onResize(colKey, ancho);
  }, [colKey, anchoMin, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      // El clic que cierra un arrastre no debe llegar al <th> (ordenar) ni a
      // la fila (abrir detalle).
      onClick={(e) => e.stopPropagation()}
      title="Arrastra para redimensionar · doble clic para ajustar al contenido"
      className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none z-20 group/handle flex items-center justify-center"
    >
      <div className="h-3/5 w-[2px] bg-transparent group-hover/handle:bg-[#2383C2] rounded-full transition-colors" />
    </div>
  );
};
