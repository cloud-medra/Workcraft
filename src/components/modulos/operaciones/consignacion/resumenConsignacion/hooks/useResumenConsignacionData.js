import { useState, useMemo } from 'react';
import { useResumenImputadas, TODOS_LOS_MESES } from '../../../shared/useResumenImputadas';

export const NOMBRES_MESES = {
  "01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
  "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
  "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"
};

export const ATRIBUTO_OPTIONS = ['CONSIGNACION', 'COTIZACION'];
export { TODOS_LOS_MESES };

export const useResumenConsignacionData = () => {
  // Años/meses por sondeo y documentos con lectura única al elegir el mes
  // (antes: listener sobre todas las imputadas de todos los años).
  const {
    anio, setAnio,
    mes, setMes,
    aniosDisponibles,
    mesesDelAnioActual,
    documentos,
    cargando,
    actualizar
  } = useResumenImputadas('consignacion_imputadas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroAtributo, setFiltroAtributo] = useState('');

  const documentosFiltrados = useMemo(() => {
    let lista = documentos;

    if (filtroAtributo) {
      lista = lista.filter(d => (d.atributo || '').toUpperCase() === filtroAtributo);
    }

    if (busqueda.trim()) {
      const term = busqueda.trim().toLowerCase();
      lista = lista.filter(d =>
        String(d.gestionId || '').toLowerCase().includes(term) ||
        String(d.nombre || '').toLowerCase().includes(term) ||
        String(d.medico || '').toLowerCase().includes(term) ||
        String(d.empresa || '').toLowerCase().includes(term) ||
        String(d.codigo || '').toLowerCase().includes(term) ||
        String(d.referencia || '').toLowerCase().includes(term)
      );
    }

    return [...lista].sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  }, [documentos, busqueda, filtroAtributo]);

  const totales = useMemo(() => {
    const totalVenta = documentosFiltrados.reduce((acc, d) => acc + (Number(d.venta) || 0), 0);
    const totalCantidad = documentosFiltrados.reduce((acc, d) => acc + (Number(d.cantidad) || 0), 0);
    return { totalVenta, totalCantidad, totalRegistros: documentosFiltrados.length };
  }, [documentosFiltrados]);

  return {
    anio, setAnio,
    mes, setMes,
    busqueda, setBusqueda,
    filtroAtributo, setFiltroAtributo,
    aniosDisponibles,
    mesesDelAnioActual,
    documentosFiltrados,
    totales,
    cargando,
    actualizar
  };
};