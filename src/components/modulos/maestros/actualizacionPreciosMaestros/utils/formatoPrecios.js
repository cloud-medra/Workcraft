// Definición única del Excel de actualización de precios: la usan tanto la
// generación del formato (generarFormatoPrecios.js) como la validación de la
// importación (analizarImportacionPrecios.js), para que las columnas no
// puedan quedar desalineadas entre ambos.

export const COL_CODIGOS = 'maestros_codigos';
export const COL_EMPRESAS = 'maestros_empresas';
export const COL_IMPORTACIONES = 'maestros_codigos_importaciones_precios';
export const ACCION_LOG_IMPORTACION = 'ACTUALIZACION_PRECIO_IMPORTACION';

export const NOMBRE_HOJA = 'Precios';

// `key` identifica la columna en el código; `titulo` es el encabezado del Excel.
export const COLUMNAS = [
  { key: 'empresa', titulo: 'Empresa', ancho: 26 },
  { key: 'id', titulo: 'ID interno', ancho: 24 },
  { key: 'codigo', titulo: 'Código', ancho: 14 },
  { key: 'referencia', titulo: 'Referencia', ancho: 24 },
  { key: 'descripcion', titulo: 'Descripción', ancho: 48 },
  { key: 'precioActual', titulo: 'Precio actual', ancho: 15 },
  { key: 'nuevoPrecio', titulo: 'Nuevo precio', ancho: 15 }
];

export const indiceColumna = (key) => COLUMNAS.findIndex(c => c.key === key);

// Mayúsculas, sin tildes y sin espacios sobrantes (los nombres de empresa y
// los encabezados pueden venir con diferencias de formato).
export const normalizarTexto = (valor) =>
  String(valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();

export const precioActualDe = (codigo) => Number(codigo?.precioNeto || 0);

export const descripcionDe = (codigo) =>
  codigo?.descriptorEmpresa || codigo?.descriptorAuto || codigo?.descripcion || '';
