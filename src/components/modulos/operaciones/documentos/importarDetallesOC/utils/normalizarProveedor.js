// Convierte el nombre de un proveedor en un ID de documento Firestore
// válido: sin espacios, sin tildes, sin caracteres especiales — pero el
// nombre ORIGINAL (sin alterar) se guarda aparte (en el documento de
// detalle y en el marcador de la carpeta "empresas") para mostrarlo tal
// cual en pantalla.
export const normalizarProveedorId = (nombre) => {
  const base = (nombre || '').toString()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // quita tildes/diacríticos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return base || 'sin_proveedor';
};
