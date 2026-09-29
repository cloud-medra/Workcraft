// Monto en pesos chilenos para MOSTRAR: redondeado al peso más cercano
// (Math.round, no trunca) y con punto como separador de miles, sin decimales.
// Ej: 123456.78 → "123.457". No cambia el valor guardado.
export const formatearPesos = (valor) => {
  const redondeado = Math.round(Number(valor) || 0);
  // Evita "-0" cuando un monto negativo menor a medio peso se redondea a cero.
  return (redondeado === 0 ? 0 : redondeado).toLocaleString('es-CL');
};
