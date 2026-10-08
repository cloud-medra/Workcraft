import { formatoNumero } from './formato';

// Top 10 por admisiones del período elegido. La barra gris clara de fondo es
// el período anterior, para comparar de un vistazo.
const BarrasTop = ({ filas, titulo, etiquetaActual, etiquetaAnterior, onSeleccionar }) => {
  const top = [...filas].sort((a, b) => b.actual - a.actual || a.nombre.localeCompare(b.nombre, 'es')).filter((f) => f.actual > 0).slice(0, 10);
  const maximo = Math.max(1, ...top.map((f) => Math.max(f.actual, f.anterior)));
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h3 className="text-[12.5px] font-semibold text-gray-800 dark:text-gray-100">{titulo}</h3>
        <div className="flex items-center gap-3 text-[10.5px] text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-[#2383C2] inline-block" />{etiquetaActual}</span>
          <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-[#2383C2]/20 inline-block" />{etiquetaAnterior}</span>
        </div>
      </div>
      {top.length === 0 ? (
        <p className="text-[12px] text-gray-400 py-6 text-center">Sin datos en este período.</p>
      ) : (
        <ol className="space-y-2">
          {top.map((f, i) => (
            <li key={f.clave}>
              <button type="button" onClick={() => onSeleccionar?.(f)} className="w-full text-left group" title={`${f.nombre}: ${f.actual} (${etiquetaAnterior}: ${f.anterior})`}>
                <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                  <span className="truncate text-gray-700 dark:text-gray-200 group-hover:text-[#2383C2]"><span className="text-gray-400 tabular-nums mr-1.5">{i + 1}.</span>{f.nombre}</span>
                  <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-100">{formatoNumero(f.actual)}</span>
                </div>
                <div className="relative h-2 mt-1 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-[#2383C2]/20" style={{ width: `${(f.anterior / maximo) * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full bg-[#2383C2] transition-all" style={{ width: `${(f.actual / maximo) * 100}%`, height: '100%' }} />
                </div>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default BarrasTop;
