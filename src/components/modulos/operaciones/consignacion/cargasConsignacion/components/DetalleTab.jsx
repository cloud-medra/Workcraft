import React from 'react';
import { User, Package } from 'lucide-react';

const formatearFechaTabla = (fechaString) => {
  if (!fechaString || !fechaString.includes('-')) return fechaString || '-';
  const partes = fechaString.split('-');
  if (partes.length !== 3) return fechaString;
  const [yyyy, mm, dd] = partes;
  return `${dd}-${mm}-${yyyy}`;
};

const renderP = (valor) => (valor === '' || valor === undefined || valor === null ? 'P' : valor);

const ESTADO_BADGE = {
  AGENDADO: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  PENDIENTE: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  INGRESADO: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
  REVISAR: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400',
  INCOMPLETO: 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400',
  'S/COTIZACION': 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  CARGADO: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
};

const DetalleTab = ({ registro, items = [] }) => {
  const totalItems = items.length;
  const sumaCostos = items.reduce((acc, it) => acc + (Number(it.costo) || 0) * (Number(it.cantidad) || 1), 0);

  return (
    <div className="p-4 max-w-7xl mx-auto w-full space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <User size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Información General — Admisión #{registro?.gestionId || 'N/A'}
          </h3>
        </div>

        <div className="p-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2.5 text-[10px]">
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Paciente</span>
            <span className="text-slate-700 dark:text-gray-200 font-medium">{renderP(registro?.nombre)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Médico</span>
            <span className="text-slate-700 dark:text-gray-200">{renderP(registro?.medico)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Fecha</span>
            <span className="text-slate-700 dark:text-gray-200">{formatearFechaTabla(registro?.fecha)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Centro</span>
            <span className="text-slate-700 dark:text-gray-200">{renderP(registro?.centro)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Convenio</span>
            <span className="text-slate-700 dark:text-gray-200">{renderP(registro?.convenio)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Previsión</span>
            <span className="text-slate-700 dark:text-gray-200">{renderP(registro?.prevision)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Registrado Por</span>
            <span className="text-slate-700 dark:text-gray-200">{renderP(registro?.registradoPor)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">N° de Ítems</span>
            <span className="text-slate-700 dark:text-gray-200 font-semibold">{totalItems}</span>
          </div>

          {registro?.descripcionPabellon && (
            <div className="flex flex-col gap-0.5 col-span-2 md:col-span-3 lg:col-span-4">
              <span className="font-bold text-slate-400 dark:text-gray-500 text-[9px] uppercase">Descripción Pabellón</span>
              <span className="text-slate-700 dark:text-gray-200">{registro.descripcionPabellon}</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <Package size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Ítems Registrados
          </h3>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-900/60">
              <tr className="text-slate-500 dark:text-gray-400 uppercase font-bold text-[9px]">
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Código</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Referencia</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Descripción</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Empresa</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700 text-center">Cant.</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Costo</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Total</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Delivery</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Atributo</th>
                <th className="px-2.5 py-1.5 border-b border-slate-200 dark:border-gray-700">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-4 text-center text-slate-400 dark:text-gray-500">
                    Sin ítems registrados para esta admisión
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const estadoKey = (it.estado || 'INGRESADO').toUpperCase();
                  const total = (Number(it.costo) || 0) * (Number(it.cantidad) || 1);
                  return (
                    <tr key={it.id}>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-mono text-emerald-600 dark:text-emerald-400">
                        {it.codigo || 'S/C'}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-medium text-slate-700 dark:text-gray-200 truncate max-w-[160px]" title={it.referencia}>
                        {it.referencia || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-500 dark:text-gray-400 truncate max-w-[180px]" title={it.descripcion}>
                        {it.descripcion || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                        {renderP(it.empresa)}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-center text-slate-700 dark:text-gray-200 font-semibold">
                        {it.cantidad ?? 0}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400">
                        {it.costo ? `$${Number(it.costo).toLocaleString('es-CL')}` : '-'}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-emerald-700 dark:text-emerald-400 font-semibold">
                        {total ? `$${Math.round(total).toLocaleString('es-CL')}` : '-'}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                        {it.delivery || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                        {it.atributo || '-'}
                      </td>
                      <td className="px-2.5 py-1.5 border-b border-slate-100 dark:border-gray-700/60">
                        <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-full uppercase ${ESTADO_BADGE[estadoKey] || 'bg-slate-100 text-slate-600'}`}>
                          {estadoKey}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-gray-900/60 font-bold">
                  <td colSpan={6} className="px-2.5 py-1.5 border-t border-r border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300 text-right">
                    Total de la admisión:
                  </td>
                  <td className="px-2.5 py-1.5 border-t border-r border-slate-200 dark:border-gray-700 text-emerald-700 dark:text-emerald-400">
                    ${Math.round(sumaCostos).toLocaleString('es-CL')}
                  </td>
                  <td colSpan={3} className="border-t border-slate-200 dark:border-gray-700"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default DetalleTab;