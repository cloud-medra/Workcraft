// Interpreta el valor de la columna "Nuevo precio" del Excel importado.
//
// - Celda numérica de Excel → se toma tal cual.
// - Texto: acepta "$", espacios, coma o punto decimal y separador de miles.
//   · Con punto y coma a la vez, el último separador es el decimal
//     ("1.350,50" → 1350.5 · "1,350.50" → 1350.5).
//   · Solo comas: una sola es decimal ("1350,5"); varias, miles ("1,350,000").
//   · Solo puntos: varios son miles ("1.350.000"); uno solo seguido de
//     exactamente 3 dígitos también es miles ("1.350" → 1350, los precios
//     del maestro son pesos enteros); si no, decimal ("1350.5").
//
// Devuelve { vacio: true } | { ok: true, valor } | { ok: false, motivo }.

const MOTIVO_NO_NUMERICO = 'El nuevo precio no es un número válido';
const MOTIVO_NO_POSITIVO = 'El nuevo precio debe ser mayor que 0';

const GRUPOS_MILES = (sep) => new RegExp(`^\\d{1,3}(\\${sep}\\d{3})+$`);

const redondear = (n) => Math.round(n * 100) / 100;

const validarPositivo = (n) => {
  if (!Number.isFinite(n)) return { ok: false, motivo: MOTIVO_NO_NUMERICO };
  if (n <= 0) return { ok: false, motivo: MOTIVO_NO_POSITIVO };
  return { ok: true, valor: redondear(n) };
};

const normalizarTextoNumerico = (texto) => {
  const puntos = (texto.match(/\./g) || []).length;
  const comas = (texto.match(/,/g) || []).length;

  if (puntos > 0 && comas > 0) {
    const decimal = texto.lastIndexOf('.') > texto.lastIndexOf(',') ? '.' : ',';
    const miles = decimal === '.' ? ',' : '.';
    const [entera, fraccion, ...resto] = texto.split(decimal);
    if (resto.length > 0 || fraccion.includes(miles)) return null;
    if (!GRUPOS_MILES(miles).test(entera)) return null;
    return `${entera.split(miles).join('')}.${fraccion}`;
  }

  if (comas > 0) {
    if (comas === 1) return texto.replace(',', '.');
    return GRUPOS_MILES(',').test(texto) ? texto.split(',').join('') : null;
  }

  if (puntos > 1) {
    return GRUPOS_MILES('.').test(texto) ? texto.split('.').join('') : null;
  }
  if (puntos === 1 && GRUPOS_MILES('.').test(texto)) {
    return texto.replace('.', '');
  }
  return texto;
};

export const parsearPrecio = (valor) => {
  if (valor === null || valor === undefined) return { vacio: true };
  if (typeof valor === 'number') return validarPositivo(valor);

  const texto = String(valor).replace(/\$/g, '').replace(/\s/g, '');
  if (texto === '') return { vacio: true };
  if (texto.startsWith('-')) return { ok: false, motivo: MOTIVO_NO_POSITIVO };
  if (!/^\d[\d.,]*$/.test(texto) || /[.,]$/.test(texto)) return { ok: false, motivo: MOTIVO_NO_NUMERICO };

  const normalizado = normalizarTextoNumerico(texto);
  if (normalizado === null) return { ok: false, motivo: MOTIVO_NO_NUMERICO };
  return validarPositivo(Number(normalizado));
};
