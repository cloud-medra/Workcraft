import { useMemo, useState } from 'react';
import { Layers, Search, X } from 'lucide-react';
import { filtrarCatalogoCodigos } from '../../shared/filtrarCatalogoCodigos';

const MAX_RESULTADOS = 60;

// Búsqueda de "Contenido de la Caja" (misma búsqueda que Stock General:
// Referencia, Código, Descriptor o Empresa del maestro), en un panel.
const BuscadorProductoMaestro = ({ catalogo, onSeleccionar, onCerrar, aviso }) => {
  const [texto, setTexto] = useState('');
  const resultados = useMemo(
    () => (texto.trim() ? filtrarCatalogoCodigos(catalogo, texto).slice(0, MAX_RESULTADOS) : []),
    [catalogo, texto]
  );

  return (
    <div className="border border-amber-300 dark:border-amber-800 rounded-lg bg-white dark:bg-gray-900 shadow-sm">
      <div className="px-3 py-2 flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700">
        <span className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] flex items-center gap-1">
          <Layers size={12} className="text-[#2383C2]" />
          Contenido de la Caja (Búsqueda por Referencia, Código, Descriptor o Empresa)
        </span>
        <button type="button" onClick={onCerrar} title="Cerrar búsqueda" className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={14} />
        </button>
      </div>
      {aviso && <div className="px-3 pt-2 text-[11px] text-amber-700 dark:text-amber-300 font-semibold">{aviso}</div>}
      <div className="p-3 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 h-8 px-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 focus-within:border-[#2383C2]">
          <Search size={13} className="text-gray-400" />
          <input
            autoFocus
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por referencia, código, descriptor o empresa..."
            className="flex-1 bg-transparent outline-none text-[11px] text-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="max-h-64 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded">
          {!texto.trim() ? (
            <div className="px-2.5 py-2 text-gray-400 text-[10px] italic">Escribe para buscar en el maestro.</div>
          ) : resultados.length === 0 ? (
            <div className="px-2.5 py-2 text-gray-400 text-[10px] italic">No se encontraron coincidencias</div>
          ) : (
            resultados.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => onSeleccionar(cat)}
                className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800 text-[10px] flex flex-wrap items-center justify-between gap-1"
              >
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-gray-800 dark:text-gray-100">{cat.referencia || 'S/Ref'}</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">[{cat.codigo || 'S/Cod'}]</span>
                  <span className="text-[#2383C2]">{cat.descriptorAuto || 'S/Descriptor'}</span>
                  <span className="text-gray-400 dark:text-gray-500 italic">({cat.empresa || 'S/Empresa'})</span>
                </span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 rounded">
                  ${Number(cat.precioNeto || cat.precio || 0).toLocaleString()}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default BuscadorProductoMaestro;
