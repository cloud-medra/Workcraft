import React from 'react';
import CambiarPasswordSeguro from './CambiarPasswordSeguro';

const Ajustes = () => {
  return (
    <div className="max-w-xl">
      <h3 className="text-2xl font-bold mb-6 text-gray-800">Ajustes de Seguridad</h3>
      <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
        <p className="mb-6 text-sm text-gray-600">
          Para cambiar tu contraseña, primero debes validar tu identidad.
        </p>
        <div className="p-4 bg-gray-50 rounded-xl border">
          <CambiarPasswordSeguro />
        </div>
      </div>
    </div>
  );
};

export default Ajustes;