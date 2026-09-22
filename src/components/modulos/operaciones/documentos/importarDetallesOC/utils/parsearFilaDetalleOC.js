// Normaliza una fila cruda del Excel "Detalles OC" (headers tal cual vienen
// de la planilla) a un objeto canónico con nombres de campo en minúscula y
// tipos estables (Date para fechas, Number para cantidad/precio, string
// recortado para el resto) — tanto para escribir en Firestore como para
// calcular el hash de comparación de forma determinística.

const CAMPOS_TEXTO = [
  ['ID', 'id'],
  ['ADMISION', 'admision'],
  ['PACIENTE', 'paciente'],
  ['MEDICO', 'medico'],
  ['PROVEEDOR', 'proveedor'],
  ['CODIGO', 'codigo'],
  ['DESCRIPCION', 'descripcion'],
  ['ATRIBUTO', 'atributo'],
  ['OC', 'oc'],
  ['ESTADO', 'estado'],
  ['NUMERO_GUIA', 'numero_guia'],
  ['NUMERO_FACTURA', 'numero_factura'],
  ['LOTE', 'lote']
];

const CAMPOS_NUMERICOS = [
  ['CANT', 'cantidad'],
  ['PRECIO_U', 'precio_u'],
  ['OC_MONTO', 'oc_monto']
];

const CAMPOS_FECHA = [
  ['FECHA_CX', 'fecha_cx'],
  ['FECHA_RECEPCION', 'fecha_recepcion'],
  ['FECHA_CARGO', 'fecha_cargo'],
  ['FECHA_EMISION', 'fecha_emision'],
  ['FECHA_INGRESO', 'fecha_ingreso'],
  ['FECHA_VENCIMIENTO', 'fecha_vencimiento']
];

// Acepta: objetos Date (cuando XLSX.read se llama con cellDates:true),
// números seriales de Excel, "dd/mm/yyyy", "dd-mm-yyyy" o "yyyy-mm-dd".
// Devuelve un Date "puro" (sin hora) o null si no se pudo interpretar.
export const parsearFechaExcel = (valor, XLSX) => {
  if (!valor && valor !== 0) return null;
  if (valor instanceof Date) {
    if (isNaN(valor.getTime())) return null;
    return new Date(valor.getFullYear(), valor.getMonth(), valor.getDate());
  }
  if (typeof valor === 'number') {
    const d = XLSX.SSF.parse_date_code(valor);
    if (!d) return null;
    return new Date(d.y, d.m - 1, d.d);
  }
  const str = String(valor).trim();
  if (!str) return null;

  let m = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));

  m = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
};

// `fila` es un objeto tal cual lo entrega XLSX.utils.sheet_to_json (headers
// originales de la planilla). Devuelve null si la fila no trae ID (se
// descarta como basura/fila vacía).
export const normalizarFilaDetalleOC = (filaCruda, XLSX) => {
  const id = String(filaCruda['ID'] ?? '').trim();
  if (!id) return null;

  const resultado = {};

  CAMPOS_TEXTO.forEach(([origen, destino]) => {
    resultado[destino] = String(filaCruda[origen] ?? '').trim();
  });

  CAMPOS_NUMERICOS.forEach(([origen, destino]) => {
    const valor = filaCruda[origen];
    resultado[destino] = valor === '' || valor === undefined || valor === null
      ? 0
      : Number(valor) || 0;
  });

  CAMPOS_FECHA.forEach(([origen, destino]) => {
    resultado[destino] = parsearFechaExcel(filaCruda[origen], XLSX);
  });

  resultado.id = id;
  return resultado;
};
