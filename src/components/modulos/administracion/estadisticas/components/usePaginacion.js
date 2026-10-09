import { useState } from 'react';

// Paginación en memoria de las tablas de Estadísticas.
export const TAMANO_PAGINA = 25;
export const usePaginacion = (filas) => {
  const [pagina, setPagina] = useState(1);
  const [tamanoPagina, setTamanoPagina] = useState(TAMANO_PAGINA);
  const totalPaginas = Math.max(1, Math.ceil(filas.length / tamanoPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  return {
    filasPagina: filas.slice((paginaActual - 1) * tamanoPagina, paginaActual * tamanoPagina),
    props: { pagina: paginaActual, totalPaginas, totalFilas: filas.length, setPagina, tamanoPagina, setTamanoPagina, opcionesTamano: [25, 50, 100] },
    mostrar: filas.length > TAMANO_PAGINA,
  };
};
