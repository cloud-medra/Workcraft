// Edición de líneas de "Contenido del PAD" registradas en el formulario de
// cotización (ver ContenidoPadRegistrado.jsx).

export const SIN_LOTE = 'Sin lote';
export const SIN_FECHA = 'Sin fecha';
const FECHA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

// Fila registrada → borrador del editor (los "Sin lote/fecha" como vacío).
export const aBorrador = (fila) => ({
  ...fila,
  cantidad: String(fila.cantidad ?? ''),
  lote: fila.lote === SIN_LOTE ? '' : (fila.lote || ''),
  vencimiento: fila.vencimiento === SIN_FECHA ? '' : (fila.vencimiento || ''),
});

export const validarContenidoPad = (borrador) => {
  const err = {};
  if (!String(borrador.referencia || '').trim()) err.referencia = true;
  const cantidad = Number(borrador.cantidad);
  if (borrador.cantidad === '' || Number.isNaN(cantidad) || cantidad <= 0) err.cantidad = true;
  if (borrador.vencimiento && !FECHA_VALIDA.test(borrador.vencimiento)) err.vencimiento = true;
  return err;
};

// Borrador válido → fila registrada (mismo formato que al registrar).
export const deBorrador = (borrador) => ({
  ...borrador,
  referencia: borrador.referencia.trim(),
  cantidad: Number(borrador.cantidad),
  lote: String(borrador.lote || '').trim() || SIN_LOTE,
  vencimiento: borrador.vencimiento || SIN_FECHA,
});
