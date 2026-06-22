import React from 'react';

const PoliticasPrivacidad = () => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Política de Privacidad</h1>
      <p className="text-xs text-gray-500 mb-6">Última actualización: Junio 2026</p>
      
      <div className="space-y-4 text-xs text-gray-600 leading-relaxed">
        <section>
          <h2 className="text-sm font-bold text-gray-700 mb-2">1. Información que Recopilamos</h2>
          <p>En Cloud - Medra, la privacidad de tus datos es nuestra prioridad. Recopilamos información estrictamente necesaria para la gestión médica y administrativa...</p>
        </section>
        {/* Agrega aquí más secciones según tus requerimientos legales */}
      </div>
    </div>
  );
};

export default PoliticasPrivacidad;