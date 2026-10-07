import { esMismoProductoLote } from '../../shared/escaneo/itemsCaja';
import { agregarCodigoALista } from '../../shared/escaneo/vinculosCodigoBarra';

// Lista de líneas del documento en Escaneo · Con guía o factura. Cada línea:
// { id, producto, item (línea de Ingresos), codigos (a vincular al guardar) }.
// Lógica pura.

let secuencia = 0;
export const nuevaLinea = (producto, item, codigos) => ({ id: `l${Date.now()}-${secuencia++}`, producto, item, codigos: codigos || [] });

// Índice de la línea con el mismo producto, lote y vencimiento, o -1.
export const indiceLineaIgual = (lineas, item) => lineas.findIndex((l) => esMismoProductoLote(l.item, item));

// Suma la cantidad a la línea `indice` y une sus códigos (sin repetir).
export const sumarALinea = (lineas, indice, item, codigos) => lineas.map((l, i) => (i !== indice ? l : {
  ...l,
  item: { ...l.item, cantidad: l.item.cantidad + item.cantidad },
  codigos: (codigos || []).reduce(agregarCodigoALista, l.codigos)
}));

export const cambiarCantidadLinea = (lineas, id, cantidad) => lineas.map((l) => (l.id === id ? { ...l, item: { ...l.item, cantidad } } : l));

export const quitarLinea = (lineas, id) => lineas.filter((l) => l.id !== id);

export const totalUnidades = (lineas) => lineas.reduce((acc, l) => acc + (Number(l.item.cantidad) || 0), 0);
