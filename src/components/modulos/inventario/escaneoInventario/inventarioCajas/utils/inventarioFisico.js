// Inventario por cajas (conteo físico): lógica pura, sin Firebase.
//
// Todo se compara por producto + lote + vencimiento ("clave"). El producto
// es el codigoId del maestro; los ítems antiguos sin codigoId usan el código
// interno y la referencia.
import { itemEsDelProducto } from '../../utils/stockProducto';

export const ESTADOS_INVENTARIO = { EN_CURSO: 'EN_CURSO', FINALIZADO: 'FINALIZADO' };
export const ESTADOS_CAJA = { PENDIENTE: 'PENDIENTE', EN_CONTEO: 'EN_CONTEO', FINALIZADA: 'FINALIZADA' };
export const CATEGORIAS = { CUADRADO: 'cuadrado', FALTANTE: 'faltante', SOBRANTE: 'sobrante', NO_ENCONTRADO: 'noEncontrado' };
export const ETIQUETAS_CATEGORIA = {
  cuadrado: 'Cuadrado',
  faltante: 'Faltante',
  sobrante: 'Sobrante',
  noEncontrado: 'No encontrado'
};
// Resultado del ajuste final de cada caja.
export const ESTADOS_AJUSTE = {
  AJUSTADA: 'AJUSTADA',
  SIN_DIFERENCIAS: 'SIN_DIFERENCIAS',
  CON_MOVIMIENTOS: 'CON_MOVIMIENTOS',
  NO_EXISTE: 'NO_EXISTE'
};

// 'YYYY-MM-DD' -> 'DD-MM-YYYY' ('S/V' si no hay).
export const fechaCorta = (iso) => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}-${m}-${y}` : 'S/V';
};

export const normalizarLote = (lote) => String(lote ?? '').trim().toUpperCase();

const parteProducto = (item) => (item?.codigoId
  ? item.codigoId
  : `cod:${String(item?.codigo || '').trim()}|${String(item?.referencia || '').trim()}`);

export const claveProductoLote = (item) =>
  `${parteProducto(item)}|${normalizarLote(item?.lote)}|${item?.vencimiento || ''}`;

const datosProducto = (item) => ({
  codigoId: item.codigoId || '',
  codigo: item.codigo || '',
  referencia: item.referencia || '',
  tipo: item.tipo || item.descriptorAuto || '',
  precio: Number(item.precio ?? item.precioNeto) || 0
});

// Stock esperado de una caja (foto de sus items): una entrada por clave, con
// las líneas repetidas sumadas. Solo claves con cantidad > 0.
export const esperadoDeItems = (items) => {
  const porClave = new Map();
  (items || []).forEach((item) => {
    const cantidad = Number(item?.cantidad) || 0;
    if (cantidad <= 0) return;
    const clave = claveProductoLote(item);
    if (!porClave.has(clave)) {
      porClave.set(clave, { clave, ...datosProducto(item), lote: String(item.lote || '').trim(), vencimiento: item.vencimiento || '', esperado: 0 });
    }
    porClave.get(clave).esperado += cantidad;
  });
  return [...porClave.values()];
};

// Lotes esperados de un producto en la caja (para elegir al escanear un
// código sin lote).
export const lotesEsperadosDeProducto = (esperado, producto) =>
  (esperado || []).filter((e) => itemEsDelProducto(e, producto));

// Línea de conteo para un producto y lote. Si ese producto/lote/vencimiento
// estaba en la foto, se usa su misma clave (cubre ítems antiguos sin
// codigoId); si no, es un lote nuevo.
export const lineaDeConteo = (esperado, producto, { lote = '', vencimiento = '' } = {}) => {
  const existente = (esperado || []).find((e) => itemEsDelProducto(e, producto)
    && normalizarLote(e.lote) === normalizarLote(lote) && (e.vencimiento || '') === (vencimiento || ''));
  if (existente) {
    const linea = { ...existente, cantidad: 0 };
    delete linea.esperado;
    return linea;
  }
  const base = {
    codigoId: producto.id,
    codigo: producto.codigo || '',
    referencia: producto.referencia || '',
    tipo: producto.descriptorAuto || producto.tipo || '',
    precio: Number(producto.precioNeto ?? producto.precio) || 0,
    lote: String(lote || '').trim(),
    vencimiento: vencimiento || ''
  };
  return { clave: claveProductoLote(base), ...base, cantidad: 0 };
};

// Escanear suma 1 (agrega la línea si no estaba). No modifica el arreglo.
export const sumarAlConteo = (conteo, linea, cantidad = 1) => {
  const lista = conteo || [];
  const i = lista.findIndex((l) => l.clave === linea.clave);
  if (i < 0) return [...lista, { ...linea, cantidad }];
  return lista.map((l, j) => (j === i ? { ...l, cantidad: l.cantidad + cantidad } : l));
};

// Corregir a mano: entero >= 0. Devuelve { conteo, error }.
export const fijarCantidadConteo = (conteo, clave, valor) => {
  const n = Number(valor);
  if (String(valor).trim() === '' || !Number.isInteger(n) || n < 0) {
    return { conteo, error: 'La cantidad debe ser un número entero mayor o igual a cero.' };
  }
  return { conteo: conteo.map((l) => (l.clave === clave ? { ...l, cantidad: n } : l)), error: '' };
};

export const quitarDelConteo = (conteo, clave) => (conteo || []).filter((l) => l.clave !== clave);

const totalesVacios = () => ({
  cuadrado: 0, faltante: 0, sobrante: 0, noEncontrado: 0,
  unidadesEsperadas: 0, unidadesContadas: 0, unidadesFaltantes: 0, unidadesSobrantes: 0
});

// Esperado vs contado de una caja -> { filas, totales }. Cada fila:
// { clave, producto..., lote, vencimiento, esperado, contado, diferencia,
//   categoria, loteNuevo }.
//   cuadrado: contado = esperado; faltante: contado < esperado (y > 0);
//   noEncontrado: esperado > 0 y contado 0; sobrante: contado > esperado,
//   o lote/producto que no estaba en el sistema (loteNuevo).
export const compararConteo = (esperado, conteo) => {
  const porClave = new Map();
  (esperado || []).forEach((e) => porClave.set(e.clave, { ...e, contado: 0 }));
  (conteo || []).forEach((c) => {
    const actual = porClave.get(c.clave);
    if (actual) actual.contado += c.cantidad;
    else {
      const { cantidad, ...datos } = c;
      porClave.set(c.clave, { ...datos, esperado: 0, contado: cantidad, loteNuevo: true });
    }
  });

  const totales = totalesVacios();
  const filas = [...porClave.values()]
    .filter((f) => f.esperado > 0 || f.contado > 0)
    .map((f) => {
      const diferencia = f.contado - f.esperado;
      let categoria = CATEGORIAS.CUADRADO;
      if (f.esperado > 0 && f.contado === 0) categoria = CATEGORIAS.NO_ENCONTRADO;
      else if (diferencia < 0) categoria = CATEGORIAS.FALTANTE;
      else if (diferencia > 0) categoria = CATEGORIAS.SOBRANTE;
      totales[categoria] += 1;
      totales.unidadesEsperadas += f.esperado;
      totales.unidadesContadas += f.contado;
      if (diferencia < 0) totales.unidadesFaltantes += -diferencia;
      if (diferencia > 0) totales.unidadesSobrantes += diferencia;
      return { ...f, diferencia, categoria, loteNuevo: Boolean(f.loteNuevo) };
    })
    .sort((a, b) => (a.tipo || a.referencia || '').localeCompare(b.tipo || b.referencia || '', 'es') || a.clave.localeCompare(b.clave));
  return { filas, totales };
};

// Ajuste final de una caja sobre sus items ACTUALES: cada clave contada (o
// esperada) queda con la cantidad contada en su primera línea y las líneas
// repetidas en 0; los lotes nuevos se agregan; lo contado en 0 queda en 0
// (como Stock General). Devuelve { items, ajustes } con un ajuste por clave
// cuya cantidad cambia: { clave, producto..., lote, vencimiento, anterior,
// nueva, diferencia, loteNuevo }.
export const ajustarItemsCaja = (itemsActuales, conteo) => {
  const items = structuredClone(itemsActuales || []);
  const contadoPorClave = new Map();
  (conteo || []).forEach((c) => contadoPorClave.set(c.clave, (contadoPorClave.get(c.clave) || 0) + c.cantidad));

  const anteriorPorClave = new Map();
  const vistas = new Set();
  const ajustes = [];
  items.forEach((item) => {
    const clave = claveProductoLote(item);
    anteriorPorClave.set(clave, (anteriorPorClave.get(clave) || 0) + (Number(item.cantidad) || 0));
  });

  items.forEach((item) => {
    const clave = claveProductoLote(item);
    if (vistas.has(clave)) {
      item.cantidad = 0; // línea repetida: lo contado queda en la primera
      return;
    }
    vistas.add(clave);
    const nueva = contadoPorClave.get(clave) || 0;
    const anterior = anteriorPorClave.get(clave);
    item.cantidad = nueva;
    if (nueva !== anterior) {
      ajustes.push({ clave, ...datosProducto(item), lote: item.lote || '', vencimiento: item.vencimiento || '', anterior, nueva, diferencia: nueva - anterior, loteNuevo: false });
    }
  });

  (conteo || []).forEach((c) => {
    if (vistas.has(c.clave) || c.cantidad <= 0) return;
    vistas.add(c.clave);
    const nuevo = {
      codigoId: c.codigoId || '',
      codigo: c.codigo || '',
      referencia: c.referencia || '',
      tipo: c.tipo || '',
      precio: Number(c.precio) || 0,
      cantidad: contadoPorClave.get(c.clave),
      lote: c.lote || '',
      vencimiento: c.vencimiento || ''
    };
    items.push(nuevo);
    ajustes.push({ clave: c.clave, ...datosProducto(nuevo), lote: nuevo.lote, vencimiento: nuevo.vencimiento, anterior: 0, nueva: nuevo.cantidad, diferencia: nuevo.cantidad, loteNuevo: true });
  });

  return { items, ajustes };
};

// Estado de cada caja de Stock General dentro del inventario.
export const estadoDeCaja = (docCaja) => docCaja?.estado || ESTADOS_CAJA.PENDIENTE;

export const avanceInventario = (cajas, docsCajas) => {
  const total = (cajas || []).length;
  const porId = new Map((docsCajas || []).map((d) => [d.cajaId || d.id, d]));
  const finalizadas = (cajas || []).filter((c) => estadoDeCaja(porId.get(c.id)) === ESTADOS_CAJA.FINALIZADA).length;
  return { total, finalizadas, texto: `${finalizadas} de ${total} cajas finalizadas` };
};

// Suma los totales de varias cajas.
export const sumarTotales = (lista) => (lista || []).reduce((acc, t) => {
  Object.keys(acc).forEach((k) => { acc[k] += Number(t?.[k]) || 0; });
  return acc;
}, totalesVacios());
