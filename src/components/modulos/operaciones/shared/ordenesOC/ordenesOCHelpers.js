// PDF de órdenes de compra (OC): lógica pura, sin Firebase. Compartida por
// Gestión de Implantes (pestaña Orden) y Documentos → Ingreso de Órdenes.
//
// Cada OC tiene UN solo PDF, en ordenes_oc/OC_{oc}.pdf, compartido por todas
// las admisiones/empresas que usan esa OC. Qué OC ya tienen PDF se lleva en
// un único documento de Firestore (ordenesOC/registroPdf, ver
// registroPdfOC.js), no consultando Storage archivo por archivo.

// Mismo tope que storage.rules (match /ordenes_oc/{archivo}).
export const TAMANO_MAXIMO_PDF_OC_MB = 15;
export const superaTamanoPdfOC = (file) => (file?.size || 0) > TAMANO_MAXIMO_PDF_OC_MB * 1024 * 1024;

export const esPdf = (file) => Boolean(file)
  && file.type === 'application/pdf'
  && /\.pdf$/i.test(file.name || '');

// Clave canónica de una OC (registro, ruta en Storage y comparación): sin
// espacios, en mayúsculas, sin ceros a la izquierda si es numérica, y sin
// caracteres que rompen una ruta de Storage.
export const claveOC = (oc) => {
  const texto = String(oc ?? '').trim().toUpperCase().replace(/[\s/\\#[\]*?]+/g, '_');
  return /^\d+$/.test(texto) ? texto.replace(/^0+(?=\d)/, '') : texto;
};

export const nombreArchivoOC = (oc) => `OC_${claveOC(oc)}.pdf`;
export const rutaPdfOC = (oc) => `ordenes_oc/${nombreArchivoOC(oc)}`;

// Número de OC desde el nombre del archivo, o '' si no se reconoce.
// Acepta OC_12345, OC-12345, OC 12345, oc_12345, OC12345, "OC_12345 (1).pdf".
export const extraerOCDeNombre = (nombre) => {
  const base = String(nombre ?? '')
    .replace(/\.pdf$/i, '')
    .replace(/\s*\(\d+\)\s*$/, '')
    .trim();
  const m = base.match(/^OC[\s_.-]*(\d+)$/i);
  return m ? claveOC(m[1]) : '';
};

export const nombreCoincideConOC = (nombre, oc) => {
  const extraida = extraerOCDeNombre(nombre);
  return extraida !== '' && extraida === claveOC(oc);
};

// Índice de OC ({ id: { k: 'admisión|fecha|código', e, oc, p } }) -> Map
// claveOC -> { oc, admisiones, empresas, pacientes, fechas } (una entrada por
// OC aunque venga en varias filas, empresas o admisiones).
export const agruparIndicePorOC = (indice) => {
  const porOC = new Map();
  Object.values(indice || {}).forEach(({ k, e, oc, p }) => {
    const clave = claveOC(oc);
    if (!clave) return;
    if (!porOC.has(clave)) porOC.set(clave, { oc: clave, admisiones: new Set(), empresas: new Set(), pacientes: new Set(), fechas: new Set() });
    const g = porOC.get(clave);
    const [admision, fecha] = String(k || '').split('|');
    if (admision) g.admisiones.add(admision);
    if (fecha) g.fechas.add(fecha);
    if (e) g.empresas.add(e);
    if (p) g.pacientes.add(p);
  });
  return porOC;
};

const lista = (set) => [...set].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

// Filas de "OC sin PDF": las OC del índice que no están en el registro.
// `fecha` es la más antigua de la OC ('YYYY-MM-DD'); `fechas` sirve para
// filtrar por año/mes.
export const listarOCSinPdf = (porOC, registro = {}) => {
  const filas = [];
  porOC.forEach((g, clave) => {
    if (registro[clave]) return;
    const fechas = lista(g.fechas);
    filas.push({
      oc: clave,
      admisiones: lista(g.admisiones),
      empresas: lista(g.empresas),
      pacientes: lista(g.pacientes),
      fechas,
      fecha: fechas[0] || ''
    });
  });
  return filas.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.oc.localeCompare(b.oc, 'es', { numeric: true }));
};

export const MOTIVOS_PDF_OC = {
  NO_PDF: 'No es un archivo PDF.',
  TAMANO: `Supera el máximo de ${TAMANO_MAXIMO_PDF_OC_MB} MB.`,
  NOMBRE: 'El nombre no tiene el formato OC_número (ej. OC_12345.pdf).',
  NO_ENCONTRADA: 'La OC no está en el índice de OC (importa el Excel en Importar Detalles OC).',
  DUPLICADO: 'Otro archivo de esta misma tanda ya es para esta OC.'
};

// Subida masiva: clasifica en el navegador, sin Firebase.
//   aSubir:     [{ file, oc }] OC encontradas y sin PDF
//   yaTenian:   [{ file, oc }] OC que ya tienen PDF (se pregunta si reemplazar)
//   rechazados: [{ nombre, tipo, motivo }] tipo ∈ claves de MOTIVOS_PDF_OC
export const clasificarArchivosOC = (files, { porOC, registro = {} }) => {
  const aSubir = [];
  const yaTenian = [];
  const rechazados = [];
  const vistas = new Set();
  const rechazar = (file, tipo) => rechazados.push({ nombre: file.name, tipo, motivo: MOTIVOS_PDF_OC[tipo] });

  Array.from(files || []).forEach((file) => {
    if (!esPdf(file)) return rechazar(file, 'NO_PDF');
    if (superaTamanoPdfOC(file)) return rechazar(file, 'TAMANO');
    const oc = extraerOCDeNombre(file.name);
    if (!oc) return rechazar(file, 'NOMBRE');
    if (!porOC.has(oc)) return rechazar(file, 'NO_ENCONTRADA');
    if (vistas.has(oc)) return rechazar(file, 'DUPLICADO');
    vistas.add(oc);
    (registro[oc] ? yaTenian : aSubir).push({ file, oc });
  });
  return { aSubir, yaTenian, rechazados };
};
