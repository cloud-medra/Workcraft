import React from 'react';
import { HeartPulse } from 'lucide-react';

const GestionHemodinamia = () => {
  return (
    <div className="w-full h-full flex flex-col bg-slate-50 dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-lg shadow-xs overflow-hidden font-sans relative">

      <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-4 py-2.5 flex items-center gap-2">
        <HeartPulse size={18} className="text-[#2383C2]" />
        <div>
          <h2 className="text-[13px] font-bold text-slate-800 dark:text-gray-100 uppercase tracking-wide">
            Gestión Hemodinamia
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-gray-400">
            Módulo en construcción
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 text-center space-y-2">
          <HeartPulse size={36} className="text-slate-300 dark:text-gray-600" />
          <p className="text-[13px] font-bold text-slate-700 dark:text-gray-200">
            Gestión de Hemodinamia
          </p>
          <p className="text-[11px] text-slate-400 dark:text-gray-500">
            Este módulo todavía no tiene funcionalidad implementada.
          </p>
        </div>
      </div>

    </div>
  );
};

export default GestionHemodinamia;
