import { useMemo, useState } from 'react';
import { Search, Factory, RefreshCw } from 'lucide-react';
import Spinner from '../../../../ui/Spinner';
import { normalizarTexto } from '../utils/formatoPrecios';

const MAX_SUGERENCIAS = 30;

// Buscador de empresa por nombre o RUT. Con una empresa elegida muestra su
// ficha y el botón "Cambiar" (deshabilitado mientras hay una operación en curso).
const SelectorEmpresa = ({ empresas, cargando, empresa, onSeleccionar, bloqueado }) => {
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);

  const sugerencias = useMemo(() => {
    const term = normalizarTexto(busqueda);
    const rutTerm = term.replace(/[^0-9K]/g, '');
    const lista = !term ? empresas : empresas.filter(e =>
      normalizarTexto(e.nombre).includes(term) ||
      (rutTerm && normalizarTexto(e.rut).replace(/[^0-9K]/g, '').includes(rutTerm))
    );
    return lista.slice(0, MAX_SUGERENCIAS);
  }, [empresas, busqueda]);

  if (empresa) {
    return (
      <div className="flex items-center justify-between gap-2 p-2 rounded border border-[#2383C2]/30 bg-blue-50/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 shrink-0 rounded bg-[#2383C2]/10 text-[#2383C2] flex items-center justify-center">
            <Factory size={14} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-[10.5px] text-slate-900 dark:text-gray-100 truncate">{empresa.nombre}</div>
            <div className="text-[9px] text-slate-500 dark:text-gray-400 font-mono">RUT: {empresa.rut || 'S/R'}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { onSeleccionar(null); setBusqueda(''); }}
          disabled={bloqueado}
          className="flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw size={11} />
          <span>Cambiar</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Search size={11} className="absolute left-2 top-2 text-slate-400" />
      <input
        type="text"
        value={busqueda}
        onChange={(e) => { setBusqueda(e.target.value); setAbierto(true); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 150)}
        placeholder="Buscar empresa por nombre o RUT..."
        autoComplete="off"
        className="w-full h-6 pl-7 pr-6 bg-slate-50 dark:bg-gray-900 border border-slate-300 dark:border-gray-600 rounded text-[9.5px] text-slate-800 dark:text-gray-100 outline-none focus:border-[#2383C2]"
      />
      {cargando && (
        <span className="absolute right-1.5 top-1">
          <Spinner size="xs" color="#2383C2" />
        </span>
      )}

      {abierto && !cargando && (
        <div className="absolute z-20 top-full left-0 right-0 mt-0.5 max-h-56 overflow-auto bg-white dark:bg-gray-800 border border-slate-300 dark:border-gray-600 rounded shadow-lg">
          {sugerencias.length === 0 ? (
            <div className="px-2 py-1.5 text-[9px] text-slate-400">
              {busqueda.trim() ? `No se encontraron empresas para «${busqueda.trim()}»` : 'No hay empresas registradas'}
            </div>
          ) : (
            sugerencias.map(e => (
              <div
                key={e.id}
                onMouseDown={() => { onSeleccionar(e); setAbierto(false); }}
                className="px-2 py-1 border-b border-slate-100 dark:border-gray-700 last:border-0 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer flex items-center justify-between gap-2"
              >
                <span className="text-[9.5px] font-semibold text-slate-800 dark:text-gray-200 truncate">{e.nombre}</span>
                <span className="shrink-0 text-[8.5px] text-slate-400 font-mono">
                  {e.rut || 'S/R'}{e.estado === 'INACTIVO' ? ' · INACTIVA' : ''}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default SelectorEmpresa;
