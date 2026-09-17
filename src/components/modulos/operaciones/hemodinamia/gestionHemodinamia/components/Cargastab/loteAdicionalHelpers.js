import { CODIGO_SIN_OC } from './cargasHelpers';

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
