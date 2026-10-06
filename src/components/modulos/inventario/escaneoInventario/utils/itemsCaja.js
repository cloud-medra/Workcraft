// Ítems del arreglo `items` de una caja de inventario_general, con la misma
// estructura que Stock General (GeneralInventario.jsx). Lógica pura.

// Origen de los ingresos de Escaneo. Los registros anteriores al cambio de
// nombre quedaron con 'Inventario por escaneo'.
export const ORIGEN_ESCANEO = 'Ingreso directo por escaneo';

// Producto del maestro + cantidad/lote/vencimiento -> ítem de Stock General
// (mismos campos que seleccionarCodigoCatalogo en GeneralInventario).
export const construirItemDesdeProducto = (producto, { cantidad, lote, vencimiento }) => ({
  codigoId: producto.id,
  codigo: producto.codigo || '',
  referencia: producto.referencia || '',
  tipo: producto.descriptorAuto || producto.tipo || '',
  precio: Number(producto.precioNeto) || Number(producto.precio) || 0,
  cantidad: Number(cantidad),
  lote: String(lote ?? '').trim(),
  vencimiento: vencimiento || ''
});

// Mismas validaciones que Stock General: descriptor y cantidad > 0. La
// cantidad además debe ser entera. Devuelve el mensaje de error o ''.
export const validarItem = (item) => {
  if (!String(item?.tipo || '').trim()) return 'El producto no tiene descriptor en el maestro.';
  if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) return 'La cantidad debe ser un número entero mayor a cero.';
  return '';
};

const mismaClave = (a, b) => (a.codigoId && b.codigoId ? a.codigoId === b.codigoId : (a.codigo || '') === (b.codigo || '') && (a.referencia || '') === (b.referencia || ''));

export const esMismoProductoLote = (a, b) => Boolean(a && b)
  && mismaClave(a, b)
  && String(a.lote || '').trim().toUpperCase() === String(b.lote || '').trim().toUpperCase()
  && (a.vencimiento || '') === (b.vencimiento || '');

// Agrega el ítem a la caja: si ya está el mismo producto con el mismo lote y
// vencimiento, suma la cantidad; si no, lo agrega al final. No modifica el
// arreglo recibido. Devuelve { items, sumado, indice }.
export const agregarItemACaja = (items, item) => {
  const lista = (items || []).map((it) => ({ ...it }));
  const indice = lista.findIndex((it) => esMismoProductoLote(it, item));
  if (indice >= 0) {
    lista[indice].cantidad = (Number(lista[indice].cantidad) || 0) + item.cantidad;
    return { items: lista, sumado: true, indice };
  }
  lista.push({ ...item });
  return { items: lista, sumado: false, indice: lista.length - 1 };
};

// Etiqueta de una caja en el selector: "nombre — ubicación".
export const etiquetaCaja = (caja) => [caja?.nombreCaja || 'Sin nombre', caja?.ubicacion].filter(Boolean).join(' — ');
