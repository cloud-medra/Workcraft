// Campos numéricos de los documentos de Laboratorio / Vacunatorio
// (*_documentos y, por copia, *_imputadas).
//
// La importación XML y el editor guardaban `total` y los montos de
// `detalles` como texto ("14582947"). Las pantallas lo toleran porque hacen
// Number(...), pero count()/sum() de Firestore ignoran los strings, así que
// ControlMensual no podía usar agregaciones. Toda escritura de estos
// documentos debe pasar por normalizarNumerosDocumento().

// Solo dígitos, con signo y decimales con punto opcionales: el formato del
// XML del SII (MntNeto, PrcItem, QtyItem, MontoItem) y de <input type="number">.
const NUMERO_SIMPLE = /^-?\d+(\.\d+)?$/;
// "1.234" podría ser 1,234 o mil doscientos treinta y cuatro con separador
// de miles: se considera ambiguo y no se convierte.
const MILES_AMBIGUO = /^-?\d{1,3}\.\d{3}$/;

/**
 * Convierte a número solo cuando no hay ambigüedad. Devuelve
 * { valor, seguro }: `seguro` es false para vacíos o formatos con separador
 * de miles/coma decimal ("1.234.567", "1.234", "1,5"), que se dejan como están.
 */
export const convertirNumeroSeguro = (valor) => {
  if (typeof valor === 'number') return { valor, seguro: Number.isFinite(valor) };
  if (typeof valor !== 'string') return { valor, seguro: false };
  const texto = valor.trim();
  if (!NUMERO_SIMPLE.test(texto) || MILES_AMBIGUO.test(texto)) return { valor, seguro: false };
  return { valor: Number(texto), seguro: true };
};

/** Número desde el texto de un nodo XML; vacío o inválido → 0. */
export const numeroDesdeXml = (texto) => {
  const n = parseFloat(texto ?? '0');
  return Number.isFinite(n) ? n : 0;
};

const CAMPOS_DETALLE = ['cantidad', 'precio', 'monto'];

const aNumeroSiSeguro = (valor) => {
  const { valor: convertido, seguro } = convertirNumeroSeguro(valor);
  return seguro ? convertido : valor;
};

/**
 * Copia del documento con `total` y los montos de `detalles` como número
 * cuando la conversión es segura (el resto de los campos no se toca).
 */
export const normalizarNumerosDocumento = (documento) => {
  const resultado = { ...documento };
  if ('total' in resultado) resultado.total = aNumeroSiSeguro(resultado.total);
  if (Array.isArray(resultado.detalles)) {
    resultado.detalles = resultado.detalles.map((d) => {
      if (!d || typeof d !== 'object') return d;
      const copia = { ...d };
      CAMPOS_DETALLE.forEach((campo) => {
        if (campo in copia) copia[campo] = aNumeroSiSeguro(copia[campo]);
      });
      return copia;
    });
  }
  return resultado;
};
