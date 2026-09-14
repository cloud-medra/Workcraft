import { useRef, useCallback } from 'react';

export const ManijaRedimension = ({ colKey, anchoActual, anchoMin, onResize }) => {
  const arrastrando = useRef(false);
  const xInicial = useRef(0);
  const anchoInicial = useRef(0);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    arrastrando.current = true;
    xInicial.current = e.clientX;
    anchoInicial.current = anchoActual;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (ev) => {
      if (!arrastrando.current) return;
      const delta = ev.clientX - xInicial.current;
      const nuevoAncho = Math.max(anchoMin, Math.round(anchoInicial.current + delta));
      onResize(colKey, nuevoAncho);
    };

    const handleMouseUp = () => {
      arrastrando.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [colKey, anchoActual, anchoMin, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      title="Arrastra para redimensionar"
      className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none z-20 group/handle flex items-center justify-center"
    >
      <div className="h-3/5 w-[2px] bg-transparent group-hover/handle:bg-[#2383C2] rounded-full transition-colors" />
    </div>
  );
};
