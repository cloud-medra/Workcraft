import React from 'react';
import {
  ListFilter,
  User,
  Building2,
  Calendar as CalendarIcon,
  DollarSign,
  FileText,
  Tag
} from 'lucide-react';
import { formatearFechaTabla, getEstadoCargaStyle } from '../Cargastab/cargasHelpers';

export const DetallesTab = ({ formData }) => {
  const bloques = formData?.bloques || [];

  return (
    <div className="p-4 max-w-7xl mx-auto w-full space-y-4">

      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <User size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Información General — Admisión #{formData?.gestionId || 'N/A'}
          </h3>
        </div>

        <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2.5 text-[10px]">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Paciente</span>
            <span className="text-slate-700 dark:text-gray-200 font-medium">{formData?.nombre || 'P'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Convenio</span>
            <span className="text-slate-700 dark:text-gray-200">{formData?.convenio || 'P'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Previsión</span>
            <span className="text-slate-700 dark:text-gray-200">{formData?.prevision || 'P'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Médico</span>
            <span className="text-slate-700 dark:text-gray-200">{formData?.medico || 'P'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Estado Operativo</span>
            <span className="text-slate-700 dark:text-gray-200 font-semibold">{formData?.estado || 'P'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Estado Informe</span>
            <span className="text-slate-700 dark:text-gray-200">{formData?.informe || 'P'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Centro</span>
            <span className="text-slate-700 dark:text-gray-200">{formData?.centro || 'P'}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Atributo</span>
            <span className="text-slate-700 dark:text-gray-200">{formData?.atributo || 'P'}</span>
          </div>

          {formData?.descripcion && formData.descripcion !== 'P' && (
            <div className="flex flex-col gap-0.5 col-span-2 md:col-span-3 lg:col-span-4">
              <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Descripción</span>
              <span className="text-slate-700 dark:text-gray-200">{formData.descripcion}</span>
            </div>
          )}
          {formData?.notaLibre && formData.notaLibre !== 'P' && (
            <div className="flex flex-col gap-0.5 col-span-2 md:col-span-3 lg:col-span-4">
              <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Nota Libre</span>
              <span className="text-slate-700 dark:text-gray-200">{formData.notaLibre}</span>
            </div>
          )}
        </div>
      </div>

      {bloques.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg p-6 text-center text-[10px] text-slate-400 dark:text-gray-500">
          Sin empresas/fechas registradas para esta admisión.
        </div>
      ) : (
        bloques.map((bloque, idx) => {
          const items = bloque.cotizaciones?.[0]?.items || [];
          const cotizacion = bloque.cotizaciones?.[0];

          return (
            <div key={bloque.uniqueKey || idx} className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">

              <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 dark:text-gray-200">
                    <Building2 size={13} className="text-[#2383C2]" />
                    {bloque.empresa || 'SIN EMPRESA'}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-gray-400">
                    <CalendarIcon size={11} className="text-[#2383C2]" />
                    {formatearFechaTabla(bloque.fecha)}
                  </span>
                  {cotizacion?.numCotizacion && (
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-gray-400">
                      <FileText size={11} className="text-[#2383C2]" />
                      {cotizacion.numCotizacion}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    <DollarSign size={11} />
                    ${Number(bloque.costo || 0).toLocaleString('es-CL')}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full uppercase bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 font-bold">
                    <Tag size={9} />
                    {bloque.solicitud || 'PENDIENTE'}
                  </span>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-slate-50 dark:bg-gray-900/60">
                    <tr className="text-slate-500 dark:text-gray-400 uppercase font-bold text-[9px]">
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Referencia</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Código</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Desc. Auto</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Clase</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Tipo</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Precio</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Veces Costo</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Venta</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Cant.</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Total Ítem</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Lote</th>
                      <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Vencimiento</th>
                      <th className="px-2.5 py-1.5 border-b border-slate-200 dark:border-gray-700">Estado Carga</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={13} className="px-3 py-4 text-center text-slate-400 dark:text-gray-500">
                          Sin ítems registrados en este bloque
                        </td>
                      </tr>
                    ) : (
                      items.map(it => {
                        const estilo = getEstadoCargaStyle(it.estadoCarga);
                        return (
                          <tr key={it.id} className={it.sinCodigo ? 'bg-red-50/50 dark:bg-red-950/20' : ''}>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-medium text-slate-700 dark:text-gray-200 truncate max-w-[160px]" title={it.referencia}>
                              {it.referencia}
                            </td>
                            <td className={`px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono ${it.sinCodigo ? 'text-red-600 dark:text-red-400 font-bold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {it.codigo || 'S/C'}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-500 dark:text-gray-400 truncate max-w-[160px]" title={it.descriptorAuto}>
                              {it.descriptorAuto || 'P'}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                              {it.clase || 'P'}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                              {it.tipoVinculado || 'P'}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                              ${Number(it.precio || 0).toLocaleString('es-CL')}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-600 dark:text-gray-300">
                              {it.vecesCosto || 1}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-700 dark:text-gray-200 font-medium">
                              ${Number(it.venta || 0).toLocaleString('es-CL')}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-600 dark:text-gray-300">
                              {it.cantidad}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400 font-semibold">
                              ${Number(it.totalItem || 0).toLocaleString('es-CL')}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                              {it.lote}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                              {formatearFechaTabla(it.vencimiento)}
                            </td>
                            <td className="px-2.5 py-1.5 border-b border-slate-100 dark:border-gray-700/60">
                              {it.sinCodigo ? (
                                <span className="text-[9px] font-semibold text-red-600 dark:text-red-400">SIN CÓDIGO</span>
                              ) : (
                                <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded border ${estilo.bg} ${estilo.border} ${estilo.text}`}>
                                  {it.estadoCarga || 'PENDIENTE'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {items.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50 dark:bg-gray-900/60 font-bold">
                        <td colSpan={9} className="px-2.5 py-1.5 border-t border-r border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 text-right">
                          Suma de ítems:
                        </td>
                        <td className="px-2.5 py-1.5 border-t border-r border-slate-200 dark:border-gray-700 text-emerald-700 dark:text-emerald-400">
                          ${items.reduce((acc, it) => acc + (Number(it.totalItem) || 0), 0).toLocaleString('es-CL')}
                        </td>
                        <td colSpan={3} className="border-t border-slate-200 dark:border-gray-700"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default DetallesTab;