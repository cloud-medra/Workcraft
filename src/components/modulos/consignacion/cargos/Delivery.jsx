import React from 'react';
import { Truck } from 'lucide-react';

const Delivery = () => {
  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-gray-50 dark:bg-gray-900/40 rounded-lg m-4 border border-dashed border-gray-300 dark:border-gray-700">
      <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full mb-3">
        <Truck size={28} />
      </div>
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
        Despacho / Delivery
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
        Seguimiento de rutas, entregas físicas y recepción en conformidad.
      </p>
    </div>
  );
};

export default Delivery;