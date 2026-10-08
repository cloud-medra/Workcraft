import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileSpreadsheet } from 'lucide-react';
import { useColumnasPermitidas } from '../../../../../hooks/useColumnasPermitidas';
import Variacion from './Variacion';
import { formatoNumero } from './formato';

const PATH_VISTA = '/administracion/estadisticas'; // = RUTA_VISTA_ESTADISTICAS

// Columnas de las tablas de cruce del detalle (sección 'detalle').
const COLUMNAS_DETALLE = [
  { key: 'nombre', label: 'Nombre', fija: true },
  { key: 'actual', label: 'Período' },
  { key: 'anterior', label: 'Período anterior' },
  { key: 'variacion', label: 'Variación %' }
];

const TablaCruce = ({ titulo, filas, etiquetaActual, etiquetaAnterior, ver }) => {
  const maximo = Math.max(1, ...filas.map((f) => f.actual));
  return (
    <section>
      <h4 className="text-[11.5px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">{titulo} <span className="font-normal normal-case">({filas.filter((f) => f.actual > 0).length})</span></h4>
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-[12px] border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-900 text-[10.5px] uppercase text-gray-500 dark:text-gray-400">
            <tr>
              <th className="px-3 py-1.5 text-left font-semibold">Nombre</th>
              {ver('actual') && <th className="px-3 py-1.5 text-right font-semibold whitespace-nowrap">{etiquetaActual}</th>}
              {ver('anterior') && <th className="px-3 py-1.5 text-right font-semibold whitespace-nowrap">{etiquetaAnterior}</th>}
              {ver('variacion') && <th className="px-3 py-1.5 text-right font-semibold">Variación</th>}
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-gray-400">Sin datos.</td></tr>}
            {filas.map((f) => (
              <tr key={f.clave} className="border-t border-gray-100 dark:border-gray-700/60">
                <td className="px-3 py-1.5 text-gray-800 dark:text-gray-100">
                  <div className="truncate max-w-[300px]" title={f.nombre}>{f.nombre}</div>
                  <div className="h-1 mt-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden"><div className="h-full bg-[#2383C2] rounded-full" style={{ width: `${(f.actual / maximo) * 100}%` }} /></div>
                </td>
                {ver('actual') && <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100">{formatoNumero(f.actual)}</td>}
                {ver('anterior') && <td className="px-3 py-1.5 text-right tabular-nums text-gray-500 dark:text-gray-400">{formatoNumero(f.anterior)}</td>}
                {ver('variacion') && <td className="px-3 py-1.5 text-right"><Variacion diferencia={f.diferencia} variacion={f.variacion} compacto /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

// Detalle de un médico, cirugía o empresa: sus cruces con las otras dos
// dimensiones. Sale de los datos ya cargados (sin lecturas).
const PanelDetalle = ({ singular, fila, cruces, etiquetaActual, etiquetaAnterior, puedeExportar, onExportar, onCerrar }) => {
  const { ver } = useColumnasPermitidas(PATH_VISTA, 'detalle', COLUMNAS_DETALLE);
  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [onCerrar]);

  return createPortal(
    <div className="fixed inset-0 z-[90] flex justify-end" role="dialog" aria-modal="true" aria-labelledby="titulo-detalle-estadistica">
      <button type="button" className="absolute inset-0 bg-black/30 cursor-default" aria-label="Cerrar detalle" onClick={onCerrar} />
      <aside className="relative w-full max-w-xl h-full bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
        <header className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#2383C2]">{singular}</p>
            <h3 id="titulo-detalle-estadistica" className="text-[15px] font-bold text-gray-800 dark:text-gray-100 break-words">{fila.nombre}</h3>
            <p className="mt-1 text-[12px] text-gray-600 dark:text-gray-300">
              <b className="tabular-nums">{formatoNumero(fila.actual)}</b> admisiones en {etiquetaActual}
              <span className="text-gray-400"> · {formatoNumero(fila.anterior)} en {etiquetaAnterior} · </span>
              <Variacion diferencia={fila.diferencia} variacion={fila.variacion} compacto />
            </p>
          </div>
          {puedeExportar && (
            <button type="button" onClick={onExportar} className="h-8 px-3 rounded-md border border-gray-300 dark:border-gray-600 text-[12px] font-semibold text-gray-700 dark:text-gray-200 hover:border-[#2383C2] hover:text-[#2383C2] inline-flex items-center gap-1.5 shrink-0">
              <FileSpreadsheet size={14} /> Exportar
            </button>
          )}
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="p-1 text-gray-400 hover:text-gray-600 shrink-0"><X size={18} /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {cruces.map((c) => (
            <TablaCruce key={c.titulo} titulo={c.titulo} filas={c.filas} etiquetaActual={etiquetaActual} etiquetaAnterior={etiquetaAnterior} ver={ver} />
          ))}
        </div>
      </aside>
    </div>,
    document.body
  );
};

export default PanelDetalle;
