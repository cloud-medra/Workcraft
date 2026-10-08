// Formato de números de Estadísticas (es-CL).
export const formatoNumero = (n) => Number(n || 0).toLocaleString('es-CL');
export const formatoPorcentaje = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${v.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`);
// Pesos chilenos, sin decimales: $1.234.567.
export const formatoMonto = (n) => `${n < 0 ? '-' : ''}$${Math.round(Math.abs(Number(n) || 0)).toLocaleString('es-CL')}`;

// Color de una diferencia: subida verde, bajada roja.
export const colorDiferencia = (d) => (d > 0 ? 'text-emerald-700 dark:text-emerald-400' : d < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500');
