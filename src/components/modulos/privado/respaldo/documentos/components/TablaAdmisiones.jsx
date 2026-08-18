import React from 'react';
import { Eye } from 'lucide-react';

const RUTA = '/documentos/carga';

const TablaAdmisiones = ({ datos, onSeleccionarFila, hasPermission }) => {
  return (
    <div className="flex-grow overflow-auto">
      <table className="w-full text-left text-[11px] border-collapse">
        <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
          <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold">
            <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700">Admisión</th>
            <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700">Paciente</th>
            <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha CX</th>
            <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700">Médico</th>
            <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700">Previsión</th>
            <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700">Convenio</th>
            {hasPermission(RUTA, 'tabla_admisiones', 'cargaDatos_tabla_colEstadoOC') && <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700 text-center">Estado OC</th>}
            {hasPermission(RUTA, 'tabla_admisiones', 'cargaDatos_tabla_colTotal') && <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700 text-right">Total</th>}
            {hasPermission(RUTA, 'tabla_admisiones', 'cargaDatos_tabla_colEstadoGral') && <th className="p-2 border-b border-r border-gray-200 dark:border-gray-700 text-center">Estado General</th>}
            {hasPermission(RUTA, 'tabla_admisiones', 'cargaDatos_tabla_btnVer') && <th className="p-2 border-b border-gray-200 dark:border-gray-700 text-center">Acciones</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
          {datos.map((d) => {
            const totalFormateado = typeof d.TOTAL === 'number'
              ? new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(d.TOTAL)
              : d.TOTAL || "$0";

            return (
              <tr
                key={d.id}
                onDoubleClick={() => hasPermission(RUTA, 'tabla_admisiones', 'cargaDatos_tabla_btnVer') && onSeleccionarFila(d)}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors cursor-pointer"
              >
                <td className="p-2 border-r border-gray-200 dark:border-gray-700 font-bold text-gray-900 dark:text-gray-100">{d.ADMISION}</td>
                <td className="p-2 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">{d.PACIENTE}</td>
                <td className="p-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{d.FECHA_CX}</td>
                <td className="p-2 border-r border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">{d.MEDICO}</td>
                <td className="p-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{d.PREVISION || "-"}</td>
                <td className="p-2 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{d.CONVENIO || "-"}</td>

                {hasPermission(RUTA, 'tabla_admisiones', 'cargaDatos_tabla_colEstadoOC') && (
                  <td className="p-2 border-r border-gray-200 dark:border-gray-700 text-center whitespace-nowrap">
                    {(() => {
                      const archivosOC = d.documentos?.filter(docObj => docObj.nombre.toUpperCase().startsWith('OC_')) || [];
                      const cantOC = archivosOC.length;
                      const cantProveedores = d.CANT_PROVEEDORES || 1;

                      if (cantOC === 0) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400">SIN OC</span>;
                      if (cantOC < cantProveedores) {
                        return (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400" title="Faltan OC de este expediente">
                            PARCIAL ({cantOC}/{cantProveedores})
                          </span>
                        );
                      }
                      return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400">CON OC</span>;
                    })()}
                  </td>
                )}

                {hasPermission(RUTA, 'tabla_admisiones', 'cargaDatos_tabla_colTotal') && (
                  <td className="p-2 border-r border-gray-200 dark:border-gray-700 text-right font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                    {totalFormateado}
                  </td>
                )}

                {hasPermission(RUTA, 'tabla_admisiones', 'cargaDatos_tabla_colEstadoGral') && (
                  <td className="p-2 border-r border-gray-200 dark:border-gray-700 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      String(d.ESTADO_GENERAL).trim().toUpperCase() === 'FACTURADO' 
                        ? 'bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400' :
                      String(d.ESTADO_GENERAL).trim().toUpperCase() === 'PENDIENTE' 
                        ? 'bg-yellow-100 dark:bg-yellow-950/30 text-yellow-700 dark:text-yellow-400' 
                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300'
                    }`}>
                      {d.ESTADO_GENERAL || "SIN ESTADO"}
                    </span>
                  </td>
                )}

                {hasPermission(RUTA, 'tabla_admisiones', 'cargaDatos_tabla_btnVer') && (
                  <td className="p-2 text-center">
                    <button 
                      onClick={() => onSeleccionarFila(d)} 
                      className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors" 
                      title="Visualizar expediente"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default TablaAdmisiones;