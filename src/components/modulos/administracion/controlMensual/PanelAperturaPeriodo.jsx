import React from 'react';
import { X, CheckSquare, Square } from 'lucide-react';
import { MODULOS, MESES } from './constants';

const PanelAperturaPeriodo = ({
  isOpen,
  onClose,
  anioApertura,
  setAnioApertura,
  mesApertura,
  setMesApertura,
  modulosSeleccionados, // Array de IDs de módulos seleccionados (ej: ['laboratorio', 'implantes'])
  setModulosSeleccionados,
  onConfirm
}) => {
  if (!isOpen) return null;

  const todosSeleccionados = modulosSeleccionados.length === MODULOS.length;

  const handleToggleTodos = () => {
    if (todosSeleccionados) {
      setModulosSeleccionados([]);
    } else {
      setModulosSeleccionados(MODULOS.map(m => m.id));
    }
  };

  const handleToggleModulo = (id) => {
    if (modulosSeleccionados.includes(id)) {
      setModulosSeleccionados(modulosSeleccionados.filter(mId => mId !== id));
    } else {
      setModulosSeleccionados([...modulosSeleccionados, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/30 backdrop-blur-[1px] flex justify-end">
      <div className="w-full max-w-sm bg-white dark:bg-gray-800 h-full shadow-2xl border-l border-slate-200 dark:border-gray-700 flex flex-col font-sans animate-in slide-in-from-right duration-200">
        
        {/* HEADER */}
        <div className="p-4 bg-slate-50 dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-slate-800 dark:text-gray-100 uppercase tracking-wide">
            Apertura de Período
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 p-1 rounded transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* CONTENIDO */}
        <div className="p-4 flex-1 space-y-4 overflow-y-auto">
          
          {/* SELECCIÓN DE AÑO */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase mb-1">
              Año
            </label>
            <select
              value={anioApertura}
              onChange={(e) => setAnioApertura(e.target.value)}
              className="w-full h-8 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 text-[11px] px-2 outline-none focus:border-[#2383C2]"
            >
              {[2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* SELECCIÓN DE MES */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase mb-1">
              Mes
            </label>
            <select
              value={mesApertura}
              onChange={(e) => setMesApertura(e.target.value)}
              className="w-full h-8 border border-slate-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100 text-[11px] px-2 outline-none focus:border-[#2383C2]"
            >
              {MESES.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {/* SELECCIÓN DE MÓDULOS CON CHECKBOXES */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300 uppercase">
                Módulos a abrir
              </label>
              <button
                type="button"
                onClick={handleToggleTodos}
                className="text-[10px] font-semibold text-[#2383C2] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {todosSeleccionados ? <CheckSquare size={12} /> : <Square size={12} />}
                {todosSeleccionados ? 'Desmarcar Todos' : 'Marcar Todos'}
              </button>
            </div>

            <div className="space-y-1.5 border border-slate-200 dark:border-gray-700 rounded-md p-2 bg-slate-50/50 dark:bg-gray-900/40">
              {MODULOS.map((mod) => {
                const checked = modulosSeleccionados.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    onClick={() => handleToggleModulo(mod.id)}
                    className={`flex items-center gap-2.5 p-2 rounded text-[11px] font-medium cursor-pointer transition select-none ${
                      checked
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-[#2383C2] dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                        : 'bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}} // Manejado por la etiqueta contenedora
                      className="rounded text-[#2383C2] focus:ring-[#2383C2] h-3.5 w-3.5 cursor-pointer"
                    />
                    <span>{mod.nombre}</span>
                  </label>
                );
              })}
            </div>
            {modulosSeleccionados.length === 0 && (
              <p className="text-[10px] text-red-500 mt-1">
                Debes seleccionar al menos un módulo.
              </p>
            )}
          </div>

        </div>

        {/* FOOTER ACCIONES */}
        <div className="p-4 border-t border-slate-200 dark:border-gray-700 flex justify-end gap-2 bg-slate-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded text-[11px] font-bold hover:bg-slate-300 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            disabled={modulosSeleccionados.length === 0}
            onClick={onConfirm}
            className="px-3 py-1.5 bg-[#2383C2] hover:bg-[#1d6fa5] disabled:bg-slate-300 dark:disabled:bg-gray-700 text-white rounded text-[11px] font-bold shadow-xs transition cursor-pointer"
          >
            Confirmar Apertura
          </button>
        </div>

      </div>
    </div>
  );
};

export default PanelAperturaPeriodo;