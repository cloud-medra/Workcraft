import React from 'react';

export const TablaFacturas = ({ lista = [], onVerDetalle }) => (
  <table className="w-full text-left text-[12px] border-collapse">
    <thead className="bg-gray-100 sticky top-0">
      <tr className="text-gray-600 uppercase font-bold text-[11px]">
        <th className="p-3 border-b border-r border-gray-200">Folio</th>
        <th className="p-3 border-b border-r border-gray-200">Fecha Folio</th>
        <th className="p-3 border-b border-r border-gray-200">Orden</th>
        <th className="p-3 border-b border-r border-gray-200">Total Factura</th>
        <th className="p-3 border-b border-r border-gray-200">Estado</th>
        <th className="p-3 border-b border-gray-200 text-center">Acciones</th>
      </tr>
    </thead>
    <tbody>
      {lista.map((aud) => (
        <tr key={aud.id} className="border-b hover:bg-gray-50">
          <td className="p-3 text-gray-700 font-medium">{aud.folio}</td>
          <td className="p-3 text-gray-600">{aud.fechaFolio}</td>
          <td className="p-3 text-gray-600">{aud.orden}</td>
          <td className="p-3 text-gray-700 font-bold">${parseFloat(aud.totalFactura || 0).toLocaleString()}</td>
          <td className="p-3">
            {/* BADGE DINÁMICO SEGÚN EL ESTADO DE LA AUDITORÍA */}
            <span className={`text-[10px] px-2 py-1 rounded-full font-bold inline-block border ${
              aud.estado === 'AUDITADO' 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : aud.estado === 'CON DIFERENCIAS' 
                ? 'bg-red-100 text-red-700 border-red-300 animate-pulse' 
                : aud.estado === 'POR ACTUALIZAR' 
                ? 'bg-yellow-100 text-yellow-700 border-yellow-300' 
                : 'bg-gray-100 text-gray-600 border-gray-300' // Estado por defecto por si hay registros viejos
            }`}>
              {aud.estado || "SIN EVALUAR"}
            </span>
          </td>
          <td className="p-3 text-center">
            <button 
              onClick={() => onVerDetalle(aud)} 
              className="text-[#0E5B6D] hover:underline text-[11px] font-bold"
            >
              Ver Detalle
            </button>
          </td>
        </tr>
      ))}
      {lista.length === 0 && (
        <tr>
          <td colSpan="6" className="p-4 text-center text-gray-400 text-[12px]">
            No hay auditorías registradas.
          </td>
        </tr>
      )}
    </tbody>
  </table>
);