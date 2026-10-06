// Egreso por escaneo: stock de un producto en las cajas de Stock General,
// sugerencia de lote (GS1 o FEFO) y lista de egreso. Lógica pura.
//
// Las líneas de la lista tienen la forma que usa el traspaso a tránsito
// (ver ../../shared/traspasoTransito.js):
//   { idTemp, cajaId, nombreCaja, ubicacionOrigen, itemIndex,
//     cantidadRetirar, itemOriginal, productoId }

import { mismoItem } from '../../shared/traspasoTransito';

const normalizarLote = (lote) => String(lote ?? '').trim().toUpperCase();

export const claveLote = (cajaId, itemIndex) => `${cajaId}#${itemIndex}`;

// El ítem de una caja es del producto: por id del maestro, o (ítems antiguos
// sin codigoId) por código interno.
export const itemEsDelProducto = (item, producto) => {
  if (!item || !producto) return false;
  if (item.codigoId) return item.codigoId === producto.id;
  return Boolean(item.codigo) && item.codigo === producto.codigo;
};

// FEFO: vence primero; sin vencimiento al final; luego por caja y lote.
export const compararFEFO = (a, b) => {
  const va = a.item.vencimiento || '';
  const vb = b.item.vencimiento || '';
  if (va !== vb) {
    if (!va) return 1;
    if (!vb) return -1;
    return va.localeCompare(vb);
  }
  return (a.nombreCaja || '').localeCompare(b.nombreCaja || '', 'es', { numeric: true })
    || normalizarLote(a.item.lote).localeCompare(normalizarLote(b.item.lote));
};

// Cantidad ya puesta en la lista para esa caja y posición.
export const cantidadEnLista = (lista, cajaId, itemIndex) => (lista || [])
  .filter((l) => l.cajaId === cajaId && l.itemIndex === itemIndex)
  .reduce((acc, l) => acc + l.cantidadRetirar, 0);

// Dónde hay stock del producto: [{ clave, cajaId, nombreCaja, ubicacion,
// itemIndex, item, stock, enLista, disponible }] en orden FEFO. Solo
// posiciones con stock > 0.
export const lotesDelProducto = (cajas, producto, lista = []) => {
  const lotes = [];
  (cajas || []).forEach((caja) => {
    (caja.items || []).forEach((item, itemIndex) => {
      const stock = Number(item?.cantidad) || 0;
      if (stock <= 0 || !itemEsDelProducto(item, producto)) return;
      const enLista = cantidadEnLista(lista, caja.id, itemIndex);
      lotes.push({
        clave: claveLote(caja.id, itemIndex),
        cajaId: caja.id,
        nombreCaja: caja.nombreCaja || '',
        ubicacion: caja.ubicacion || '',
        itemIndex,
        item,
        stock,
        enLista,
        disponible: stock - enLista
      });
    });
  });
  return lotes.sort(compararFEFO);
};

// Lote a preseleccionar. Si la lectura GS1 trae lote y hay stock de ese lote
// (y del mismo vencimiento, si viene), se elige ese; si no, FEFO.
// Devuelve { lote, motivo: 'gs1' | 'fefo' | null, aviso }.
export const sugerirLote = (lotes, { lote = '', vencimiento = '' } = {}) => {
  const conDisponible = (lotes || []).filter((l) => l.disponible > 0);
  if (conDisponible.length === 0) return { lote: null, motivo: null, aviso: '' };

  const buscado = normalizarLote(lote);
  if (buscado) {
    const delLote = conDisponible.filter((l) => normalizarLote(l.item.lote) === buscado);
    const exacto = vencimiento ? delLote.filter((l) => (l.item.vencimiento || '') === vencimiento) : [];
    const candidatos = exacto.length > 0 ? exacto : delLote;
    if (candidatos.length > 0) return { lote: [...candidatos].sort(compararFEFO)[0], motivo: 'gs1', aviso: '' };
    return { lote: conDisponible[0], motivo: 'fefo', aviso: `El lote ${lote} no tiene stock disponible; se sugiere el que vence primero.` };
  }
  return { lote: conDisponible[0], motivo: 'fefo', aviso: '' };
};

// Cantidad a egresar: entero > 0 y <= disponible. Devuelve mensaje o ''.
export const validarCantidadEgreso = (cantidad, disponible) => {
  const n = Number(cantidad);
  if (!Number.isInteger(n) || n <= 0) return 'Ingresa una cantidad entera mayor a cero.';
  if (n > disponible) return `La cantidad supera el stock disponible en este lote (${disponible} disp.).`;
  return '';
};

// Agrega `cantidad` del lote a la lista (suma si esa caja/posición ya está).
// Devuelve { lista, error }; con error la lista no cambia.
export const agregarALista = (lista, lote, cantidad, producto) => {
  const error = validarCantidadEgreso(cantidad, lote.disponible);
  if (error) return { lista, error };
  const n = Number(cantidad);
  const existente = lista.find((l) => l.cajaId === lote.cajaId && l.itemIndex === lote.itemIndex);
  if (existente) {
    return { lista: lista.map((l) => (l === existente ? { ...l, cantidadRetirar: l.cantidadRetirar + n } : l)), error: '' };
  }
  return {
    lista: [...lista, {
      idTemp: lote.clave,
      cajaId: lote.cajaId,
      nombreCaja: lote.nombreCaja,
      ubicacionOrigen: lote.ubicacion,
      itemIndex: lote.itemIndex,
      cantidadRetirar: n,
      itemOriginal: { ...lote.item },
      productoId: producto?.id || lote.item.codigoId || ''
    }],
    error: ''
  };
};

// Reescaneo de un producto que ya está en la lista: suma 1 a su línea (la
// del lote GS1 si la lectura trae lote; si no, la última agregada de ese
// producto), sin superar el stock. Devuelve null si el producto no está en
// la lista; si no, { lista, linea, error }.
export const sumarUnoPorReescaneo = (lista, productoId, { lote = '' } = {}, stockActual = () => Infinity) => {
  const delProducto = lista.filter((l) => l.productoId === productoId);
  if (delProducto.length === 0) return null;
  const buscado = normalizarLote(lote);
  const candidatas = buscado ? delProducto.filter((l) => normalizarLote(l.itemOriginal.lote) === buscado) : delProducto;
  if (candidatas.length === 0) return null; // otro lote del mismo producto: se elige como nuevo
  const linea = candidatas[candidatas.length - 1];
  const stock = stockActual(linea);
  if (linea.cantidadRetirar + 1 > stock) {
    return { lista, linea, error: `No hay más stock en ${linea.nombreCaja} (lote ${linea.itemOriginal.lote || 'S/L'}): ${stock} disponible(s).` };
  }
  return { lista: lista.map((l) => (l === linea ? { ...l, cantidadRetirar: l.cantidadRetirar + 1 } : l)), linea, error: '' };
};

// Editar la cantidad de una línea (máximo: stock actual de esa posición).
export const cambiarCantidadLinea = (lista, idTemp, cantidad, stock) => {
  const error = validarCantidadEgreso(cantidad, stock);
  if (error) return { lista, error };
  return { lista: lista.map((l) => (l.idTemp === idTemp ? { ...l, cantidadRetirar: Number(cantidad) } : l)), error: '' };
};

export const quitarLinea = (lista, idTemp) => lista.filter((l) => l.idTemp !== idTemp);

// Stock actual de la posición de una línea en las cajas (en vivo); 0 si el
// ítem de esa posición ya no es el mismo que se agregó.
export const stockActualDeLinea = (cajas, linea) => {
  const caja = (cajas || []).find((c) => c.id === linea.cajaId);
  const item = caja?.items?.[linea.itemIndex];
  return mismoItem(item, linea.itemOriginal) ? Number(item.cantidad) || 0 : 0;
};
