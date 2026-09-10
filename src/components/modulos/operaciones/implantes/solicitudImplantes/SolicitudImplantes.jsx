import React, { useMemo } from 'react';
import {
  ClipboardList,
  Download,
  Building2,
  Calendar as CalendarIcon,
  FileText,
  Lock,
  Unlock,
  Package
} from 'lucide-react';
import Spinner from '../../../../ui/Spinner';
import { useSolicitudImplantesData } from './hooks/useSolicitudImplantesData';
import { usePeriodoAbiertoModulo } from '../gestionImplantes/components/Cargastab/usePeriodoAbiertoModulo';

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

/**
 * SolicitudImplantes.jsx
 *
 * Tabla plana (sin subfilas expandibles), igual criterio que
 * SolicitudConsignacion: cada ítem del bloque —incluyendo los ítems de
 * "contenido de PAD" (que ya viven como ítems planos con padPadreId)—
 * se muestra como su propia fila, repitiendo los datos de la gestión
 * (Admisión, Paciente, Médico, Fecha, Empresa). El checkbox de
 * selección actúa a nivel de bloque (documento en Firestore, donde vive
 * el campo "solicitud"): marcar cualquier fila de un mismo bloque
 * selecciona todas las filas de ese bloque en conjunto.
 */
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

  const fechaIngresoHoy = obtenerFechaHoyTexto();

  const filas = useMemo(() => {
    const resultado = [];
    bloques.forEach(bloque => {
      if (!bloque.items || bloque.items.length === 0) {
        resultado.push({ key: bloque.refPath, bloque, item: null });
        return;
      }
      bloque.items.forEach((item, idx) => {
        resultado.push({ key: `${bloque.refPath}-${item.id || idx}`, bloque, item });
      });
    });
    return resultado;
  }, [bloques]);

  const totalItems = filas.reduce((acc, f) => acc + (Number(f.item?.totalItem) || 0), 0);

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
          {bloques.length} gestión(es) · {filas.length} fila(s) · Total ${totalItems.toLocaleString('es-CL')}
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
                  checked={bloques.length > 0 && seleccionados.size === bloques.length}
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
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">
                <span className="flex items-center gap-1"><Building2 size={11} /> Empresa</span>
              </th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Código</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Descripción</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-center">Cantidad</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Precio</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Tipo Vinculado</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha de Registro</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha de Carga</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">N° Cotización</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha de Ingreso</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Lote</th>
              <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700">Vencimiento</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr>
                <td colSpan={17} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-xs">
                  No hay registros pendientes de solicitar por el momento.
                </td>
              </tr>
            ) : (
              filas.map(({ key, bloque, item }) => {
                const seleccionado = seleccionados.has(bloque.refPath);
                const esPrincipalPad = !!item?.esPad;
                const esContenidoPad = !!item?.padPadreId;

                return (
                  <tr
                    key={key}
                    className={`border-b border-gray-200 dark:border-gray-700/70 transition-colors ${
                      seleccionado
                        ? 'bg-blue-50/60 dark:bg-blue-950/20'
                        : esContenidoPad
                          ? 'bg-fuchsia-50/30 dark:bg-fuchsia-950/10 hover:bg-fuchsia-50/60 dark:hover:bg-fuchsia-950/20'
                          : 'hover:bg-gray-50/80 dark:hover:bg-gray-700/40'
                    }`}
                  >
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-center">
                      <input
                        type="checkbox"
                        checked={seleccionado}
                        onChange={() => toggleSeleccion(bloque.refPath)}
                        className="w-3.5 h-3.5 cursor-pointer accent-[#2383C2]"
                      />
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 font-semibold text-[#2383C2]">
                      {bloque.gestionId}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">
                      {bloque.nombre}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {bloque.medico}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {formatearFechaTabla(bloque.fecha)}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 truncate max-w-[160px]" title={bloque.empresa}>
                      {bloque.empresa}
                    </td>
                    <td className={`py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 ${esContenidoPad ? 'text-fuchsia-600 dark:text-fuchsia-400 italic' : 'font-mono text-emerald-600 dark:text-emerald-400'}`}>
                      {item ? (item.codigo || 'S/C') : '-'}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 truncate max-w-[180px]" title={item?.referencia || item?.descriptorAuto}>
                      <span className="flex items-center gap-1">
                        {esContenidoPad && <span className="text-fuchsia-400 dark:text-fuchsia-600 shrink-0">↳</span>}
                        <span className="truncate">{item ? (item.referencia || item.descriptorAuto || '-') : '-'}</span>
                        {esPrincipalPad && (
                          <span className="flex items-center gap-0.5 text-[8px] px-1 rounded bg-fuchsia-100 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-400 font-bold shrink-0">
                            <Package size={9} /> PAD
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-center text-gray-600 dark:text-gray-300">
                      {item ? item.cantidad : '-'}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-emerald-700 dark:text-emerald-400 font-semibold">
                      {item ? `$${Number(item.totalItem || 0).toLocaleString('es-CL')}` : '-'}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {item ? (item.tipoVinculado || 'P') : '-'}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {formatearFechaDeTimestamp(bloque.fechaRegistro)}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {formatearFechaTabla(bloque.fecha)}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {bloque.numCotizacion}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {fechaIngresoHoy}
                    </td>
                    <td className="py-1 px-2 border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                      {item ? item.lote : '-'}
                    </td>
                    <td className="py-1 px-2 text-gray-600 dark:text-gray-300">
                      {item ? formatearFechaTabla(item.vencimiento) : '-'}
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

export default SolicitudImplantes;