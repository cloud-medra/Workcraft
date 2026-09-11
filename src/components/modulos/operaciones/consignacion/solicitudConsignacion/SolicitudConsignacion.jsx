import React from 'react';
import {
  ClipboardCheck,
  Download,
  Calendar as CalendarIcon,
  FileText,
  Lock,
  Unlock,
  RefreshCw
} from 'lucide-react';
import Spinner from '../../../../ui/Spinner'; 
import { useSolicitudConsignacionData } from './hooks/useSolicitudConsignacionData';
import { usePeriodoAbiertoModulo } from '../../implantes/gestionImplantes/components/Cargastab/usePeriodoAbiertoModulo'; 

const formatearFechaTabla = (fechaString) => {
  if (!fechaString || !fechaString.includes('-')) return fechaString || '-';
  const [yyyy, mm, dd] = fechaString.split('-');
  return `${dd}-${mm}-${yyyy}`;
};

const formatearFechaDeTimestamp = (valor) => {
  if (!valor) return '-';
  const date = valor.toDate ? valor.toDate() : new Date(valor);
  if (isNaN(date.getTime())) return '-';
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const obtenerFechaHoyTexto = () => {
  const hoy = new Date();
  const dd = String(hoy.getDate()).padStart(2, '0');
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const yyyy = hoy.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
};

const SolicitudConsignacion = () => {
  const {
    items,
    cargando,
    exportando,
    seleccionados,
    toggleSeleccion,
    toggleSeleccionarTodos,
    handleExportarYMarcarSolicitado,
    refrescar
  } = useSolicitudConsignacionData();

  const { periodoAbierto, cargandoPeriodo } = usePeriodoAbiertoModulo('consignacion');

  const totalGeneral = items.reduce((acc, it) => acc + (Number(it.costoTotal) || 0), 0);
  const fechaIngresoHoy = obtenerFechaHoyTexto();

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {(cargando || exportando) && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">
              {exportando ? 'Exportando y actualizando...' : 'Cargando solicitudes...'}
            </h3>
          </div>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <ClipboardCheck size={15} className="text-[#2383C2]" />
          SOLICITUD DE CONSIGNACIÓN
        </h2>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refrescar}
            disabled={cargando}
            title="Actualizar lista (vuelve a leer guías y maestros)"
            className="p-1 rounded-md text-gray-500 hover:text-[#2383C2] dark:text-gray-400 dark:hover:text-[#2383C2] hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-40"
          >
            <RefreshCw size={14} className={cargando ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={() => handleExportarYMarcarSolicitado(periodoAbierto)}
            disabled={seleccionados.size === 0 || exportando}
            className="px-3 py-1 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-semibold flex items-center gap-1.5 transition text-[11px] shadow-xs active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={13} />
            <span>Exportar Seleccionados ({seleccionados.size})</span>
          </button>
        </div>
      </div>

      {/* PERÍODO ABIERTO (Control Mensual) — solo referencial. */}
      {!cargandoPeriodo && (
        periodoAbierto ? (
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/40">
            <Unlock size={11} className="shrink-0" />
            Período abierto para Consignación: <strong>{periodoAbierto.mes.toUpperCase()} {periodoAbierto.anio}</strong>
            <span className="text-emerald-600/70 dark:text-emerald-500/70 font-normal normal-case">
              — cada ítem se imputa según el período que estaba abierto cuando fue cargado, no necesariamente este.
            </span>
          </div>
        ) : (
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40">
            <Lock size={11} className="shrink-0" />
            No hay un período abierto para Consignación en Control Mensual.
          </div>
        )
      )}

      {/* BARRA INFORMATIVA */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400">
        <span>
          Ítems con Estado <strong className="text-gray-700 dark:text-gray-200">CARGADO</strong>, pendientes de descargar y solicitar.
        </span>
        <span className="flex items-center gap-1">
          <FileText size={11} className="text-[#2383C2]" />
          {items.length} ítem(s) · Total ${totalGeneral.toLocaleString('es-CL')} · Fecha de ingreso: {fechaIngresoHoy}
        </span>
      </div>

      {/* TABLA PRINCIPAL — plana, sin subfilas */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[10px] border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[9px]">
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8 text-center">
                <input
                  type="checkbox"
                  checked={items.length > 0 && seleccionados.size === items.length}
                  onChange={toggleSeleccionarTodos}
                  className="w-3.5 h-3.5 cursor-pointer accent-[#2383C2]"
                />
              </th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Admisión</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Paciente</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Médico</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">
                <span className="flex items-center gap-1"><CalendarIcon size={11} /> Fecha</span>
              </th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Empresa</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Código</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Descripción</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-center">Cantidad</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Precio</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Atributo</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha de Registro</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha de Carga</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">N° Guía</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha de Ingreso</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Lote</th>
              <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={17} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-xs">
                  No hay ítems pendientes de solicitar por el momento.
                </td>
              </tr>
            ) : (
              items.map((it) => {
                const seleccionado = seleccionados.has(it.id);
                return (
                  <tr
                    key={it.id}
                    className={`border-b border-gray-200 dark:border-gray-700/70 transition-colors ${
                      seleccionado
                        ? 'bg-blue-50/60 dark:bg-blue-950/20'
                        : it.esFilaGuia
                          ? 'bg-slate-50/60 dark:bg-gray-900/30 hover:bg-slate-100/70 dark:hover:bg-gray-900/50'
                          : 'hover:bg-gray-50/80 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-center">
                      <input
                        type="checkbox"
                        checked={seleccionado}
                        onChange={() => toggleSeleccion(it.id)}
                        className="w-3.5 h-3.5 cursor-pointer accent-[#2383C2]"
                      />
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 font-semibold text-[#2383C2]">
                      {it.gestionId}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">
                      {it.nombre}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {it.medico}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {formatearFechaTabla(it.fecha)}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 truncate max-w-[160px]" title={it.empresa}>
                      {it.empresa}
                    </td>
                    <td className={`py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 ${it.esFilaGuia ? 'text-slate-500 dark:text-gray-400 italic' : 'font-mono text-emerald-600 dark:text-emerald-400'}`}>
                      {it.codigo}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 truncate max-w-[180px]" title={it.descripcion}>
                      {it.descripcion}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-center text-gray-600 dark:text-gray-300">
                      {it.cantidad}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-emerald-700 dark:text-emerald-400 font-semibold">
                      ${Number(it.costo || 0).toLocaleString('es-CL')}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {it.atributo}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {formatearFechaDeTimestamp(it.fechaRegistro)}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {formatearFechaTabla(it.fecha)}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {it.numeroGuia}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {fechaIngresoHoy}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {it.lote}
                    </td>
                    <td className="py-1 px-2 text-gray-600 dark:text-gray-300">
                      {it.vencimiento}
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

export default SolicitudConsignacion;