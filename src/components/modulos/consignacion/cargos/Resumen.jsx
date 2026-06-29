import React from 'react';
import { BarChart3 } from 'lucide-react';

const Resumen = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900/40 rounded-lg m-4 border border-dashed border-gray-300 dark:border-gray-700">
      <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-full mb-3">
        <BarChart3 size={28} />
      </div>
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
        Resumen de Consignación
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
        Métricas clave, estados finales de cargos y reportes globales listos para análisis.
      </p>
    </div>
  );
};

export default Resumen;