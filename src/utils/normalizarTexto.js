// Normaliza texto para búsquedas: minúsculas, sin tildes/diacríticos y sin
// espacios en los extremos. "Vinculación" y "VINCULACION" quedan iguales.
export const normalizarTexto = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// true si `texto` contiene `busqueda` ignorando mayúsculas y tildes.
// Una búsqueda vacía siempre coincide.
export const incluyeTexto = (texto, busqueda) => {
  const b = normalizarTexto(busqueda);
  return !b || normalizarTexto(texto).includes(b);
};
