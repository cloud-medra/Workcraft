import { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown, Check } from 'lucide-react';

// Mismo patrón de selección múltiple que EstadoFilterDropdown.jsx: arreglo
// vacío = "Todos" (sin restricción), sin necesidad de un valor especial
// para "Todos" — desmarcar todo ya equivale a eso.
export const DiaFilterDropdown = ({
  opcionesDias,
  filtrosDias,
  toggleFiltroDia,
  limpiarFiltroDias
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hayFiltroActivo = filtrosDias.length > 0;
  const label = !hayFiltroActivo
    ? 'Día (Todos)'
    : filtrosDias.length === 1
      ? `Día ${filtrosDias[0]}`
      : `${filtrosDias.length} días`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`h-7 px-2 border rounded text-[11px] flex items-center gap-1.5 transition
          ${hayFiltroActivo
            ? 'border-[#2383C2] text-[#2383C2] bg-blue-50 dark:bg-blue-950/30 font-semibold'
            : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900'}`}
      >
        <CalendarDays size={12} />
        {label}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 max-h-64 overflow-auto">
          <button
            type="button"
            onClick={limpiarFiltroDias}
            className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
          >
            Mostrar todos
            {!hayFiltroActivo && <Check size={13} className="text-[#2383C2]" />}
          </button>

          {opcionesDias.map(dia => {
            const seleccionado = filtrosDias.includes(dia);
            return (
              <button
                type="button"
                key={dia}
                onClick={() => toggleFiltroDia(dia)}
                className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <span>Día {dia}</span>
                {seleccionado && <Check size={13} className="text-[#2383C2]" />}
              </button>
            );
          })}

          {opcionesDias.length === 0 && (
            <div className="px-2.5 py-1.5 text-[11px] text-gray-400">Sin días disponibles</div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiaFilterDropdown;
