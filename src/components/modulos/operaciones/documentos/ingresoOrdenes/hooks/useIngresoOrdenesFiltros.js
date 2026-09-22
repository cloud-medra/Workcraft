// Filtro de empresa (opcional) + agrupación por ADMISION+EMPRESA+FECHA_CX +
// paginación de 50 GRUPOS (no filas individuales) — todo client-side sobre
// `filas`, que ya viene acotada por año/mes desde useDocumentosSistemaPeriodo.
import { useEffect, useMemo, useState } from 'react';
import { agruparPorAdmisionEmpresaFecha } from './agruparPorAdmisionEmpresaFecha';

export const TAMANO_PAGINA_ORDENES = 50;

export const useIngresoOrdenesFiltros = (filas) => {
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

  useEffect(() => {
    if (empresa && !opcionesEmpresas.includes(empresa)) setEmpresa('');
  }, [opcionesEmpresas, empresa]);

  const filasFiltradas = useMemo(() => {
    if (!empresa) return filas;
    return filas.filter((fila) => (fila.proveedor || '').trim() === empresa);
  }, [filas, empresa]);

  const grupos = useMemo(() => agruparPorAdmisionEmpresaFecha(filasFiltradas), [filasFiltradas]);

  useEffect(() => {
    setPagina(1);
  }, [filas, empresa]);

  const totalPaginas = Math.max(1, Math.ceil(grupos.length / TAMANO_PAGINA_ORDENES));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const gruposPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * TAMANO_PAGINA_ORDENES;
    return grupos.slice(inicio, inicio + TAMANO_PAGINA_ORDENES);
  }, [grupos, paginaSegura]);

  return {
    empresa, setEmpresa, opcionesEmpresas,
    grupos, gruposPagina,
    totalFilas: grupos.length,
    pagina: paginaSegura, setPagina, totalPaginas
  };
};
