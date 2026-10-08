import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';
import { formatoNumero } from './formato';

// Piezas compartidas por las tablas de Estadísticas.

export const Encabezado = ({ columna, children, orden, onOrdenar, alinear = 'right', title }) => {
  const activa = orden.columna === columna;
  const Icono = activa && orden.sentido === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th className={`px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 font-semibold whitespace-nowrap text-${alinear}`} aria-sort={activa ? (orden.sentido === 'asc' ? 'ascending' : 'descending') : 'none'} title={title}>
      <button type="button" onClick={() => onOrdenar(columna)} className={`inline-flex items-center gap-0.5 uppercase hover:text-[#2383C2] ${activa ? 'text-[#2383C2]' : ''}`}>
        {children}
        <Icono size={12} className={activa ? '' : 'opacity-30'} />
      </button>
    </th>
  );
};

export const BarraBusqueda = ({ busqueda, onBuscar, placeholder, total }) => (
  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 flex-wrap">
    <div className="relative w-64 max-w-full">
      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input value={busqueda} onChange={(e) => onBuscar(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') onBuscar(''); }}
        placeholder={placeholder} aria-label={placeholder.replace('…', '')}
        className="w-full h-7 pl-8 pr-7 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-[11.5px] text-gray-800 dark:text-gray-100 focus:outline-none focus:border-[#2383C2]" />
      {busqueda && (
        <button type="button" onClick={() => onBuscar('')} title="Limpiar búsqueda" aria-label="Limpiar búsqueda" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2383C2]"><X size={13} /></button>
      )}
    </div>
    <span className="ml-auto text-[11px] text-gray-500 dark:text-gray-400">{formatoNumero(total)} {total === 1 ? 'fila' : 'filas'} · clic en una fila para ver el detalle</span>
  </div>
);
