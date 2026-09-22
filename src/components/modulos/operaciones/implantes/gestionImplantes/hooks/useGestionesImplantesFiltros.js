import { useState, useMemo, useEffect } from 'react';
import { obtenerFechaHoyISO } from '../utils/gestionesImportExport';

export const TAMANO_PAGINA_TABLA = 50;

export const useGestionesImplantesFiltros = (implantes) => {
  const [busqueda, setBusqueda] = useState('');

  const fechaHoy = new Date();
  const [filtroAnio, setFiltroAnio] = useState(fechaHoy.getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState(String(fechaHoy.getMonth() + 1).padStart(2, '0'));
  const [filtroDia, setFiltroDia] = useState('');
  const [filtrosEstados, setFiltrosEstados] = useState([]);
  const [pagina, setPagina] = useState(1);

  // Filtro de rango de fecha, independiente y combinable con año/mes/día y
  // estados: por defecto solo muestra hoy y días anteriores (el caso de uso
  // más frecuente al revisar/cargar), con opción de ver todos los días
  // (incluye fechas futuras).
  const [filtroSoloHastaHoy, setFiltroSoloHastaHoy] = useState(true);

  const opcionesFechas = useMemo(() => {
    const aniosSet = new Set();
    const mesesSet = new Set();
    const diasSet = new Set();

    implantes.forEach(item => {
      if (item.fecha && item.fecha.includes('-')) {
        const [yyyy, mm, dd] = item.fecha.split('-');
        if (yyyy) aniosSet.add(yyyy);
        if (mm) mesesSet.add(mm);
        if (dd) diasSet.add(dd);
      }
    });

    return {
      anios: Array.from(aniosSet).sort((a, b) => b - a),
      meses: Array.from(mesesSet).sort((a, b) => a - b),
      dias: Array.from(diasSet).sort((a, b) => a - b)
    };
  }, [implantes]);

  const implantesFiltrados = useMemo(() => {
    const hoyISO = obtenerFechaHoyISO();

    return implantes.filter(i => {
      const idParaBuscar = i.gestionId || i.agendaId || '';
      const coincideBusqueda =
        !busqueda ||
        idParaBuscar.toLowerCase().includes(busqueda.toLowerCase()) ||
        (i.nombre && i.nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
        (i.empresa && i.empresa.toLowerCase().includes(busqueda.toLowerCase()));

      let coincideAnio = true;
      let coincideMes = true;
      let coincideDia = true;

      if (i.fecha && i.fecha.includes('-')) {
        const [yyyy, mm, dd] = i.fecha.split('-');
        if (filtroAnio) coincideAnio = yyyy === filtroAnio;
        if (filtroMes) coincideMes = mm === filtroMes;
        if (filtroDia) coincideDia = dd === filtroDia;
      } else if (filtroAnio || filtroMes || filtroDia) {
        return false;
      }

      // "YYYY-MM-DD" es comparable lexicográficamente igual que numéricamente,
      // así que no hace falta parsear a Date (ni lidiar con timezone).
      let coincideFechaHastaHoy = true;
      if (filtroSoloHastaHoy) {
        coincideFechaHastaHoy = !!(i.fecha && i.fecha.includes('-') && i.fecha <= hoyISO);
      }

      let coincideEstado = true;
      if (filtrosEstados.length > 0) {
        const estadoClean = (i.estado || '').toUpperCase().trim();
        coincideEstado = filtrosEstados.includes(estadoClean);
      }

      return coincideBusqueda && coincideAnio && coincideMes && coincideDia && coincideFechaHastaHoy && coincideEstado;
    });
  }, [implantes, busqueda, filtroAnio, filtroMes, filtroDia, filtroSoloHastaHoy, filtrosEstados]);

  // Paginación de la tabla (50 filas por página) sobre `implantesFiltrados`,
  // que ya viene ordenado (useGestionesImplantesData ordena por
  // fechaRegistro descendente antes de filtrar) — acá solo se corta en
  // trozos de 50, sin volver a ordenar. Es 100% client-side: los datos del
  // mes ya están en memoria (acotados por el listener a los más recientes),
  // así que no hace falta una consulta nueva a Firestore por cada página.
  // Se reinicia a la página 1 cada vez que cambia cualquier filtro.
  useEffect(() => {
    setPagina(1);
  }, [busqueda, filtroAnio, filtroMes, filtroDia, filtroSoloHastaHoy, filtrosEstados]);

  const totalPaginas = Math.max(1, Math.ceil(implantesFiltrados.length / TAMANO_PAGINA_TABLA));
  const paginaSegura = Math.min(pagina, totalPaginas);

  const implantesPagina = useMemo(() => {
    const inicio = (paginaSegura - 1) * TAMANO_PAGINA_TABLA;
    return implantesFiltrados.slice(inicio, inicio + TAMANO_PAGINA_TABLA);
  }, [implantesFiltrados, paginaSegura]);

  const limpiarFiltrosFecha = () => {
    const d = new Date();
    setFiltroAnio(d.getFullYear().toString());
    setFiltroMes(String(d.getMonth() + 1).padStart(2, '0'));
    setFiltroDia('');
  };

  const opcionesEstados = useMemo(() => {
    const estadosSet = new Set();
    implantes.forEach(item => {
      const estadoClean = (item.estado || '').toUpperCase().trim();
      if (estadoClean) estadosSet.add(estadoClean);
    });
    return Array.from(estadosSet).sort();
  }, [implantes]);

  const toggleFiltroEstado = (estado) => {
    setFiltrosEstados(prev =>
      prev.includes(estado)
        ? prev.filter(e => e !== estado)
        : [...prev, estado]
    );
  };

  const limpiarFiltroEstados = () => setFiltrosEstados([]);

  return {
    implantesFiltrados,
    implantesPagina,
    pagina: paginaSegura,
    setPagina,
    totalPaginas,
    busqueda,
    setBusqueda,
    filtroAnio,
    setFiltroAnio,
    filtroMes,
    setFiltroMes,
    filtroDia,
    setFiltroDia,
    filtroSoloHastaHoy,
    setFiltroSoloHastaHoy,
    opcionesFechas,
    limpiarFiltrosFecha,
    opcionesEstados,
    filtrosEstados,
    toggleFiltroEstado,
    limpiarFiltroEstados
  };
};