import React from 'react';
import Spinner from '../../ui/Spinner';

const RUTA = '/documentos/carga';

const TablaDetallePaciente = ({ registrosDetalle, cargandoDetalle, hasPermission }) => {
  return (
    <div className="overflow-auto border border-gray-200 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 shadow-xs relative min-h-[100px] mt-4">
      {cargandoDetalle && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-[1px]">
          <div className="flex flex-col items-center gap-2">
            <Spinner size="sm" color="#2383C2" />
            <span className="text-[10px] text-[#2383C2] dark:text-[#369BCE] font-bold">Cargando registros...</span>
          </div>
        </div>
      )}
      <table className="w-full text-[11px] text-left border-collapse">
        <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <tr className="text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider">
            <th className="p-3 border-b border-gray-200 dark:border-gray-700">Proveedor</th>
            <th className="p-3 border-b border-gray-200 dark:border-gray-700">Descripción</th>
            <th className="p-3 border-b border-gray-200 dark:border-gray-700">Cant</th>
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_precios') && <th className="p-3 border-b border-gray-200 dark:border-gray-700">Precio U.</th>}
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_precios') && <th className="p-3 border-b border-gray-200 dark:border-gray-700">Monto OC</th>}
            <th className="p-3 border-b border-gray-200 dark:border-gray-700">OC</th>
            <th className="p-3 border-b border-gray-200 dark:border-gray-700">Estado</th>
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <th className="p-3 border-b border-gray-200 dark:border-gray-700">N° Factura</th>}
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <th className="p-3 border-b border-gray-200 dark:border-gray-700">F. Emisión</th>}
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <th className="p-3 border-b border-gray-200 dark:border-gray-700">N° Guía</th>}
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <th className="p-3 border-b border-gray-200 dark:border-gray-700">Lote</th>}
            {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <th className="p-3 border-b border-gray-200 dark:border-gray-700">F. Vencimiento</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {registrosDetalle.map((reg) => (
            <tr key={reg.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/40 last:border-b-0 transition-colors">
              <td className="p-3 font-semibold text-gray-700 dark:text-gray-200">{reg.PROVEEDOR}</td>
              <td className="p-3 text-gray-600 dark:text-gray-300 max-w-[220px] truncate" title={reg.DESCRIPCION}>{reg.DESCRIPCION}</td>
              <td className="p-3 text-gray-600 dark:text-gray-300 font-medium">{reg.CANT}</td>

              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_precios') && <td className="p-3 text-gray-600 dark:text-gray-300">${reg.PRECIO_U?.toLocaleString()}</td>}
              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_precios') && <td className="p-3 text-gray-700 dark:text-gray-100 font-bold">${reg.OC_MONTO?.toLocaleString()}</td>}

              <td className="p-3 text-[#2383C2] dark:text-[#369BCE] font-mono font-bold">{reg.OC}</td>
              <td className="p-3">
                <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] ${
                  reg.ESTADO === 'COMPLETO' 
                    ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400' 
                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400'
                }`}>
                  {reg.ESTADO}
                </span>
              </td>

              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <td className="p-3 text-gray-600 dark:text-gray-300 font-mono">{reg.NUMERO_FACTURA || '-'}</td>}
              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <td className="p-3 text-gray-500 dark:text-gray-400">{reg.FECHA_EMISION || '-'}</td>}
              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <td className="p-3 text-gray-600 dark:text-gray-300 font-mono">{reg.NUMERO_GUIA || '-'}</td>}
              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <td className="p-3 text-gray-500 dark:text-gray-400 font-mono">{reg.LOTE || '-'}</td>}
              {hasPermission(RUTA, 'tabla_detalle_paciente', 'cargaDatos_detalle_logistica') && <td className="p-3 text-gray-500 dark:text-gray-400 font-mono">{reg.FECHA_VENCIMIENTO || '-'}</td>}
            </tr>
          ))}
          {registrosDetalle.length === 0 && !cargandoDetalle && (
            <tr>
              <td colSpan={12} className="text-center py-8 text-gray-400 dark:text-gray-500 italic bg-white dark:bg-gray-800">
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