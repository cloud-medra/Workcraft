import React from 'react';
import CambiarPasswordSeguro from './CambiarPasswordSeguro';
import { ShieldCheck } from 'lucide-react';

const Ajustes = () => {
  return (
    // Mantenemos la misma estructura de contenedor que ListadoUsuarios
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0">
      
      {/* Encabezado idéntico a ListadoUsuarios */}
      <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
        <ShieldCheck size={16} className="text-[#2383C2]" /> AJUSTES DE SEGURIDAD
      </h2>

      {/* Contenedor centralizado para el formulario */}
      <div className="flex-grow p-6 flex justify-center items-start bg-gray-50/50 overflow-auto">
        <div className="w-full max-w-lg">
          <CambiarPasswordSeguro />
        </div>
      </div>
    </div>
  );
};

export default Ajustes;