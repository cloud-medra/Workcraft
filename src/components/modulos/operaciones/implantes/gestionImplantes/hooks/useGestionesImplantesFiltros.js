import { useState, useMemo } from 'react';

export const useGestionesImplantesFiltros = (implantes) => {
  const [busqueda, setBusqueda] = useState('');

  const fechaHoy = new Date();
  const [filtroAnio, setFiltroAnio] = useState(fechaHoy.getFullYear().toString());
  const [filtroMes, setFiltroMes] = useState(String(fechaHoy.getMonth() + 1).padStart(2, '0'));
  const [filtroDia, setFiltroDia] = useState('');
  const [filtrosEstados, setFiltrosEstados] = useState([]);

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

      let coincideEstado = true;
      if (filtrosEstados.length > 0) {
        const estadoClean = (i.estado || '').toUpperCase().trim();
        coincideEstado = filtrosEstados.includes(estadoClean);
      }

      return coincideBusqueda && coincideAnio && coincideMes && coincideDia && coincideEstado;
    });
  }, [implantes, busqueda, filtroAnio, filtroMes, filtroDia, filtrosEstados]);

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
    busqueda,
    setBusqueda,
    filtroAnio,
    setFiltroAnio,
    filtroMes,
    setFiltroMes,
    filtroDia,
    setFiltroDia,
    opcionesFechas,
    limpiarFiltrosFecha,
    opcionesEstados,
    filtrosEstados,
    toggleFiltroEstado,
    limpiarFiltroEstados
  };
};