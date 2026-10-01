import { ClipboardList, Building2, Calendar as CalendarIcon, Copy } from 'lucide-react';
import { formatearFechaTabla } from '../Cargastab/cargasHelpers';

// OC de la admisión (sin duplicados) y su detalle por empresa/fecha. Sale de
// los datos ya en memoria del detalle (ocsPorBloque): sin lecturas propias.
export const OrdenTab = ({ bloques = [], ocsPorBloque = [], bloqueActivoIndex, handleCopiarTexto }) => {
  const ocsAdmision = [...new Set(ocsPorBloque.flat())];

  return (
    <div className="p-4 max-w-5xl mx-auto w-full space-y-4">
      <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
        <div className="px-3 py-1.5 bg-slate-50/80 dark:bg-gray-800/80 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5">
          <ClipboardList size={13} className="text-[#2383C2]" />
          <h3 className="text-[11px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
            Órdenes de compra ({ocsAdmision.length})
          </h3>
        </div>
        <div className="p-3 flex flex-wrap gap-1.5">
          {ocsAdmision.length === 0 ? (
            <span className="text-[10px] text-slate-400 dark:text-gray-500">
              Pendiente — aún no hay OC asignadas a esta admisión (usa "Sincronizar OC" en la barra de Gestión de Implantes).
            </span>
          ) : ocsAdmision.map(oc => (
            <button
              key={oc}
              type="button"
              onClick={() => handleCopiarTexto?.(oc)}
              title="Copiar OC"
              className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#2383C2]/30 bg-[#2383C2]/5 text-[#2383C2] dark:text-blue-400 font-mono font-semibold text-[11px] hover:bg-[#2383C2]/10 transition"
            >
              {oc} <Copy size={10} className="opacity-60" />
            </button>
          ))}
        </div>
      </div>

      {bloques.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700/80 rounded-lg shadow-xs overflow-hidden">
          <table className="w-full text-left text-[10px] border-collapse">
            <thead className="bg-slate-50 dark:bg-gray-900/60">
              <tr className="text-slate-500 dark:text-gray-400 uppercase font-bold text-[9px]">
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Empresa</th>
                <th className="px-2.5 py-1.5 border-b border-r border-slate-200 dark:border-gray-700">Fecha</th>
                <th className="px-2.5 py-1.5 border-b border-slate-200 dark:border-gray-700">OC</th>
              </tr>
            </thead>
            <tbody>
              {bloques.map((bloque, idx) => {
                const ocs = ocsPorBloque[idx] || [];
                return (
                  <tr
                    key={bloque.uniqueKey || idx}
                    className={idx === bloqueActivoIndex ? 'bg-[#2383C2]/5 dark:bg-blue-950/30' : 'hover:bg-gray-50/80 dark:hover:bg-gray-700/40'}
                  >
                    <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 font-medium text-slate-700 dark:text-gray-200">
                      <span className="flex items-center gap-1.5"><Building2 size={11} className="text-[#2383C2]" />{bloque.empresa || 'SIN EMPRESA'}</span>
                    </td>
                    <td className="px-2.5 py-1.5 border-b border-r border-slate-100 dark:border-gray-700/60 text-slate-600 dark:text-gray-300">
                      <span className="flex items-center gap-1.5"><CalendarIcon size={11} className="text-[#2383C2]" />{formatearFechaTabla(bloque.fecha)}</span>
                    </td>
                    <td className="px-2.5 py-1.5 border-b border-slate-100 dark:border-gray-700/60 font-mono">
                      {ocs.length
                        ? <span className="text-slate-700 dark:text-gray-200 font-semibold">{ocs.join(', ')}</span>
                        : <span className="text-slate-400 dark:text-gray-500 font-sans">Pendiente</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
