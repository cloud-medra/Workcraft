import React from 'react';
import Spinner from '../../ui/Spinner';

const RUTA = '/documentos/carga';

const TablaDetallePaciente = ({ registrosDetalle, cargandoDetalle, hasPermission }) => {
  return (
    <div className="overflow-auto border border-gray-200 rounded-2xl bg-white shadow-xs relative min-h-[100px] mt-4">
      {cargandoDetalle && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
          <div className="flex flex-col items-center gap-2">
            <Spinner size="sm" color="#0E5B6D" />
            <span className="text-[10px] text-[#0E5B6D] font-bold">Cargando registros...</span>
          </div>
        </div>
      )}
      <table className="w-full text-[11px] text-left border-collapse">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-gray-500 uppercase font-bold tracking-wider">
            <th className="p-3 border-b border-gray-200">Proveedor</th>
            <th className="p-3 border-b border-gray-200">Descripción</th>
            <th className="p-3 border-b border-gray-200">Cant</th>
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_precios') && <th className="p-3 border-b border-gray-200">Precio U.</th>}
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_precios') && <th className="p-3 border-b border-gray-200">Monto OC</th>}
            <th className="p-3 border-b border-gray-200">OC</th>
            <th className="p-3 border-b border-gray-200">Estado</th>
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <th className="p-3 border-b border-gray-200">N° Factura</th>}
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <th className="p-3 border-b border-gray-200">F. Emisión</th>}
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <th className="p-3 border-b border-gray-200">N° Guía</th>}
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <th className="p-3 border-b border-gray-200">Lote</th>}
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <th className="p-3 border-b border-gray-200">F. Vencimiento</th>}
          </tr>
        </thead>
        <tbody>
          {registrosDetalle.map((reg) => (
            <tr key={reg.id} className="hover:bg-gray-50/80 border-b border-gray-100 last:border-b-0 transition-colors">
              <td className="p-3 font-semibold text-gray-700">{reg.PROVEEDOR}</td>
              <td className="p-3 text-gray-600 max-w-[220px] truncate" title={reg.DESCRIPCION}>{reg.DESCRIPCION}</td>
              <td className="p-3 text-gray-600 font-medium">{reg.CANT}</td>

              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_precios') && <td className="p-3 text-gray-600">${reg.PRECIO_U?.toLocaleString()}</td>}
              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_precios') && <td className="p-3 text-gray-700 font-bold">${reg.OC_MONTO?.toLocaleString()}</td>}

              <td className="p-3 text-[#0E5B6D] font-mono font-bold">{reg.OC}</td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${reg.ESTADO === 'COMPLETO' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                  {reg.ESTADO}
                </span>
              </td>

              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <td className="p-3 text-gray-600 font-mono">{reg.NUMERO_FACTURA || '-'}</td>}
              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <td className="p-3 text-gray-500">{reg.FECHA_EMISION || '-'}</td>}
              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <td className="p-3 text-gray-600 font-mono">{reg.NUMERO_GUIA || '-'}</td>}
              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <td className="p-3 text-gray-500 font-mono">{reg.LOTE || '-'}</td>}
              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <td className="p-3 text-gray-500">{reg.FECHA_VENCIMIENTO || '-'}</td>}
            </tr>
          ))}
          {registrosDetalle.length === 0 && !cargandoDetalle && (
            <tr>
              <td colSpan={12} className="text-center py-8 text-gray-400 italic">
                No hay insumos o proveedores asociados a esta admisión.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaDetallePaciente;