// src/components/modulos/laboratorio/procesosFacturados/HistorialLogsDrawer.jsx
import React from 'react';
import { History, X } from 'lucide-react';

const formatearFechaLog = (log) => {
  if (log.fechaHora) return log.fechaHora;
  if (log.timestamp?.toDate) return log.timestamp.toDate().toLocaleString('es-CL');
  return 'N/A';
};

/**
 * Panel lateral (drawer) que muestra el historial de cambios/logs de una factura.
 *
 * Props:
 * - show: boolean -> controla la animación de entrada/salida
 * - onClose: () => void
 * - factura: objeto factura seleccionada (para folio / razón social en el header)
 * - logs: array de logs ya cargados
 * - loading: boolean -> muestra spinner mientras carga
 */
const HistorialLogsDrawer = ({ show, onClose, factura, logs, loading }) => {
  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 ${
          show ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out text-[11px] ${
          show ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-md bg-[#2383C2]/10 dark:bg-[#2383C2]/20 text-[#2383C2]">
              <History size={16} />
            </div>
            <div className="truncate">
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate">Historial de Cambios</h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                Folio: {factura?.folio} - {factura?.rznSoc}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <div className="w-6 h-6 border-2 border-[#2383C2] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-[10px]">Cargando historial...</p>
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Sin registros de actividad.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 text-[10px] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                    {log.accion}
                  </span>
                  <span className="text-gray-400 text-[9px]">{formatearFechaLog(log)}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 font-semibold">Usuario: {log.usuario?.nombre || log.usuario?.email || "Usuario"}</p>
                <p className="text-gray-600 dark:text-gray-400">{log.detalle}</p>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900/80 shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded text-[10px] font-bold">
            Cerrar
          </button>
        </div>
      </aside>
    </>
  );
};

export default HistorialLogsDrawer;