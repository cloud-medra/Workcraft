import React from 'react';
import { UploadCloud } from 'lucide-react';

const CargaConsigna = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900/40 rounded-lg m-4 border border-dashed border-gray-300 dark:border-gray-700">
      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full mb-3">
        <UploadCloud size={28} />
      </div>
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
        Carga Consigna (Enlazar Datos)
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
        Arrastra tus archivos o haz clic para importar la información base de la consignación.
      </p>
    </div>
  );
};

export default CargaConsigna;