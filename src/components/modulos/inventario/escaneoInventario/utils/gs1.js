// Parseo de códigos GS1 (GS1-128 / GS1 DataMatrix) leídos por una pistola en
// modo teclado. Se reconocen los identificadores de aplicación (AI) que usa
// Inventario: (01) GTIN, (10) lote y (17) vencimiento. El resto se salta
// cuando su largo es conocido.
//
// Formatos aceptados:
//   - Con paréntesis: "(01)07612345678904(17)261231(10)ABC123"
//   - Crudo: "0107612345678904172612311 0ABC123" con el separador FNC1
//     transmitido como GS (\u001d), con o sin prefijo de simbología
//     (]C1, ]d2, ]Q3, ]e0).
// Sin separador GS, un AI de largo variable (como el lote) se lee hasta el
// final: por eso lote y vencimiento quedan editables en pantalla.

const GS = '\u001d';

// AI -> largo fijo del dato (sin contar el AI). Los que no están aquí se
// consideran de largo variable (hasta GS o fin).
const LARGO_FIJO = {
  '00': 18, '01': 14, '02': 14,
  '11': 6, '12': 6, '13': 6, '15': 6, '16': 6, '17': 6,
  '20': 2
};
// AI de largo variable conocidos (2 dígitos) y de 4 dígitos (31xx-36xx,
// largo fijo 6).
const VARIABLES_2 = new Set(['10', '21', '22', '30', '37', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99']);
const esAI4Medida = (ai4) => /^3[1-6]\d\d$/.test(ai4);

const PREFIJO_SIMBOLOGIA = /^\][A-Za-z]\d/;

// Dígito verificador GS1 (GTIN-8/12/13/14).
export const gtinValido = (gtin) => {
  if (!/^\d{8}$|^\d{12,14}$/.test(gtin)) return false;
  const digitos = gtin.split('').map(Number);
  const verificador = digitos.pop();
  const suma = digitos.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (suma % 10)) % 10 === verificador;
};

// 'YYMMDD' (AI 17) -> 'YYYY-MM-DD'. Día 00 = último día del mes.
export const fechaGS1aISO = (yymmdd) => {
  if (!/^\d{6}$/.test(yymmdd || '')) return '';
  const anio = 2000 + Number(yymmdd.slice(0, 2));
  const mes = Number(yymmdd.slice(2, 4));
  let dia = Number(yymmdd.slice(4, 6));
  if (mes < 1 || mes > 12) return '';
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  if (dia === 0) dia = ultimoDia;
  if (dia > ultimoDia) return '';
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

const parsearConParentesis = (texto) => {
  const ais = {};
  const re = /\((\d{2,4})\)([^(]*)/g;
  let m;
  let consumido = '';
  while ((m = re.exec(texto)) !== null) {
    ais[m[1]] = m[2].replace(new RegExp(GS, 'g'), '').trim();
    consumido += m[0];
  }
  return consumido.length === texto.length && Object.keys(ais).length > 0 ? ais : null;
};

const parsearCrudo = (texto) => {
  const ais = {};
  let i = 0;
  while (i < texto.length) {
    if (texto[i] === GS) { i += 1; continue; }
    const ai2 = texto.slice(i, i + 2);
    const ai4 = texto.slice(i, i + 4);
    let ai;
    let largo = null;
    if (LARGO_FIJO[ai2] !== undefined) { ai = ai2; largo = LARGO_FIJO[ai2]; }
    else if (esAI4Medida(ai4)) { ai = ai4; largo = 6; }
    else if (VARIABLES_2.has(ai2)) { ai = ai2; }
    else return null; // AI desconocido: no se puede seguir con seguridad
    const inicio = i + ai.length;
    let fin;
    if (largo !== null) {
      fin = inicio + largo;
      if (fin > texto.length) return null;
    } else {
      const sep = texto.indexOf(GS, inicio);
      fin = sep === -1 ? texto.length : sep;
    }
    ais[ai] = texto.slice(inicio, fin);
    i = fin;
  }
  return Object.keys(ais).length > 0 ? ais : null;
};

// Texto leído -> { esGS1, gtin, lote, vencimiento, ais } . Si no es GS1,
// esGS1 = false y el resto vacío. Solo se considera GS1 si trae un (01)
// con dígito verificador válido (evita confundir un EAN-13 o un código
// interno numérico con GS1).
export const parsearGS1 = (valor) => {
  const vacio = { esGS1: false, gtin: '', lote: '', vencimiento: '', ais: {} };
  let texto = String(valor ?? '').trim();
  if (!texto) return vacio;
  texto = texto.replace(PREFIJO_SIMBOLOGIA, '');

  const ais = texto.startsWith('(') ? parsearConParentesis(texto) : parsearCrudo(texto);
  if (!ais || !ais['01'] || !gtinValido(ais['01'])) return vacio;

  return {
    esGS1: true,
    gtin: ais['01'],
    lote: (ais['10'] || '').trim(),
    vencimiento: fechaGS1aISO(ais['17']),
    ais
  };
};
