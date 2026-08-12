// src/components/modulos/laboratorio/procesosFacturados/solicitudDiferencias/DetalleSolicitudDif.jsx
import React from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  FileWarning,
  Calendar,
  Hash,
  Building2,
  DollarSign,
  Copy,
  Receipt,
  Tag,
  Activity,
  CalendarDays,
  FileSpreadsheet
} from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';

const DetalleSolicitudDif = ({
  factura,
  onVolver,
  formatearFechaEmision,
  renderBadgeEstadoGeneral,
  onExportarExcel
}) => {
  const { showToast } = useToast();

  if (!factura) return null;

  const copiarAlPortapapeles = (texto, label) => {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    showToast(`${label} copiado al portapapeles`, 'info');
  };

  const parseMontoToFloat = (valor) => {
    if (valor === undefined || valor === null || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    const strVal = String(valor).replace(/[^0-9,-]/g, '').replace(',', '.');
    return parseFloat(strVal) || 0;
  };

  const formatearMoneda = (valor) => {
    const monto = parseMontoToFloat(valor);
    return `$${Math.round(monto).toLocaleString('es-CL')}`;
  };

  const handleExportarExcelLocal = () => {
    if (onExportarExcel) {
      onExportarExcel(factura);
      return;
    }

    const detalles = factura.detalles || [];

    if (detalles.length === 0) {
      showToast('No hay detalles para exportar', 'warning');
      return;
    }

    const datosExcel = detalles.map((item) => {
      const tagEstado = item.vincuOCTexto || item.estadoItem || 'Sin información';

      return {
        'Folio': factura.folio || '',
        'Ref. (OC)': factura.folioRef || 'Sin Referencia',
        'Cód. Maestro': item.codigoMaestro || item.codigo_maestro || '',
        'Descripción Maestro': item.descripcionMaestro || item.nombreMaestro || item.descripcion_maestro || '',
        'Artículo OC': item.articuloOC || item.articulo_oc || item.codigoOC || item.codigo_oc || '',
        'Cant. Factura': item.cantidad ?? 0,
        'Precio Factura': item.precio ?? 0,
        'Cant. OC': item.cantidadOC ?? 0,
        'Precio OC': item.precioOC ?? 0,
        'Estado Discrepancia': tagEstado
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);

    worksheet['!cols'] = [
      { wch: 12 }, 
      { wch: 16 },
      { wch: 16 },
      { wch: 32 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 24 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitud Diferencias');

    const nombreArchivo = `Solicitud_Diferencias_Folio_${factura.folio || 'S-N'}.xlsx`;
    XLSX.writeFile(workbook, nombreArchivo);
    showToast('Archivo Excel generado con éxito', 'success');
  };

  const observaciones =
    factura.observacionDiferencia ||
    factura.motivo ||
    factura.observacion ||
    'No se registraron observaciones adicionales para las diferencias de esta factura.';

  const detalles = factura.detalles || [];

  return (
    <div className="relative flex flex-col h-full w-full bg-white dark:bg-gray-800 overflow-hidden font-sans">
      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onVolver}
            className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded text-slate-600 dark:text-gray-300 flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
            title="Volver a la lista"
          >
            <ArrowLeft size={15} className="text-[#2383C2]" />
            <span>Volver</span>
          </button>
          <span className="text-slate-300 dark:text-gray-600">|</span>
          <FileWarning className="text-amber-500" size={16} />
          <span className="text-[12px] font-bold text-slate-800 dark:text-gray-100 tracking-wide uppercase">
            Detalle Solicitud de Diferencias — Folio N° {factura.folio}
          </span>
        </div>
      </header>

      <div className="px-3 py-2 bg-slate-100/60 dark:bg-gray-900/40 border-b border-slate-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 shrink-0">
        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Hash size={11} className="text-[#2383C2]" /> Folio
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            {factura.folio}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Calendar size={11} className="text-[#2383C2]" /> Fecha Emisión
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            {formatearFechaEmision
              ? formatearFechaEmision(factura.fchEmis)
              : factura.fchEmis || '-'}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <CalendarDays size={11} className="text-[#2383C2]" /> Mes Imputado
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5 capitalize">
            {factura.mesImputado || factura.mes_imputado || '-'}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Tag size={11} className="text-[#2383C2]" /> Ref. (OC)
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            {factura.folioRef || 'Sin Referencia'}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <DollarSign size={11} className="text-[#2383C2]" /> Total Neto
          </span>
          <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
            {formatearMoneda(factura.total)}
          </span>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Activity size={11} className="text-[#2383C2]" /> Estado
          </span>
          <div className="mt-0.5 truncate">
            {renderBadgeEstadoGeneral ? (
              renderBadgeEstadoGeneral(factura.estado)
            ) : (
              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                {factura.estado || 'Diferencia Reportada'}
              </span>
            )}
          </div>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <FileSpreadsheet size={11} className="text-emerald-600 dark:text-emerald-500" /> Exportar
          </span>
          <button
            type="button"
            onClick={handleExportarExcelLocal}
            className="mt-0.5 w-full flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-xs cursor-pointer truncate"
            title="Generar o descargar solicitud en Excel"
          >
            <FileSpreadsheet size={11} />
            <span className="truncate">Solicitud Excel</span>
          </button>
        </div>

        <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
          <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <Copy size={11} className="text-[#2383C2]" /> Portapapeles
          </span>
          <button
            type="button"
            onClick={() =>
              copiarAlPortapapeles(
                `Folio: ${factura.folio}\nProveedor: ${factura.rznSoc}\nMonto: $${factura.total}\nObservación: ${observaciones}`,
                'Resumen'
              )
            }
            className="mt-0.5 w-full text-left text-[11px] font-bold text-slate-800 dark:text-gray-100 hover:text-[#2383C2] dark:hover:text-[#2383C2] hover:underline truncate cursor-pointer"
            title="Copiar resumen al portapapeles"
          >
            Copiar Resumen
          </button>
        </div>
      </div>

      <div className="px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2 truncate">
          <Building2 size={13} className="text-[#2383C2] shrink-0" />
          <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase">
            Proveedor:
          </span>
          <span
            className="text-[11px] font-semibold text-slate-800 dark:text-gray-200 truncate"
            title={factura.rznSoc}
          >
            {factura.rznSoc || 'Sin Razón Social'}
          </span>
          <span className="text-slate-400 dark:text-gray-500 text-[11px]">
            (RUT: {factura.rutEmisor || 'N/A'})
          </span>
          {factura.rutEmisor && (
            <button
              onClick={() => copiarAlPortapapeles(factura.rutEmisor, 'RUT')}
              className="text-slate-400 hover:text-[#2383C2] transition-colors p-0.5 cursor-pointer"
              title="Copiar RUT"
            >
              <Copy size={12} />
            </button>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-semibold shrink-0">
          Total Ítems: <strong className="text-slate-700 dark:text-gray-200">{detalles.length}</strong>
        </span>
      </div>

      <div className="flex-grow flex flex-col min-h-0 p-3 space-y-3 overflow-hidden">
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-md p-3 shrink-0 max-h-32 overflow-y-auto">
          <h4 className="font-semibold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1.5 text-xs">
            <Receipt size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Motivo u Observaciones de la Discrepancia</span>
          </h4>
          <p className="text-slate-700 dark:text-amber-200 text-[11px] leading-relaxed whitespace-pre-wrap">
            {observaciones}
          </p>
        </div>

        <div className="border border-slate-200 dark:border-gray-700 rounded-md overflow-auto flex-1 min-h-0 bg-white dark:bg-gray-800">
          <table className="w-full text-left text-[11px] border-collapse min-w-[1400px]">
            <thead className="bg-slate-100 dark:bg-gray-900 sticky top-0 z-10 shadow-xs">
              <tr className="text-slate-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-10 text-center">#</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28">Cód. Factura</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700">Descripción Factura</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-20 text-center">Cant. Factura</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 text-right">Precio Factura</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 text-right">Total Línea</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 bg-blue-100/70 dark:bg-blue-950/60 text-slate-900 dark:text-blue-200">Cód. Maestro</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 bg-blue-100/70 dark:bg-blue-950/60 text-slate-900 dark:text-blue-200">Descripción Maestro</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 bg-blue-100/70 dark:bg-blue-950/60 text-slate-900 dark:text-blue-200">Artículo OC</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-20 bg-blue-100/70 dark:bg-blue-950/60 text-center text-blue-900 dark:text-blue-200">Cant. OC</th>
                <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 bg-blue-100/70 dark:bg-blue-950/60 text-right text-blue-900 dark:text-blue-200">Precio OC</th>
                <th className="py-1.5 px-2 border-b border-slate-200 dark:border-gray-700 w-36 text-center">Estado Discrepancia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
              {detalles.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                    Esta factura no posee ítems cargados.
                  </td>
                </tr>
              ) : (
                detalles.map((item, idx) => {
                  const tieneDifCant = !!item.diferenciaCantidad;
                  const tieneDifPrecio = !!item.diferenciaPrecio;

                  const tagEstado = item.vincuOCTexto || item.estadoItem || 'Sin información';

                  return (
                    <tr key={item.id || item.codigo || idx} className="hover:bg-slate-50 dark:hover:bg-gray-700/40">
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-500 text-center font-bold">
                        {idx + 1}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-500">
                        {item.codigo || '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-800 dark:text-gray-200 font-medium">
                        {item.nombre || item.descripcion}
                      </td>
                      <td className={`py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center ${tieneDifCant ? 'font-bold text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30' : ''}`}>
                        {item.cantidad}
                      </td>
                      <td className={`py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right ${tieneDifPrecio ? 'font-bold text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30' : ''}`}>
                        {formatearMoneda(item.precio)}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right font-bold">
                        {formatearMoneda(item.monto || item.precio * item.cantidad)}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-600 dark:text-gray-300 bg-blue-50/30 dark:bg-blue-950/20">
                        {item.codigoMaestro || item.codigo_maestro || '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-800 dark:text-gray-200 bg-blue-50/30 dark:bg-blue-950/20 font-medium">
                        {item.descripcionMaestro || item.nombreMaestro || item.descripcion_maestro || '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-600 dark:text-gray-300 bg-blue-50/30 dark:bg-blue-950/20">
                        {item.articuloOC || item.articulo_oc || item.codigoOC || item.codigo_oc || '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center bg-blue-50/30 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                        {item.cantidadOC !== undefined && item.cantidadOC !== null ? item.cantidadOC : '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right bg-blue-50/30 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                        {item.precioOC !== undefined && item.precioOC !== null ? formatearMoneda(item.precioOC) : '-'}
                      </td>
                      <td className="py-1 px-2 border-b border-slate-200 dark:border-gray-700 text-center">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${
                            tagEstado === 'Sin diferencias'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : tagEstado.includes('Diferencia')
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}
                        >
                          {tagEstado}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DetalleSolicitudDif;