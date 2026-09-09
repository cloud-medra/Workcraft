import React from 'react';
import { FileBarChart, Search, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import Spinner from '../../../../ui/Spinner'; // AJUSTAR ruta
import {
  useResumenConsignacionData,
  NOMBRES_MESES,
  ATRIBUTO_OPTIONS,
  TODOS_LOS_MESES
} from './hooks/useResumenConsignacionData';

const formatearFechaTabla = (fechaString) => {
  if (!fechaString || !fechaString.includes('-')) return fechaString || '-';
  const [yyyy, mm, dd] = fechaString.split('-');
  return `${dd}-${mm}-${yyyy}`;
};

const getAtributoEstilo = (atributo) => {
  const estilos = {
    CONSIGNACION: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400',
    COTIZACION: 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-400'
  };
  return estilos[atributo] || 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300';
};

const ResumenConsignacion = () => {
  const {
    anio, setAnio,
    mes, setMes,
    busqueda, setBusqueda,
    filtroAtributo, setFiltroAtributo,
    aniosDisponibles,
    mesesDelAnioActual,
    documentosFiltrados,
    totales,
    cargando
  } = useResumenConsignacionData();

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Cargando resumen...</h3>
          </div>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <FileBarChart size={15} className="text-[#2383C2]" />
          RESUMEN DE CONSIGNACIÓN IMPUTADA
        </h2>
      </div>

      {/* BARRA DE FILTROS */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex flex-wrap items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative w-64">
          <Search className="absolute left-2 top-1.5 text-gray-400 dark:text-gray-500" size={13} />
          <input
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full h-7 pl-7 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2]"
            placeholder="Buscar por ID, paciente, médico, empresa o código..."
          />
        </div>

        <div className="flex items-center gap-1.5">
          <CalendarIcon size={13} className="text-[#2383C2]" />
          <select
            value={anio}
            onChange={e => setAnio(e.target.value)}
            disabled={aniosDisponibles.length === 0}
            className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:border-[#2383C2] cursor-pointer disabled:opacity-50"
          >
            <option value="">
              {aniosDisponibles.length === 0 ? 'Sin datos' : 'Seleccionar año'}
            </option>
            {aniosDisponibles.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={mes}
            onChange={e => setMes(e.target.value)}
            disabled={!anio}
            className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:border-[#2383C2] cursor-pointer disabled:opacity-50"
          >
            <option value="">Seleccionar mes</option>
            <option value={TODOS_LOS_MESES}>Todos los meses</option>
            {mesesDelAnioActual.map(m => (
              <option key={m} value={m}>{NOMBRES_MESES[m] || m}</option>
            ))}
          </select>

          <select
            value={filtroAtributo}
            onChange={e => setFiltroAtributo(e.target.value)}
            className="h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 outline-none focus:border-[#2383C2] cursor-pointer"
          >
            <option value="">Atributo (Todos)</option>
            {ATRIBUTO_OPTIONS.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>

          {(busqueda || filtroAtributo) && (
            <button
              onClick={() => { setBusqueda(''); setFiltroAtributo(''); }}
              className="h-7 px-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded font-medium flex items-center gap-1 transition"
              title="Limpiar filtros"
            >
              <FilterX size={12} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* BARRA DE TOTALES */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400">
        <span>
          {!anio
            ? 'Selecciona un año para comenzar'
            : !mes
              ? 'Selecciona un mes (o "Todos los meses")'
              : mes === TODOS_LOS_MESES
                ? `Todos los meses de ${anio}`
                : `${NOMBRES_MESES[mes]} ${anio}`}
        </span>
        <span className="flex items-center gap-1">
          {totales.totalRegistros} registro(s) · {totales.totalCantidad} unidad(es) · Total ${totales.totalVenta.toLocaleString('es-CL')}
        </span>
      </div>

      {/* TABLA */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">ID</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Paciente</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Médico</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Empresa</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Código</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Descripción</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-center">Cant.</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Costo</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-center">Recargo</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Venta</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Lote</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Vencimiento</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">N° Guía</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Atributo</th>
              <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700">Período</th>
            </tr>
          </thead>
          <tbody>
            {documentosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-xs">
                  {!anio || !mes
                    ? 'Elige un año y un mes para ver los registros imputados.'
                    : 'No hay registros imputados para el período seleccionado.'}
                </td>
              </tr>
            ) : (
              documentosFiltrados.map(d => {
                const deliveryValor = (d.delivery || '').trim();
                const tieneVinculo = Boolean(d.deliveryVinculado);
                const lote = tieneVinculo && d.loteGuiaVinculado
                  ? d.loteGuiaVinculado
                  : (deliveryValor ? 'PAD' : 'Sin lote');
                const vencimiento = tieneVinculo && d.vencimientoGuiaVinculado
                  ? d.vencimientoGuiaVinculado
                  : (deliveryValor ? 'PAD' : 'Sin fecha');

                return (
                  <tr
                    key={d.refPath}
                    className="border-b border-gray-200 dark:border-gray-700/70 hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 font-semibold text-[#2383C2]">{d.gestionId}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">{d.nombre}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{d.medico}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{d.empresa}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{formatearFechaTabla(d.fecha)}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 font-mono text-emerald-600 dark:text-emerald-400">{d.codigo || 'S/C'}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 truncate max-w-[180px]" title={d.descripcion}>{d.descripcion}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-center text-gray-600 dark:text-gray-300">{d.cantidad}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">${Number(d.costo || 0).toLocaleString('es-CL')}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-center text-gray-600 dark:text-gray-300">
                      {d.recargoVecesCosto != null ? `${d.recargoVecesCosto} x` : '-'}
                    </td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-emerald-700 dark:text-emerald-400 font-semibold">${Number(d.venta || 0).toLocaleString('es-CL')}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{lote}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{vencimiento}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{d.numeroGuia ?? 0}</td>
                    <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full uppercase font-semibold ${getAtributoEstilo(d.atributo)}`}>
                        {d.atributo || '-'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-gray-500 dark:text-gray-400">
                      {(NOMBRES_MESES[d.periodoMes] || d.periodoMes)} {d.periodoAnio}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResumenConsignacion;