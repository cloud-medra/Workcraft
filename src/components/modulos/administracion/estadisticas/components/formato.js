// Formato de números de Estadísticas (es-CL).
export const formatoNumero = (n) => Number(n || 0).toLocaleString('es-CL');
export const formatoPorcentaje = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`);
