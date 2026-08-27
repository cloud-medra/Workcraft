import React from 'react';
import { Layers, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

const AvanceInventario = () => {
  const avancesInventario = [
    { id: 1, tarea: 'Integración de icono copiar rut - Módulo Laboratorio -> Empresas', estado: 'Completado' },
    { id: 2, tarea: 'Integrar icono copiar rut - Módulo Vacunatorio / Maestros -> Empresas', estado: 'Pendiente' },
    { id: 3, tarea: 'Integrar input de texto para ingresar notas en Resumen General en base a rol', estado: 'Pendiente' },
    { id: 4, tarea: 'Actualizar Módulo Laboratorio / Vacunatorio - para rechazar facturas', estado: 'En Progreso' },
    { id: 5, tarea: 'Integrar configuración - Para Ordenar los módulos según cada usuario', estado: 'Pendiente' },
    { id: 6, tarea: 'Nuevo Items de historial unidad, actualizacion de Historial, dashbaord y config.', estado: 'Completado' }
  ];

  const renderEstadoBadge = (estado) => {
    switch (estado) {
      case 'Completado':
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.5 rounded shrink-0 uppercase">
            <CheckCircle2 size={10} /> {estado}
          </span>
        );
      case 'En Progreso':
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 px-1.5 py-0.5 rounded shrink-0 uppercase">
            <Clock size={10} /> {estado}
          </span>
        );
      case 'Pendiente':
      default:
        return (
          <span className="flex items-center gap-1 text-[9px] font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 px-1.5 py-0.5 rounded shrink-0 uppercase">
            <AlertCircle size={10} /> {estado}
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-3 flex flex-col flex-grow justify-start">
      <div className="flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
        <Layers size={13} className="text-[#2383C2]" />
        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">Avance en Módulo Inventario</span>
      </div>

      <div className="flex flex-col gap-1.5 w-full">
        {avancesInventario.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 p-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700/50 rounded"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono">
                {item.id}.
              </span>
              <span className="text-[10.5px] text-gray-600 dark:text-gray-300 font-medium truncate">
                {item.tarea}
              </span>
            </div>

            {renderEstadoBadge(item.estado)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AvanceInventario;