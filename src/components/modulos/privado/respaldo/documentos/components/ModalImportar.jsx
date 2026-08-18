import React from 'react';
import { useDropzone } from 'react-dropzone';
import { X, FileText, Upload } from 'lucide-react';

const ModalImportar = ({ isOpen, onClose, onDrop }) => {
  const handleDrop = async (files) => {
    const success = await onDrop(files);
    if (success) onClose();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleDrop,
    accept: { 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all duration-300">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-100 dark:border-gray-700">
        
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex justify-between items-center bg-slate-50/60 dark:bg-gray-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-teal-50 dark:bg-teal-950/30 text-[#0E5B6D] dark:text-teal-400 rounded-lg">
              <Upload size={18} className="stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-gray-100 text-[15px]">Importar Matriz Excel</h3>
              <p className="text-[11px] text-slate-400 dark:text-gray-400 font-medium">Carga masiva de registros de admisiones hospitalarias</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 p-1.5 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={18} className="stroke-[2.5]" />
          </button>
        </div>

        <div className="p-6 bg-white dark:bg-gray-800">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 outline-none flex flex-col items-center justify-center min-h-[220px] ${
              isDragActive
                ? 'border-[#0E5B6D] dark:border-teal-500 bg-teal-50/30 dark:bg-teal-950/10 scale-[0.99]'
                : 'border-slate-200 dark:border-gray-700 bg-slate-50/30 dark:bg-gray-900/20 hover:bg-slate-50 dark:hover:bg-gray-700/30 hover:border-slate-300 dark:hover:border-gray-600'
            }`}
          >
            <input {...getInputProps()} />
            
            <div className={`p-4 rounded-full mb-4 transition-transform duration-200 ${
              isDragActive 
                ? 'bg-teal-100 dark:bg-teal-900/40 text-[#0E5B6D] dark:text-teal-400 scale-110' 
                : 'bg-white dark:bg-gray-800 text-slate-400 dark:text-gray-500 border border-slate-100 dark:border-gray-700 shadow-sm'
            }`}>
              <FileText size={32} className="stroke-[1.8]" />
            </div>

            <h4 className="text-[14px] font-bold text-slate-700 dark:text-gray-200 mb-1">
              {isDragActive ? "¡Suelta los archivos aquí!" : "Arrastra tu libro de Excel"}
            </h4>
            
            <p className="text-[12px] text-slate-400 dark:text-gray-400 max-w-[280px] leading-relaxed">
              O haz clic para <span className="text-[#0E5B6D] dark:text-teal-400 font-semibold underline">explorar tu equipo</span>. Solo se admiten extensiones .xlsx y .csv
            </p>
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-gray-900/50 border-t border-slate-100 dark:border-gray-700 flex justify-between items-center text-[11px] text-slate-400 dark:text-gray-400 font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Validación de columnas activa
          </span>
          <span>Procesamiento inmediato</span>
        </div>

      </div>
    </div>
  );
};

export default ModalImportar;