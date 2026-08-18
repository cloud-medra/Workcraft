import React, { useState } from 'react';
import SolicitudIngresos from './SolicitudIngresos';
import CargaConsigna from './CargaConsigna';
import EnlazarDatos from './EnlazarDatos';
import Delivery from './Delivery';
import Resumen from './Resumen';
import SolicitudOrden from './SolicitudOrden'; // <-- NUEVO IMPORT AGREGADO AQUÍ

const TABS = [
  { key: 'ingresos',  label: 'Ingresos'       },
  { key: 'enlazar',   label: 'Enlazar Datos'  },
  { key: 'cargas',    label: 'Cargas'         }, 
  { key: 'delivery',  label: 'Delivery'       },
  { key: 'solicitud', label: 'Solicitud'      }, // <-- ESTA ES LA PESTAÑA DESTINO
  { key: 'resumen',   label: 'Resumen'        },
];

const ConsignacionLayout = () => {
  const [activeTab, setActiveTab] = useState('ingresos');

  const renderContent = () => {
    switch (activeTab) {
      case 'ingresos':  return <SolicitudIngresos />;
      case 'enlazar':   return <EnlazarDatos />;
      case 'cargas':    return <CargaConsigna />; 
      case 'delivery':  return <Delivery />;
      case 'solicitud': return <SolicitudOrden />; // <-- REEMPLAZADO EL DIV POR TU NUEVO COMPONENTE
      case 'resumen':   return <Resumen />;
      default:          return null;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden transition-colors">

      {/* Barra de pestañas */}
      <div className="flex shrink-0 bg-gray-50 dark:bg-gray-900/60 overflow-x-auto px-3 pt-2 gap-1 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={[
                'relative px-4 py-2 text-[11px] font-semibold tracking-widest uppercase whitespace-nowrap rounded-t-md transition-all duration-200 focus:outline-none select-none',
                isActive
                  ? 'text-[#2383C2] dark:text-[#369BCE] bg-white dark:bg-gray-800 shadow-sm border border-b-white dark:border-gray-700 dark:border-b-gray-800 -mb-px z-10'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-800/40 border border-transparent',
              ].join(' ')}
            >
              {/* Acento superior en pestaña activa */}
              {isActive && (
                <span className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#2383C2] to-[#369BCE] rounded-t-md" />
              )}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      <div className="flex-grow overflow-hidden flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};

export default ConsignacionLayout;