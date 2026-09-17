import React from 'react';
import { X, History, Settings, Download, Upload, FileSpreadsheet, FileDown } from 'lucide-react';
import Spinner from '../../../../ui/Spinner';
// HistorialLogsContenido y DrawersOverlay son agnósticos del módulo (solo
// reciben props/estado, no llaman a ninguna colección de Implantes) — se
// reutilizan tal cual en vez de duplicar el switch de accion/estilos.
import { DrawersOverlay, HistorialLogsContenido } from '../../implantes/gestionImplantes/GestionesImplanteDrawers';

export { DrawersOverlay, HistorialLogsContenido };

export const LogDrawer = ({
  show,
  onClose,
  selectedImplante,
  logsList,
  loadingLogs,
  formatearFecha
}) => {
  const idMostrado = selectedImplante?.gestionId || selectedImplante?.agendaId || 'N/A';

  return (
    <div
      className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out ${
        show ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <History size={15} className="text-[#2383C2] shrink-0" />
          <div className="truncate">
            <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate">
              Historial de Cambios
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
              {selectedImplante?.nombre || 'Sin nombre'}{' '}
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                (ID: {idMostrado})
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <HistorialLogsContenido logsList={logsList} loadingLogs={loadingLogs} formatearFecha={formatearFecha} />
      </div>

      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0 text-[10px] text-gray-500">
        <span>{logsList.length} registros</span>
        <button
          onClick={onClose}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded font-bold transition"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

export const ConfigDrawer = ({
  show,
  onClose,
  totalImplantes,
  onExportar,
  onDescargarPlantilla,
  importFile,
  onSelectFile,
  importing,
  onEjecutarImportacion
}) => {
  return (
    <div
      className={`fixed top-0 right-0 z-50 h-full w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-300 ease-in-out ${
        show ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="px-3 py-2.5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shrink-0">
        <div className="flex items-center gap-2">
          <Settings size={16} className="text-[#2383C2]" />
          <div>
            <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100">
              Configuración de Hemodinamia
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Herramientas de importación y exportación
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 space-y-2">
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-bold text-[11px]">
            <Download size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span>Exportar Hemodinamia</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Descarga la lista actual de registros de Hemodinamia ({totalImplantes}{' '}
            registros) en un archivo compatible con Excel (CSV/XLSX).
          </p>
          <button
            onClick={onExportar}
            className="w-full h-8 mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
          >
            <FileSpreadsheet size={14} />
            <span>Exportar a Excel / CSV</span>
          </button>
        </div>

        <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 space-y-2.5">
          <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-bold text-[11px]">
            <Upload size={14} className="text-[#2383C2]" />
            <span>Importación Masiva</span>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
            Carga masivamente nuevos registros seleccionando un archivo
            formateado en Excel o CSV.
          </p>
          <button
            onClick={onDescargarPlantilla}
            type="button"
            className="w-full h-7 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded text-[10px] flex items-center justify-center gap-1.5 border border-gray-300 dark:border-gray-600 transition cursor-pointer"
          >
            <FileDown size={13} className="text-[#2383C2]" />
            <span>Descargar Plantilla CSV</span>
          </button>

          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-3 text-center bg-white dark:bg-gray-900 hover:border-[#2383C2] transition-colors cursor-pointer relative">
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={(e) => onSelectFile(e.target.files[0] || null)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <FileSpreadsheet
              size={22}
              className="mx-auto text-gray-400 dark:text-gray-500 mb-1"
            />
            <span className="block text-[10px] font-semibold text-gray-600 dark:text-gray-300 truncate">
              {importFile
                ? importFile.name
                : 'Haz clic para seleccionar archivo (.xlsx, .csv)'}
            </span>
          </div>

          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded text-[9px] text-blue-800 dark:text-blue-300">
            <strong>Formato de columnas requerido:</strong>
            <div className="font-mono mt-0.5 text-blue-600 dark:text-blue-400">
              NOMBRE | RUT | ESTADO
            </div>
          </div>

          <button
            onClick={onEjecutarImportacion}
            disabled={!importFile || importing}
            className={`w-full h-8 font-bold rounded text-[11px] flex items-center justify-center gap-1.5 transition ${
              !importFile || importing
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-[#2383C2] hover:bg-[#1d6fa5] text-white shadow-xs cursor-pointer'
            }`}
          >
            {importing ? <Spinner size="sm" color="#ffffff" /> : <Upload size={14} />}
            <span>{importing ? 'Procesando...' : 'Cargar Registro'}</span>
          </button>
        </div>
      </div>

      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900 shrink-0">
        <button
          onClick={onClose}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded font-bold transition text-[10px]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};
