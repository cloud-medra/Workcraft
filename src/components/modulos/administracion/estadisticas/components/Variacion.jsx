import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

import { formatoNumero, formatoPorcentaje } from './formato';

// Diferencia y variación % con flecha y color: subida en verde, bajada en
// rojo, sin cambio en gris. Sin período anterior (0) la variación es "Nuevo".
const Variacion = ({ diferencia, variacion, compacto = false }) => {
  const sube = diferencia > 0;
  const baja = diferencia < 0;
  const color = sube ? 'text-emerald-700 dark:text-emerald-400' : baja ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400';
  const Icono = sube ? ArrowUpRight : baja ? ArrowDownRight : Minus;
  const texto = variacion == null ? (diferencia > 0 ? 'Nuevo' : '—') : formatoPorcentaje(variacion);
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${color}`}>
      <Icono size={compacto ? 12 : 14} aria-hidden="true" />
      {texto}
      {!compacto && <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">({diferencia > 0 ? '+' : ''}{formatoNumero(diferencia)})</span>}
    </span>
  );
};

export default Variacion;
