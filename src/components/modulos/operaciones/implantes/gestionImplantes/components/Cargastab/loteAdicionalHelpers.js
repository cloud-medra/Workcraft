import { CODIGO_SIN_OC } from './cargasHelpers';

// Igual que construirItemContenidoPadDesdeFila (PadContenidoRow.jsx): sin
// código, sin costo, sin precio y sin venta — la referencia principal es la
// única que factura (venta/precio/recargo se calculan sobre su cantidad
// TOTAL original, que nunca se reduce). La diferencia con el contenido de
// un PAD es que acá la referencia/código/empresa/clase son literalmente
// los mismos de la referencia principal (es la MISMA referencia, solo
// cambia el lote/vencimiento/cantidad parcial), no se buscan de nuevo.
export const construirItemLoteDesdeFila = (fila, referenciaPadreId, contexto) => ({
  id: crypto.randomUUID(),
  lotePadreId: referenciaPadreId,
  numCotizacion: contexto.numCotizacion,
  totalCotizacion: 0,
  referencia: contexto.referencia,
  cantidad: Number(fila.cantidad) || 0,
  lote: fila.lote.trim() || 'Sin lote',
  vencimiento: fila.vencimiento || '',
  empresaVinculada: contexto.empresaVinculada || '',
  tipoVinculado: contexto.tipoVinculado || 'P',
  detalle: contexto.detalle || 'P',
  descriptorAuto: contexto.descriptorAuto || 'P',
  clase: contexto.clase || 'P',
  codigo: CODIGO_SIN_OC,
  precio: 0,
  sinCodigo: false,
  vecesCosto: 1,
  recargoEncontrado: true,
  venta: 0,
  totalItem: 0,
  estadoCarga: 'PENDIENTE',
  periodoAnio: contexto.periodoAnio,
  periodoMes: contexto.periodoMes
});
