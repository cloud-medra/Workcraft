import { useState } from 'react';
import { CATEGORIAS, ETIQUETAS_CATEGORIA, fechaCorta } from '../utils/inventarioFisico';

const ESTILO_CATEGORIA = {
  cuadrado: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  faltante: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  sobrante: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  noEncontrado: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
};
const ORDEN = [CATEGORIAS.CUADRADO, CATEGORIAS.FALTANTE, CATEGORIAS.SOBRANTE, CATEGORIAS.NO_ENCONTRADO];

export const BadgeCategoria = ({ categoria }) => (
  <span className={`inline-flex px-1.5 py-0.5 rounded-full border text-[9.5px] font-semibold uppercase ${ESTILO_CATEGORIA[categoria] || ''}`}>
    {ETIQUETAS_CATEGORIA[categoria] || categoria}
  </span>
);

// Totales por categoría (cantidad de líneas y unidades).
export const TotalesCategorias = ({ totales }) => (
  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
    {ORDEN.map((c) => (
      <span key={c} className={`px-2 py-0.5 rounded border font-semibold ${ESTILO_CATEGORIA[c]}`}>
        {ETIQUETAS_CATEGORIA[c]}: {totales?.[c] ?? 0}
      </span>
    ))}
    <span className="text-gray-500 dark:text-gray-400">
      Esperado {totales?.unidadesEsperadas ?? 0} · Contado {totales?.unidadesContadas ?? 0} · Faltan {totales?.unidadesFaltantes ?? 0} · Sobran {totales?.unidadesSobrantes ?? 0}
    </span>
  </div>
);

const TH = 'px-2 py-1.5 border-b border-slate-200 dark:border-gray-700 font-semibold';
const TD = 'px-2 py-1 border-b border-slate-100 dark:border-gray-700/60';

// Tabla esperado vs contado de una caja (resultado de compararConteo).
const ResumenComparacion = ({ resultado, soloDiferenciasInicial = false }) => {
  const [soloDiferencias, setSoloDiferencias] = useState(soloDiferenciasInicial);
  const filas = (resultado?.filas || []).filter((f) => !soloDiferencias || f.categoria !== CATEGORIAS.CUADRADO);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TotalesCategorias totales={resultado?.totales} />
        <label className="flex items-center gap-1 text-[10.5px] text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={soloDiferencias} onChange={(e) => setSoloDiferencias(e.target.checked)} /> Solo diferencias
        </label>
      </div>
      <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-slate-50 dark:bg-gray-900/60 text-slate-600 dark:text-gray-400 uppercase text-[10px]">
            <tr>
              <th className={TH}>Producto</th>
              <th className={TH}>Lote</th>
              <th className={TH}>Vencimiento</th>
              <th className={`${TH} text-right`}>Esperado</th>
              <th className={`${TH} text-right`}>Contado</th>
              <th className={`${TH} text-right`}>Diferencia</th>
              <th className={TH}>Resultado</th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 ? (
              <tr><td colSpan={7} className="px-3 py-3 text-center text-gray-400 italic">{soloDiferencias ? 'Sin diferencias.' : 'Sin productos.'}</td></tr>
            ) : filas.map((f) => (
              <tr key={f.clave} className="text-gray-700 dark:text-gray-200">
                <td className={TD}>{f.tipo || f.referencia} <span className="text-emerald-600 dark:text-emerald-400">[{f.codigo || 'S/Cod'}]</span></td>
                <td className={`${TD} font-semibold`}>{f.lote || 'S/L'}{f.loteNuevo && <span className="ml-1 text-[9px] text-blue-600 dark:text-blue-400 font-bold">NUEVO</span>}</td>
                <td className={TD}>{fechaCorta(f.vencimiento)}</td>
                <td className={`${TD} text-right`}>{f.esperado}</td>
                <td className={`${TD} text-right`}>{f.contado}</td>
                <td className={`${TD} text-right font-bold ${f.diferencia < 0 ? 'text-red-600 dark:text-red-400' : f.diferencia > 0 ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                  {f.diferencia > 0 ? `+${f.diferencia}` : f.diferencia}
                </td>
                <td className={TD}><BadgeCategoria categoria={f.categoria} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResumenComparacion;
