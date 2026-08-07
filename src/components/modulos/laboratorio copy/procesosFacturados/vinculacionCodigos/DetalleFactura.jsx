// src/components/facturas/DetalleFactura.jsx
import React from 'react';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Hash,
  Building2,
  Tag,
  DollarSign,
  Activity,
  Link as LinkIcon,
  Loader2
} from 'lucide-react';

/**
 * Vista de detalle de una factura: métricas, receptor y tabla de ítems.
 * Toda la lógica de negocio (fetch, vinculación, permisos) vive en el
 * componente padre (VinculacionCodigos) y se recibe aquí vía props.
 */
const DetalleFactura = ({
  factura,
  vinculando,
  puedeVincular,
  formatearFechaEmision,
  renderBadgeEstadoGeneral,
  onVolver,
  onVincular
}) => {
  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-gray-800">

      {/* CABECERA VISTA DETALLE */}
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onVolver}
            disabled={vinculando}
            className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded text-slate-600 dark:text-gray-300 flex items-center gap-1 text-[11px] font-medium transition-colors disabled:opacity-50"
            title="Volver a la lista"
          >
            <ArrowLeft size={15} className="text-[#2383C2]" />
            <span>Volver</span>
          </button>
          <span className="text-slate-300 dark:text-gray-600">|</span>
          <FileText className="text-[#2383C2]" size={15} />
          <span className="text-[12px] font-bold text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Detalle Factura Electrónica — Folio {factura.folio}
          </span>
        </div>
      </header>

      {/* TARJETAS RESUMEN METRICAS */}
      <div className="px-3 py-2 bg-slate-100/60 dark:bg-gray-900/40 border-b border-slate-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 shrink-0">
        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Hash size={11} className="text-[#2383C2]" />
            Folio
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            {factura.folio}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Calendar size={11} className="text-[#2383C2]" />
            Fecha Emisión
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            {formatearFechaEmision(factura.fchEmis)}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Tag size={11} className="text-[#2383C2]" />
            Ref. (OC)
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            {factura.folioRef || "N/A"}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <DollarSign size={11} className="text-[#2383C2]" />
            Total Neto
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            ${Math.round(Number(factura.total || 0)).toLocaleString('es-CL')}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Activity size={11} className="text-[#2383C2]" />
            Estado General
          </span>
          <div className="mt-0.5">
            {renderBadgeEstadoGeneral(factura.estado)}
          </div>
        </div>

        {/* BOTÓN CON SPINNER DE CARGA */}
        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <LinkIcon size={11} className="text-[#2383C2]" />
            Acción
          </span>
          {puedeVincular ? (
            <button
              onClick={onVincular}
              disabled={vinculando}
              className="mt-0.5 w-full h-5 bg-[#2383C2] hover:bg-[#1d6fa5] active:bg-[#175b88] disabled:bg-[#2383C2]/60 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-2xs disabled:cursor-not-allowed"
            >
              {vinculando ? (
                <>
                  <Loader2 size={11} className="animate-spin" />
                  <span>Vinculando...</span>
                </>
              ) : (
                <>
                  <LinkIcon size={11} />
                  <span>Vincular</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[10px] text-slate-400 italic">Sin permiso</span>
          )}
        </div>
      </div>

      {/* RECEPTOR */}
      <div className="px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 truncate">
          <Building2 size={13} className="text-[#2383C2] shrink-0" />
          <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase">Receptor:</span>
          <span className="text-[11px] font-medium text-slate-800 dark:text-gray-200 truncate">{factura.rznSoc}</span>
        </div>
        <span className="text-[10px] text-slate-400 font-semibold shrink-0">
          Total ítems: <strong className="text-slate-700 dark:text-gray-200">{factura.detalles?.length || 0}</strong>
        </span>
      </div>

      {/* TABLA DE DETALLES */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[11px] border-collapse min-w-[1200px]">
          <thead className="bg-slate-100 dark:bg-gray-900 sticky top-0 z-10 shadow-xs">
            <tr className="text-slate-600 dark:text-gray-400 uppercase font-bold text-[10px]">
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-10 text-center">#</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28">Cód. Factura</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700">Descripción</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-20 text-center">Cant.</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-20 text-center">Unidad</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 text-right">P. Unitario</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 text-right">Total Línea</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-32 bg-slate-200/60 dark:bg-gray-800/80 text-slate-800 dark:text-gray-200">Cód. Maestro</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 bg-slate-200/60 dark:bg-gray-800/80 text-slate-800 dark:text-gray-200">Descripción Maestro</th>
              <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 bg-slate-200/60 dark:bg-gray-800/80 text-right text-slate-800 dark:text-gray-200">Precio Maestro</th>
              <th className="py-1.5 px-2 border-b border-slate-200 dark:border-gray-700 w-32 bg-slate-200/60 dark:bg-gray-800/80 text-center text-slate-800 dark:text-gray-200">Estado Ítem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
            {factura.detalles?.length === 0 || !factura.detalles ? (
              <tr>
                <td colSpan="11" className="py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                  Esta factura no posee ítems cargados.
                </td>
              </tr>
            ) : (
              factura.detalles.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-slate-50 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-500 dark:text-gray-400 font-bold text-center">
                    {idx + 1}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-slate-500 dark:text-gray-400 truncate">
                    {item.codigo || '-'}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-800 dark:text-gray-200 font-medium">
                    {item.nombre}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center text-slate-600 dark:text-gray-300 font-medium">
                    {item.cantidad}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center text-slate-500 dark:text-gray-400 uppercase text-[10px]">
                    {item.unidad || '-'}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right text-slate-600 dark:text-gray-300">
                    ${Math.round(Number(item.precio || 0)).toLocaleString('es-CL')}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right font-bold text-slate-800 dark:text-gray-100">
                    ${Math.round(Number(item.monto || 0)).toLocaleString('es-CL')}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-slate-700 dark:text-gray-300 font-semibold bg-slate-50/50 dark:bg-gray-900/30">
                    {item.codigoMaestro || '-'}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-700 dark:text-gray-300 font-medium bg-slate-50/50 dark:bg-gray-900/30 truncate" title={item.descripcionMaestro}>
                    {item.descripcionMaestro || '-'}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-mono text-right text-slate-700 dark:text-gray-300 font-semibold bg-slate-50/50 dark:bg-gray-900/30">
                    {item.precioMaestro !== undefined ? `$${Math.round(Number(item.precioMaestro || 0)).toLocaleString('es-CL')}` : '-'}
                  </td>
                  <td className="py-1 px-2 border-b border-slate-200 dark:border-gray-700 text-center bg-slate-50/50 dark:bg-gray-900/30">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                      item.estadoItem === 'Sin Diferencias' || item.estadoItem === 'Vinculado'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                        : item.estadoItem === 'Con Diferencias'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                        : item.estadoItem === 'No Vinculado' || item.estadoItem === 'No encontrado'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50'
                        : 'bg-slate-100 text-slate-800 dark:bg-gray-700 dark:text-gray-300 border border-slate-200 dark:border-gray-600'
                    }`}>
                      {item.estadoItem === 'Vinculado' ? 'Sin Diferencias' : (item.estadoItem || 'Pendiente')}
                    </span>
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

export default DetalleFactura;