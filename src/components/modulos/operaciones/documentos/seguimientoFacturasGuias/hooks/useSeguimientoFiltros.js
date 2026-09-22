// Filtro de empresa (opcional, cascada sobre `filas` ya acotadas por
// año/mes + el criterio de servidor elegido -estado "Pendiente factura" o
// numero_guia vacío/"0"-) y paginación de 50 — ambos client-side, mismo
// criterio que useDetallesOCFiltros.js. Compartido por Facturas y Guías: el
// criterio de servidor ya viene resuelto en `filas`, acá solo queda filtrar
// por empresa y paginar, sin importar cuál de los dos tipos de seguimiento
// se esté viendo.
import { useEffect, useMemo, useState } from 'react';

export const TAMANO_PAGINA_SEGUIMIENTO = 50;

export const useSeguimientoFiltros = (filas) => {
  const [empresa, setEmpresa] = useState('');
  const [pagina, setPagina] = useState(1);

  const opcionesEmpresas = useMemo(() => {
    const set = new Set();
    filas.forEach((fila) => {
      const nombre = (fila.proveedor || '').trim();
      if (nombre) set.add(nombre);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filas]);

  // Si la empresa elegida deja de existir en las opciones (cambió año/mes/
  // tipo de seguimiento y esa empresa ya no tiene filas en el nuevo
  // período), se deselecciona en vez de quedar "elegida" pero sin resultados.
  useEffect(() => {
    if (empresa && !opcionesEmpresas.includes(empresa)) setEmpresa('');
  }, [opcionesEmpresas, empresa]);

  const filasFiltradas = useMemo(() => {
    if (!empresa) return filas;
    return filas.filter((fila) => (fila.proveedor || '').trim() === empresa);
  }, [filas, empresa]);

  useEffect(() => {
    setPagina(1);
  }, [filas, empresa]);

  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / TAMANO_PAGINA_SEGUIMIENTO));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const filasPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * TAMANO_PAGINA_SEGUIMIENTO;
    return filasFiltradas.slice(inicio, inicio + TAMANO_PAGINA_SEGUIMIENTO);
  }, [filasFiltradas, paginaSegura]);

  return {
    empresa, setEmpresa, opcionesEmpresas,
    filasFiltradas, filasPagina,
    totalFilas: filasFiltradas.length,
    pagina: paginaSegura, setPagina, totalPaginas
  };
};
