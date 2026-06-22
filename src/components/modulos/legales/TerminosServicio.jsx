import React from 'react';

const TerminosServicio = () => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Términos del Servicio</h1>
      <p className="text-xs text-gray-500 mb-6">Última actualización: Junio 2026</p>
      
      <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">1. Aceptación de los Términos</h2>
          <p>Al acceder y utilizar la plataforma Cloud - Medra, el usuario acepta de manera expresa y sin reservas los presentes términos y condiciones de uso...</p>
        </section>
      </div>
    </div>
  );
};

export default TerminosServicio;