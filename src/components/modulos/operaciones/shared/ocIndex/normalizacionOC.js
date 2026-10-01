// Normalización compartida para cruzar filas de "Importar Detalles OC"
// (Excel) con los ítems de Gestión de Implantes. Todo lo que se compara pasa
// por acá, del lado del Excel (al armar el índice) y del lado de Implantes
// (al sincronizar), para que ambos lleguen al mismo formato.
import { ALIAS_EMPRESAS_OC } from './aliasEmpresasOC.js';

export const quitarTildes = (texto) =>
  String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Mayúsculas, sin tildes, sin espacios dobles.
export const normalizarTexto = (valor) =>
  quitarTildes(valor).toUpperCase().replace(/\s+/g, ' ').trim();

// Admisión como texto. Si vino como número desde Excel ("102345.0" o
// 102345) se deja sin decimales.
export const normalizarAdmision = (valor) => {
  const texto = normalizarTexto(valor);
  const m = texto.match(/^(\d+)(?:\.0+)?$/);
  return m ? m[1] : texto;
};

// Código como texto: se respetan los ceros a la izquierda y se quitan los
// espacios (internos incluidos: "AB 123" y "AB123" son el mismo código).
export const normalizarCodigo = (valor) => normalizarTexto(valor).replace(/\s+/g, '');

// Cantidad como número (acepta "2", 2, "2,0"). null si no es un número.
export const normalizarCantidad = (valor) => {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? valor : Number(String(valor).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const pad2 = (n) => String(n).padStart(2, '0');
const desdePartes = (y, m, d) => {
  const anio = Number(y); const mes = Number(m); const dia = Number(d);
  if (!anio || mes < 1 || mes > 12 || dia < 1 || dia > 31) return '';
  return `${anio}-${pad2(mes)}-${pad2(dia)}`;
};

// Fecha a 'YYYY-MM-DD' (el formato con que Implantes guarda `fecha`).
// Acepta Date, Timestamp de Firestore, número serial de Excel,
// 'YYYY-MM-DD', 'dd/mm/yyyy' o 'dd-mm-yyyy'. '' si no se pudo interpretar.
export const normalizarFecha = (valor) => {
  if (valor === null || valor === undefined || valor === '') return '';
  if (typeof valor?.toDate === 'function') valor = valor.toDate();
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return '';
    return desdePartes(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
  }
  if (typeof valor === 'number') {
    // Serial de Excel: días desde 1899-12-30 (incluye el bug del 29/02/1900).
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(valor) * 86400000);
    if (isNaN(d.getTime())) return '';
    return desdePartes(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const texto = String(valor).trim();
  let m = texto.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) return desdePartes(m[1], m[2], m[3]);
  m = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return desdePartes(m[3], m[2], m[1]);
  return '';
};

// Palabras que no identifican a la empresa: sufijos legales, "CHILE" y
// genéricos de rubro, más conectores.
const PALABRAS_GENERICAS_EMPRESA = new Set([
  'SPA', 'SA', 'SAC', 'LTDA', 'LIMITADA', 'EIRL', 'CIA', 'COMPANIA', 'SOCIEDAD',
  'CHILE', 'COMERCIAL', 'COMERCIALIZADORA', 'IMPORTADORA', 'DISTRIBUIDORA',
  'INVERSIONES', 'Y', 'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL'
]);

const normalizarEmpresaBase = (nombre) => {
  const texto = normalizarTexto(nombre)
    .replace(/[.,]/g, '')          // "S.A." -> "SA"
    .replace(/[^A-Z0-9&]+/g, ' ')  // resto de signos -> espacio
    .trim();
  const palabras = texto.split(' ').filter(p => p && !PALABRAS_GENERICAS_EMPRESA.has(p));
  // Si el nombre era solo genéricos ("COMERCIAL CHILE SPA") se usa completo.
  return palabras.length ? palabras.join(' ') : texto;
};

const crearMapaAlias = (alias) => {
  const mapa = new Map();
  Object.entries(alias || {}).forEach(([desde, hacia]) => {
    mapa.set(normalizarEmpresaBase(desde), normalizarEmpresaBase(hacia));
  });
  return mapa;
};
const MAPA_ALIAS_POR_DEFECTO = crearMapaAlias(ALIAS_EMPRESAS_OC);

// Nombre canónico de una empresa: sin tildes/puntuación/genéricos y con el
// alias aplicado (si existe).
export const normalizarEmpresa = (nombre, mapaAlias = MAPA_ALIAS_POR_DEFECTO) => {
  const base = normalizarEmpresaBase(nombre);
  return mapaAlias.get(base) || base;
};

// Iguales, o uno contiene al otro como palabras completas ("MEDTRONIC" está
// en "MEDTRONIC MEDICAL", pero "ABB" no está en "ABBOTT").
export const empresasCoinciden = (a, b, mapaAlias = MAPA_ALIAS_POR_DEFECTO) => {
  const na = normalizarEmpresa(a, mapaAlias);
  const nb = normalizarEmpresa(b, mapaAlias);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return ` ${na} `.includes(` ${nb} `) || ` ${nb} `.includes(` ${na} `);
};

const palabrasNombre = (nombre) =>
  normalizarTexto(nombre).replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(p => p.length >= 2);

// true si a y b son iguales o difieren en a lo más una letra (sustitución,
// letra de más o de menos). Solo se usa con palabras de 4+ letras.
const casiIguales = (a, b) => {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0; let j = 0; let diferencias = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++diferencias > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return diferencias + (a.length - i) + (b.length - j) <= 1;
};

const palabrasEquivalentes = (a, b) =>
  a === b || (a.length >= 4 && b.length >= 4 && casiIguales(a, b));

// Cuántas palabras del nombre `a` aparecen en `b` (en cualquier orden,
// tolerando una letra de diferencia). Sirve para la validación informativa
// y para desempatar ambigüedades.
export const palabrasEnComun = (a, b) => {
  const pa = [...new Set(palabrasNombre(a))];
  const pb = [...new Set(palabrasNombre(b))];
  return pa.filter(x => pb.some(y => palabrasEquivalentes(x, y))).length;
};
