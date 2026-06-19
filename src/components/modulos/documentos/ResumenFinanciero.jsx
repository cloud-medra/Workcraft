import React from 'react';

const RUTA = '/documentos/carga';

const ResumenFinanciero = ({ estadisticasDetalle, hasPermission }) => {
  return (
    <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex flex-col gap-4 text-[11px] lg:col-span-1">

      {hasPermission(RUTA, 'resumen_financiero', 'cargaDatos_resumen_totales') && (
        <div>
          <h3 className="text-[11px] font-bold text-[#0E5B6D] uppercase mb-2 border-b border-gray-100 pb-1">
            Resumen General Monto OC
          </h3>
          <div className="grid grid-cols-3 gap-2 mb-3 text-center">
            <div className="bg-gray-50 p-2 rounded border border-gray-100">
              <p className="text-[9px] text-gray-400 font-bold uppercase">Total OC</p>
              <p className="text-[13px] font-bold text-gray-800">${estadisticasDetalle.totalGeneral.toLocaleString()}</p>
            </div>
            <div className="bg-green-50 p-2 rounded border border-green-100">
              <p className="text-[9px] text-green-600 font-bold uppercase">Facturado</p>
              <p className="text-[13px] font-bold text-green-700">${estadisticasDetalle.facturadoGlobal.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 p-2 rounded border border-amber-100">
              <p className="text-[9px] text-amber-600 font-bold uppercase">Pendiente</p>
              <p className="text-[13px] font-bold text-amber-700">${estadisticasDetalle.pendienteGlobal.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {hasPermission(RUTA, 'resumen_financiero', 'cargaDatos_resumen_estados') && estadisticasDetalle.porEstado.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] bg-gray-50 p-1.5 rounded border border-gray-100">
          <span className="font-bold text-gray-500 uppercase">Estados:</span>
          {estadisticasDetalle.porEstado.map(([estado, monto]) => (
            <span key={estado} className="text-gray-700">
              <span className="font-semibold text-gray-900">{estado}:</span> ${monto.toLocaleString()}
            </span>
          ))}
        </div>
      )}

      {hasPermission(RUTA, 'resumen_financiero', 'cargaDatos_resumen_tablaProveedores') && (
        <div className="flex-grow flex flex-col min-h-[120px]">
          <h3 className="text-[11px] font-bold text-[#0E5B6D] uppercase mb-1.5 border-b border-gray-100 pb-1">
            Monto OC por Proveedor
          </h3>
          <div className="overflow-auto max-h-[140px] border border-gray-100 rounded">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 text-[10px] text-gray-500 font-bold uppercase border-b border-gray-200">
                <tr>
                  <th className="p-1.5">Proveedor</th>
                  <th className="p-1.5 text-right">Facturado</th>
                  <th className="p-1.5 text-right">Pendiente</th>
                  <th className="p-1.5 text-right bg-gray-100 text-gray-700">Total</th>
                </tr>
              </thead>
              <tbody>
                {estadisticasDetalle.porProveedor.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center p-4 text-gray-400 italic">No hay registros</td>
                  </tr>
                ) : (
                  estadisticasDetalle.porProveedor.map(([proveedor, datos]) => (
                    <tr key={proveedor} className="border-b border-gray-50 hover:bg-gray-50/80 text-[10.5px]">
                      <td className="p-1.5 font-medium text-gray-700 truncate max-w-[120px]" title={proveedor}>{proveedor}</td>
                      <td className="p-1.5 text-right text-green-600">${datos.facturado.toLocaleString()}</td>
                      <td className="p-1.5 text-right text-amber-600">${datos.pendiente.toLocaleString()}</td>
                      <td className="p-1.5 text-right font-bold bg-gray-50/50 text-gray-800">${datos.total.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumenFinanciero;