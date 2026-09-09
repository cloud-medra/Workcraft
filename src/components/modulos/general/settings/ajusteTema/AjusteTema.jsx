import React from 'react';
import { Sun, Moon, Palette } from 'lucide-react';

// Este componente es solo presentación: la lógica real de guardar la
// preferencia en Firestore y aplicar la clase 'dark' al <html> ya vive en
// Dashboard.jsx (toggleModoPantalla). Aquí solo decidimos SI hay que
// llamarla, comparando el modo que el usuario clickeó contra el actual.
const AjusteTema = ({ isDarkMode, toggleModoPantalla }) => {
  const seleccionar = (quiereOscuro) => {
    // toggleModoPantalla() invierte el estado actual (no lo "setea"), así
    // que solo la llamamos si el modo pedido es distinto al actual.
    if (quiereOscuro !== isDarkMode) {
      toggleModoPantalla();
    }
  };

  const OpcionTema = ({ modoOscuro, icon: Icon, titulo, descripcion, preview }) => {
    const activo = isDarkMode === modoOscuro;

    return (
      <button
        type="button"
        onClick={() => seleccionar(modoOscuro)}
        className={`text-left border rounded-lg p-3 transition-all ${
          activo
            ? 'border-[#2383C2] ring-1 ring-[#2383C2] bg-[#2383C2]/5 dark:bg-[#2383C2]/10'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className={`h-16 rounded-md mb-2.5 flex items-center justify-center ${preview}`}>
          <Icon size={22} className={modoOscuro ? 'text-white' : 'text-amber-500'} />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{titulo}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{descripcion}</p>
          </div>
          <div
            className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
              activo ? 'border-[#2383C2] bg-[#2383C2]' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
        </div>
      </button>
    );
  };

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col gap-4">
        <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2">
            <Palette size={16} className="text-[#2383C2]" />
            Tema y Apariencia
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Elige cómo quieres ver el sistema. Se guarda en tu cuenta.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <OpcionTema
            modoOscuro={false}
            icon={Sun}
            titulo="Modo Claro"
            descripcion="Fondo claro, texto oscuro"
            preview="bg-gray-100"
          />
          <OpcionTema
            modoOscuro={true}
            icon={Moon}
            titulo="Modo Oscuro"
            descripcion="Fondo oscuro, texto claro"
            preview="bg-gray-800"
          />
        </div>
      </div>
    </div>
  );
};

export default AjusteTema;