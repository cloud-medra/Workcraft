import React, { useState } from 'react';
import {
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Download,
  Building2,
  Calendar as CalendarIcon,
  FileText,
  Lock,
  Unlock
} from 'lucide-react';
import Spinner from '../../../../ui/Spinner';
import { useSolicitudImplantesData } from './hooks/useSolicitudImplantesData';
import { usePeriodoAbiertoModulo } from '../gestionImplantes/components/Cargastab/usePeriodoAbiertoModulo';

const formatearFechaTabla = (fechaString) => {
  if (!fechaString || !fechaString.includes('-')) return fechaString || '-';
  const [yyyy, mm, dd] = fechaString.split('-');
  return `${dd}-${mm}-${yyyy}`;
};

const BloqueRow = ({ bloque, seleccionado, onToggle }) => {
  const [abierto, setAbierto] = useState(false);
  const totalBloque = bloque.items.reduce((acc, it) => acc + (Number(it.totalItem) || 0), 0);

  return (
    <>
      <tr className={`border-b border-gray-200 dark:border-gray-700/70 transition-colors ${seleccionado ? 'bg-blue-50/60 dark:bg-blue-950/20' : 'hover:bg-gray-50/80 dark:hover:bg-gray-700/40'}`}>
        <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-center">
          <input
            type="checkbox"
            checked={seleccionado}
            onChange={onToggle}
            className="w-3.5 h-3.5 cursor-pointer accent-[#2383C2]"
          />
        </td>
        <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70">
          <button
            type="button"
            onClick={() => setAbierto(o => !o)}
            className="flex items-center gap-1 text-slate-500 dark:text-gray-400 hover:text-[#2383C2] transition"
          >
            {abierto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </td>
        <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 font-semibold text-[#2383C2]">{bloque.gestionId}</td>
        <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">{bloque.nombre}</td>
        <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{bloque.medico}</td>
        <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{bloque.empresa}</td>
        <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{formatearFechaTabla(bloque.fecha)}</td>
        <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{bloque.numCotizacion}</td>
        <td className="py-1.5 px-2 border-r border-gray-200 dark:border-gray-700/70 text-center text-gray-600 dark:text-gray-300">{bloque.items.length}</td>
        <td className="py-1.5 px-2 text-emerald-700 dark:text-emerald-400 font-semibold">${totalBloque.toLocaleString('es-CL')}</td>
      </tr>

      {abierto && (
        <tr>
          <td colSpan={10} className="p-0 bg-slate-50/60 dark:bg-gray-900/40 border-b border-gray-200 dark:border-gray-700/70">
            <div className="p-2.5">
              <table className="w-full text-left text-[10px] border-collapse bg-white dark:bg-gray-800 rounded border border-slate-200 dark:border-gray-700 overflow-hidden">
                <thead className="bg-slate-100 dark:bg-gray-900/60">
                  <tr className="text-slate-500 dark:text-gray-400 uppercase font-bold text-[9px]">
                    <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Referencia</th>
                    <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Código</th>
                    <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Clase</th>
                    <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Tipo</th>
                    <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Cant.</th>
                    <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Total Ítem</th>
                    <th className="px-2 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Lote</th>
                    <th className="px-2 py-1.5 border-b border-slate-200 dark:border-gray-700">Vencimiento</th>
                  </tr>
                </thead>
                <tbody>
                  {bloque.items.map(it => (
                    <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-gray-700/30">
                      <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 truncate max-w-[160px]" title={it.referencia}>{it.referencia}</td>
                      <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono text-emerald-600 dark:text-emerald-400">{it.codigo || 'S/C'}</td>
                      <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">{it.clase || 'P'}</td>
                      <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">{it.tipoVinculado || 'P'}</td>
                      <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-600 dark:text-gray-300">{it.cantidad}</td>
                      <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400 font-semibold">${Number(it.totalItem || 0).toLocaleString('es-CL')}</td>
                      <td className="px-2 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">{it.lote}</td>
                      <td className="px-2 py-1.5 border-b border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">{formatearFechaTabla(it.vencimiento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const SolicitudImplantes = () => {
  const {
    bloques,
    cargando,
    exportando,
    seleccionados,
    toggleSeleccion,
    toggleSeleccionarTodos,
    handleExportarYMarcarSolicitado
  } = useSolicitudImplantesData();

  const { periodoAbierto, cargandoPeriodo } = usePeriodoAbiertoModulo('implantes');

  const totalGeneral = bloques.reduce((acc, b) =>
    acc + b.items.reduce((acc2, it) => acc2 + (Number(it.totalItem) || 0), 0), 0
  );

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
          <ClipboardList size={15} className="text-[#2383C2]" />
          SOLICITUD DE IMPLANTES
        </h2>

        <button
          onClick={handleExportarYMarcarSolicitado}
          disabled={seleccionados.size === 0 || exportando}
          className="px-3 py-1 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-semibold flex items-center gap-1.5 transition text-[11px] shadow-xs active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={13} />
          <span>Exportar Seleccionados ({seleccionados.size})</span>
        </button>
      </div>

      {/* PERÍODO ABIERTO (Control Mensual) — solo referencial.
          Los ítems ya listados acá quedaron sellados con el período que
          estaba abierto al momento de CARGARLOS (it.periodoAnio / it.periodoMes
          en CargasTab), por lo que este banner NO recalcula ni modifica ese
          valor: solo informa cuál es el período abierto ahora mismo, para que
          quede claro si coincide o no con el que traen los ítems al exportar. */}
      {!cargandoPeriodo && (
        periodoAbierto ? (
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/40">
            <Unlock size={11} className="shrink-0" />
            Período abierto para Implantes: <strong>{periodoAbierto.mes.toUpperCase()} {periodoAbierto.anio}</strong>
            <span className="text-emerald-600/70 dark:text-emerald-500/70 font-normal normal-case">
              — cada ítem se imputa según el período que estaba abierto cuando fue cargado, no necesariamente este.
            </span>
          </div>
        ) : (
          <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40">
            <Lock size={11} className="shrink-0" />
            No hay un período abierto para Implantes en Control Mensual.
          </div>
        )
      )}

      {/* BARRA INFORMATIVA */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 text-[10px] text-gray-500 dark:text-gray-400">
        <span>
          Registros con Estado de Carga completo (<strong className="text-gray-700 dark:text-gray-200">CARGADO</strong>), pendientes de descargar y solicitar.
        </span>
        <span className="flex items-center gap-1">
          <FileText size={11} className="text-[#2383C2]" />
          {bloques.length} registro(s) · Total ${totalGeneral.toLocaleString('es-CL')}
        </span>
      </div>

      {/* TABLA PRINCIPAL */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8 text-center">
                <input
                  type="checkbox"
                  checked={bloques.length > 0 && seleccionados.size === bloques.length}
                  onChange={toggleSeleccionarTodos}
                  className="w-3.5 h-3.5 cursor-pointer accent-[#2383C2]"
                />
              </th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8"></th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">ID</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Paciente</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Médico</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 flex items-center gap-1">
                <Building2 size={11} /> Empresa
              </th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">
                <span className="flex items-center gap-1"><CalendarIcon size={11} /> Fecha</span>
              </th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">N° Cotización</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-center">Ítems</th>
              <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {bloques.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-xs">
                  No hay registros pendientes de solicitar por el momento.
                </td>
              </tr>
            ) : (
              bloques.map(bloque => (
                <BloqueRow
                  key={bloque.refPath}
                  bloque={bloque}
                  seleccionado={seleccionados.has(bloque.refPath)}
                  onToggle={() => toggleSeleccion(bloque.refPath)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SolicitudImplantes;