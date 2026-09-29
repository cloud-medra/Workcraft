import React, { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useCatalogo } from '../../../../../../hooks/useCatalogo';
import { useDropdownFlotante } from '../../../../../../hooks/useDropdownFlotante';
import { ordenarPor } from '../../../../../../stores/catalogosStore';
import { ChevronDown, Check, Search } from 'lucide-react';

// "maestros_empresas" viene del catalogosStore: se lee una sola vez por
// sesión y la comparten todas las pantallas. Se excluyen los inactivos y
// los que no tienen nombre (el orderBy('nombre') original los omitía).
const filtrarEmpresasActivas = (datos) => datos
  .filter(emp => emp.nombre && emp.estado !== 'INACTIVO')
  .sort(ordenarPor('nombre'));

const EmpresaSelect = ({ value, onChange, placeholder = "Seleccionar empresa...", disabled = false }) => {
  const { datos: empresasCatalogo } = useCatalogo('empresas');
  const empresas = useMemo(() => filtrarEmpresasActivas(empresasCatalogo), [empresasCatalogo]);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const cerrar = useCallback(() => setAbierto(false), []);
  // El panel va en un portal a document.body: el formulario vive dentro de
  // un contenedor con overflow-hidden (animación de colapso) que lo recortaba.
  const { anclaRef, panelRef, estilo } = useDropdownFlotante({ abierto, cerrar, anchoIgual: true });

  const empresasFiltradas = empresas.filter(emp =>
    emp.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (emp.rut && emp.rut.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const empresaSeleccionada = empresas.find(emp => emp.id === value || emp.nombre === value);

  const handleSelect = (empresa) => {
    onChange(empresa);
    setBusqueda('');
    setAbierto(false);
  };

  return (
    <div className="relative w-full" ref={anclaRef}>
      <div
        onClick={disabled ? undefined : () => setAbierto(!abierto)}
        className={`w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 flex items-center justify-between focus-within:border-[#2383C2] ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`truncate ${!empresaSeleccionada ? 'text-gray-400' : ''}`}>
          {empresaSeleccionada ? `${empresaSeleccionada.nombre} (${empresaSeleccionada.rut})` : placeholder}
        </span>
        <ChevronDown size={13} className="text-gray-400 shrink-0 ml-1" />
      </div>

      {abierto && createPortal(
        <div
          ref={panelRef}
          style={estilo}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-[1000] flex flex-col overflow-hidden"
        >
          <div className="shrink-0 p-1.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900">
            <Search size={12} className="text-gray-400 shrink-0" />
            <input
              type="text"
              autoFocus
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre o RUT..."
              className="w-full text-[11px] bg-transparent outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400"
            />
          </div>

          <ul className="flex-1 min-h-0 overflow-y-auto text-[11px]">
            {empresasFiltradas.length > 0 ? (
              empresasFiltradas.map((emp) => {
                const isSelected = value === emp.id || value === emp.nombre;
                return (
                  <li
                    key={emp.id}
                    onClick={() => handleSelect(emp)}
                    className={`px-2 py-1.5 flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/60 ${
                      isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-[#2383C2] font-semibold' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <div className="flex flex-col truncate">
                      <span className="truncate">{emp.nombre}</span>
                      <span className="text-[9px] text-gray-400">{emp.rut}</span>
                    </div>
                    {isSelected && <Check size={12} className="text-[#2383C2] shrink-0 ml-1" />}
                  </li>
                );
              })
            ) : (
              <li className="px-2 py-2 text-center text-gray-400 text-[10px]">
                No se encontraron coincidencias
              </li>
            )}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmpresaSelect;