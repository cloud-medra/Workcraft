import { Download, Loader2, Lock, Unlock } from 'lucide-react';
import { useColumnResize } from '../../../../../hooks/useColumnResize';
import { ManijaRedimension } from '../../../../ui/ManijaRedimension';
import { useSolicitudesUnificadasData } from '../hooks/useSolicitudesUnificadasData';
import { ORIGEN_LABEL, ORIGEN_BADGE_STYLE } from '../utils/normalizarFila';
import FiltrosBusquedaOrigen from './FiltrosBusquedaOrigen';

const COLUMNAS = [
  { key: 'sel', label: '', ancho: 32, min: 28 },
  { key: 'origen', label: 'Origen', ancho: 105, min: 90 },
  { key: 'id', label: 'ID', ancho: 85, min: 60 },
  { key: 'paciente', label: 'Paciente', ancho: 170, min: 80 },
  { key: 'medico', label: 'Médico', ancho: 120, min: 70 },
  { key: 'fecha', label: 'Fecha', ancho: 90, min: 65 },
  { key: 'empresa', label: 'Empresa', ancho: 160, min: 80 },
  { key: 'cantidadItems', label: 'Ítems', ancho: 65, min: 45 },
  { key: 'costo', label: 'Costo', ancho: 95, min: 60 },
];

const formatearFechaTabla = (fechaString) => {
  if (!fechaString || !fechaString.includes('-')) return fechaString || '-';
  const [yyyy, mm, dd] = fechaString.split('-');
  return `${dd}-${mm}-${yyyy}`;
};

const SolicitudesUnificadasTable = () => {
  const { anchos, handleResize } = useColumnResize(COLUMNAS);
  const {
    filas,
    cargando,
    exportando,
    seleccionados,
    toggleSeleccion,
    toggleSeleccionarTodos,
    busqueda,
    setBusqueda,
    origenesSeleccionados,
    toggleOrigen,
    limpiarOrigenes,
    periodoImplantes,
    periodoConsignacion,
    periodoHemodinamia,
    handleExportarYMarcarSolicitado
  } = useSolicitudesUnificadasData();

  return (
    <div className="flex-grow flex flex-col overflow-hidden">
      <div className="px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-gray-700 bg-slate-50/60 dark:bg-gray-900/30 text-[10px]">
        <div className="flex items-center gap-3">
          <span className="text-slate-500 dark:text-gray-400">{filas.length} candidato{filas.length === 1 ? '' : 's'} · {seleccionados.size} seleccionado{seleccionados.size === 1 ? '' : 's'}</span>
          <span className={`flex items-center gap-1 ${periodoImplantes ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {periodoImplantes ? <Unlock size={11} /> : <Lock size={11} />}
            Implantes: {periodoImplantes ? `${periodoImplantes.mes} ${periodoImplantes.anio}` : 'sin período abierto'}
          </span>
          <span className={`flex items-center gap-1 ${periodoConsignacion ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {periodoConsignacion ? <Unlock size={11} /> : <Lock size={11} />}
            Consignación: {periodoConsignacion ? `${periodoConsignacion.mes} ${periodoConsignacion.anio}` : 'sin período abierto'}
          </span>
          <span className={`flex items-center gap-1 ${periodoHemodinamia ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {periodoHemodinamia ? <Unlock size={11} /> : <Lock size={11} />}
            Hemodinamia: {periodoHemodinamia ? `${periodoHemodinamia.mes} ${periodoHemodinamia.anio}` : 'sin período abierto'}
          </span>
        </div>
        <button
          type="button"
          onClick={handleExportarYMarcarSolicitado}
          disabled={exportando || seleccionados.size === 0}
          className="h-7 px-3 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-semibold flex items-center gap-1.5 transition text-[10.5px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportando ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Exportar y Marcar Solicitado
        </button>
      </div>

      <div className="px-3 py-1.5 border-b border-slate-200 dark:border-gray-700">
        <FiltrosBusquedaOrigen
          busqueda={busqueda}
          setBusqueda={setBusqueda}
          origenesSeleccionados={origenesSeleccionados}
          toggleOrigen={toggleOrigen}
          limpiarOrigenes={limpiarOrigenes}
        />
      </div>

      <div className="flex-grow overflow-auto">
        <table className="text-left text-[10.5px] border-collapse" style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead className="bg-slate-50 dark:bg-gray-900/60 sticky top-0 z-10">
            <tr className="text-slate-500 dark:text-gray-400 uppercase font-bold text-[9px]">
              {COLUMNAS.map(col => (
                <th
                  key={col.key}
                  className="relative px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700"
                  style={{ width: anchos[col.key] }}
                >
                  {col.key === 'sel' ? (
                    <input
                      type="checkbox"
                      checked={filas.length > 0 && seleccionados.size === filas.length}
                      onChange={toggleSeleccionarTodos}
                      className="cursor-pointer"
                    />
                  ) : col.label}
                  <ManijaRedimension colKey={col.key} anchoActual={anchos[col.key]} anchoMin={col.min} onResize={handleResize} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={COLUMNAS.length} className="px-3 py-6 text-center text-slate-400 dark:text-gray-500">
                  <Loader2 size={14} className="animate-spin inline mr-1.5" /> Cargando candidatos...
                </td>
              </tr>
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan={COLUMNAS.length} className="px-3 py-6 text-center text-slate-400 dark:text-gray-500">
                  Sin registros listos para solicitar
                </td>
              </tr>
            ) : (
              filas.map((fila) => (
                <tr
                  key={fila.id}
                  onClick={() => toggleSeleccion(fila.id)}
                  className={`cursor-pointer transition ${seleccionados.has(fila.id) ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'hover:bg-slate-50 dark:hover:bg-gray-800/60'}`}
                >
                  <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={seleccionados.has(fila.id)}
                      onChange={() => toggleSeleccion(fila.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60">
                    <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded border uppercase ${ORIGEN_BADGE_STYLE[fila.origen]}`}>
                      {ORIGEN_LABEL[fila.origen]}
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-semibold text-[#2383C2] truncate">{fila.gestionId}</td>
                  <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200 truncate">{fila.paciente}</td>
                  <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300 truncate">{fila.medico}</td>
                  <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">{formatearFechaTabla(fila.fecha)}</td>
                  <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300 truncate">{fila.empresa}</td>
                  <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-700 dark:text-gray-200">{fila.cantidadItems}</td>
                  <td className="px-2.5 py-1.5 border-b border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400 font-medium">
                    {fila.costo ? `$${Number(fila.costo).toLocaleString('es-CL')}` : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SolicitudesUnificadasTable;
