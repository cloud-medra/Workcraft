import React from 'react';
import { Link2 } from 'lucide-react';

const EnlazarDatos = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900/40 rounded-lg m-4 border border-dashed border-gray-300 dark:border-gray-700">
      <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full mb-3">
        <Link2 size={28} />
      </div>
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
        Enlazar Datos
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
        Vinculación y conciliación de registros entre guías y solicitudes de ingresos.
      </p>
    </div>
  );
};

export default EnlazarDatos;