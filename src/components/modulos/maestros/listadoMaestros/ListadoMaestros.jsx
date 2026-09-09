import React from 'react';
import { ListTree, Clock } from 'lucide-react';

const ListadoMaestros = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg p-8 font-sans">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xs max-w-md text-center space-y-4">
        
        <div className="w-14 h-14 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#2383C2]">
          <ListTree size={28} />
        </div>

        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
            <Clock size={11} /> Vista en Desarrollo
          </span>
          <h2 className="text-base font-bold text-slate-800 dark:text-gray-100 uppercase tracking-wide mt-2">
            Listado de Maestros
          </h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
            Módulo en proceso de desarrollo para la consulta, exportación y gestión unificada de listados maestros.
          </p>
        </div>

      </div>
    </div>
  );
};

export default ListadoMaestros;