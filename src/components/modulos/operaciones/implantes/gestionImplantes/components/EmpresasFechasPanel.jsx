import React from 'react';
import { Layers, Building2, AlertCircle } from 'lucide-react';

const ESTADO_STYLES = {
  AGENDADO:         { dot: 'bg-yellow-400',  text: 'text-yellow-700 dark:text-yellow-400',   bg: 'bg-yellow-50 dark:bg-yellow-950/20',   border: 'border-yellow-300 dark:border-yellow-800' },
  AGENDANDO:        { dot: 'bg-yellow-400',  text: 'text-yellow-700 dark:text-yellow-400',   bg: 'bg-yellow-50 dark:bg-yellow-950/20',   border: 'border-yellow-300 dark:border-yellow-800' },
  PENDIENTE:        { dot: 'bg-orange-500',  text: 'text-orange-700 dark:text-orange-400',   bg: 'bg-orange-50 dark:bg-orange-950/20',   border: 'border-orange-300 dark:border-orange-800' },
  CARGADO:          { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-300 dark:border-emerald-800' },
  'S/COTIZACION':   { dot: 'bg-purple-600',  text: 'text-purple-700 dark:text-purple-400',   bg: 'bg-purple-50 dark:bg-purple-950/20',   border: 'border-purple-300 dark:border-purple-800' },
  'SIN COTIZACION': { dot: 'bg-purple-600',  text: 'text-purple-700 dark:text-purple-400',   bg: 'bg-purple-50 dark:bg-purple-950/20',   border: 'border-purple-300 dark:border-purple-800' },
  INCOMPLETO:       { dot: 'bg-sky-400',     text: 'text-sky-700 dark:text-sky-400',         bg: 'bg-sky-50 dark:bg-sky-950/20',         border: 'border-sky-300 dark:border-sky-800' }
};

const getEstadoStyle = (estado) => {
  const key = (estado || '').toUpperCase().trim();
  return ESTADO_STYLES[key] || {
    dot: 'bg-gray-400',
    text: 'text-gray-600 dark:text-gray-300',
    bg: 'bg-gray-50 dark:bg-gray-900',
    border: 'border-gray-200 dark:border-gray-700'
  };
};

export const EmpresasFechasPanel = ({
  bloques = [],
  bloqueActivoIndex,
  setBloqueActivoIndex,
  erroresFecha = {}
}) => {
  return (
    <div className="w-56 shrink-0 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 flex flex-col overflow-y-auto">
      <div className="p-2 border-b border-slate-200 dark:border-gray-700 flex items-center gap-1.5 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <Layers size={13} className="text-[#2383C2]" />
        <h2 className="text-[10px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
          Empresas / Fechas ({bloques.length})
        </h2>
      </div>

      {bloques.length === 0 ? (
        <div className="p-2.5 text-amber-700 dark:text-amber-400 text-[10px] flex items-start gap-1.5">
          <AlertCircle size={13} className="text-amber-600 shrink-0 mt-0.5" />
          <span>No se encontraron registros adicionales para esta admisión.</span>
        </div>
      ) : (
        <div className="p-1.5 space-y-1">
          {bloques.map((bloque, index) => {
            const activo = index === bloqueActivoIndex;
            const conError = erroresFecha[index];
            const estilo = getEstadoStyle(bloque.estado);

            return (
              <button
                key={bloque.uniqueKey}
                type="button"
                onClick={() => setBloqueActivoIndex(index)}
                className={`w-full flex flex-col gap-0.5 px-2.5 py-1.5 rounded-md border text-left transition ${
                  conError
                    ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-100'
                    : `${estilo.bg} ${estilo.border} ${estilo.text} hover:brightness-95`
                } ${activo ? 'ring-2 ring-[#2383C2] ring-offset-1 dark:ring-offset-gray-800' : ''}`}
              >
                <span className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${conError ? 'bg-red-500' : estilo.dot}`} />
                  <Building2 size={12} className="shrink-0 opacity-70" />
                  <span className="font-semibold truncate">{bloque.empresa || 'SIN EMPRESA'}</span>
                  {conError && !activo && <AlertCircle size={11} className="text-red-500 shrink-0 ml-auto" />}
                </span>
                <span className="text-[9px] font-mono pl-[18px] opacity-80">
                  {bloque.fecha || 'Sin fecha'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EmpresasFechasPanel;