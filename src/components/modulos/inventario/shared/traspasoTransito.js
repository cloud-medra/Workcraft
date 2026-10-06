// Lógica pura del "Egreso y traspaso de insumos a tránsito por lotes",
// compartida por Egresos (EgresosInventario.jsx) y Escaneo (egreso por
// escaneo). La escritura en Firestore está en traspasoTransitoService.js.
//
// Una línea de traspaso es:
//   { cajaId, nombreCaja, ubicacionOrigen, itemIndex, cantidadRetirar,
//     itemOriginal }  (itemOriginal = copia del ítem tal como se vio)

export const DESTINOS_TRANSITO = { stock: 'Stock General', cliente: 'Cliente Específico' };
export const MOTIVO_TRASPASO = 'Traspaso a Tránsito';

// El ítem en la posición elegida sigue siendo el mismo que vio el usuario.
export const mismoItem = (actual, original) => Boolean(actual) && ['codigo', 'referencia', 'lote', 'vencimiento']
  .every(campo => (actual[campo] ?? '') === (original?.[campo] ?? ''));

export const agruparLineasPorCaja = (lineas) => {
  const porCaja = {};
  lineas.forEach(linea => {
    if (!porCaja[linea.cajaId]) porCaja[linea.cajaId] = [];
    porCaja[linea.cajaId].push(linea);
  });
  return porCaja;
};

// Descuenta las líneas de una caja sobre sus ítems ACTUALES (releídos en la
// transacción). Lanza error, nombrando la caja y el ítem, si el ítem cambió
// o ya no alcanza el stock. No modifica el arreglo recibido.
export const aplicarRetirosACaja = (items, lineasDeEstaCaja) => {
  const nuevosItems = structuredClone(items || []);
  lineasDeEstaCaja.forEach(linea => {
    const item = nuevosItems[linea.itemIndex];
    if (!mismoItem(item, linea.itemOriginal)) {
      throw new Error(`La caja ${linea.nombreCaja} cambió mientras preparabas el traspaso. Vuelve a seleccionar los ítems.`);
    }
    if (Number(item.cantidad) < linea.cantidadRetirar) {
      throw new Error(`Stock insuficiente en ${linea.nombreCaja} (${item.referencia || item.codigo}): quedan ${item.cantidad}.`);
    }
    item.cantidad -= linea.cantidadRetirar;
  });
  return nuevosItems;
};

// Datos generales del traspaso (los mismos que pide Egresos). Devuelve el
// mensaje de error o ''.
export const validarDatosTraspaso = ({ lineas, numeroDocumento, tipoDestino }) => {
  if (!lineas || lineas.length === 0) return 'La lista de traspaso está vacía';
  if (!String(numeroDocumento || '').trim()) return 'Esperando generación de número de documento...';
  if (!tipoDestino) return 'Por favor, selecciona el destino del tránsito (Stock General o Cliente Específico)';
  return '';
};

// Siguiente correlativo YYNNNN a partir del último numeroDocumento.
export const siguienteNumeroDocumento = (ultimoNumDoc, fecha = new Date()) => {
  const yearPrefix = fecha.getFullYear().toString().slice(-2);
  if (ultimoNumDoc && ultimoNumDoc.startsWith(yearPrefix)) {
    const correlativoActual = parseInt(ultimoNumDoc.slice(2), 10);
    const siguiente = (isNaN(correlativoActual) ? 1 : correlativoActual + 1).toString().padStart(4, '0');
    return `${yearPrefix}${siguiente}`;
  }
  return `${yearPrefix}0001`;
};

// Forma canónica para comparar contenido de Firestore: claves ordenadas y
// fechas (Date o Timestamp) como milisegundos. JSON.stringify directo
// depende del orden de las claves y de cómo llega cada fecha, que pueden
// variar entre la lectura del listener y la de la transacción aunque el
// documento no haya cambiado.
const canonico = (valor) => {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return { $fecha: valor.getTime() };
  if (typeof valor?.toMillis === 'function') return { $fecha: valor.toMillis() };
  if (Array.isArray(valor)) return valor.map(canonico);
  if (typeof valor === 'object') {
    return Object.keys(valor).sort().reduce((acc, clave) => {
      acc[clave] = canonico(valor[clave]);
      return acc;
    }, {});
  }
  return valor;
};

// Los ítems de un documento en tránsito siguen siendo los que vio el usuario
// (verificación de concurrencia de Tránsito): mismo contenido, sin importar
// el orden de las claves ni el tipo de fecha.
export const mismosItemsTransito = (actuales, vistos) =>
  JSON.stringify(canonico(actuales || [])) === JSON.stringify(canonico(vistos || []));
