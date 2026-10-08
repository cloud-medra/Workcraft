import Variacion from './Variacion';
import { formatoNumero } from './formato';
import { variacion } from '../agregados';

// Indicador principal con la comparación contra el período anterior.
const TarjetaIndicador = ({ titulo, icono: Icono, actual, anterior, etiquetaAnterior, pie }) => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col gap-2 min-w-0">
    <div className="flex items-center gap-2 text-[11.5px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
      <span className="w-7 h-7 rounded-md bg-[#2383C2]/10 text-[#2383C2] flex items-center justify-center shrink-0"><Icono size={15} /></span>
      <span className="truncate">{titulo}</span>
    </div>
    <div className="flex items-end justify-between gap-2 flex-wrap">
      <span className="text-[28px] leading-none font-bold text-gray-800 dark:text-gray-100 tabular-nums">{formatoNumero(actual)}</span>
      <Variacion diferencia={actual - anterior} variacion={variacion(actual, anterior)} compacto />
    </div>
    <div className="text-[11.5px] text-gray-500 dark:text-gray-400 flex justify-between gap-2 flex-wrap">
      <span>{etiquetaAnterior}: <b className="text-gray-700 dark:text-gray-300 tabular-nums">{formatoNumero(anterior)}</b></span>
      {pie}
    </div>
  </div>
);

export default TarjetaIndicador;
