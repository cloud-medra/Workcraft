// Búsqueda (admisión/paciente + OC/factura/guía) y paginación 100%
// client-side sobre `filas`, que ya viene acotada a UN período (año+mes) por
// useDetallesOCData.js. Separado en su propio hook (sin Firestore) siguiendo
// el mismo criterio que useGestionesImplantesFiltros.js: fácil de testear y
// de leer, sin mezclar la carga de datos con el filtrado.
import { useEffect, useMemo, useState } from 'react';

export const TAMANO_PAGINA_DETALLES_OC = 50;

export const CAMPOS_BUSQUEDA_OC = {
  oc: { label: 'OC', campo: 'oc' },
  factura: { label: 'Factura', campo: 'numero_factura' },
  guia: { label: 'Guía', campo: 'numero_guia' }
};

export const useDetallesOCFiltros = (filas) => {
  const [busquedaAdmisionPaciente, setBusquedaAdmisionPaciente] = useState('');
  const [campoBusquedaOC, setCampoBusquedaOC] = useState('oc');
  const [textoBusquedaOC, setTextoBusquedaOC] = useState('');
  const [pagina, setPagina] = useState(1);

  const filasFiltradas = useMemo(() => {
    const textoAdmisionPaciente = busquedaAdmisionPaciente.trim().toLowerCase();
    const textoOC = textoBusquedaOC.trim().toLowerCase();
    const campoOC = CAMPOS_BUSQUEDA_OC[campoBusquedaOC]?.campo;

    if (!textoAdmisionPaciente && !textoOC) return filas;

    return filas.filter((fila) => {
      if (textoAdmisionPaciente) {
        const admision = (fila.admision ?? '').toString().toLowerCase();
        const paciente = (fila.paciente ?? '').toString().toLowerCase();
        if (!admision.includes(textoAdmisionPaciente) && !paciente.includes(textoAdmisionPaciente)) {
          return false;
        }
      }
      if (textoOC && campoOC) {
        const valorCampo = (fila[campoOC] ?? '').toString().toLowerCase();
        if (!valorCampo.includes(textoOC)) return false;
      }
      return true;
    });
  }, [filas, busquedaAdmisionPaciente, textoBusquedaOC, campoBusquedaOC]);

  // Cualquier cambio en los datos base o en los filtros vuelve a la página 1
  // (mismo criterio que useGestionesImplantesFiltros.js).
  useEffect(() => {
    setPagina(1);
  }, [filas, busquedaAdmisionPaciente, textoBusquedaOC, campoBusquedaOC]);

  const totalPaginas = Math.max(1, Math.ceil(filasFiltradas.length / TAMANO_PAGINA_DETALLES_OC));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const filasPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * TAMANO_PAGINA_DETALLES_OC;
    return filasFiltradas.slice(inicio, inicio + TAMANO_PAGINA_DETALLES_OC);
  }, [filasFiltradas, paginaSegura]);

  return {
    busquedaAdmisionPaciente, setBusquedaAdmisionPaciente,
    campoBusquedaOC, setCampoBusquedaOC,
    textoBusquedaOC, setTextoBusquedaOC,
    filasFiltradas, filasPagina,
    totalFilas: filasFiltradas.length,
    pagina: paginaSegura, setPagina, totalPaginas
  };
};
