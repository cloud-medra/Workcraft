// Ingreso de stock con guía o factura (Ingresos y Escaneo · Con guía o
// factura). Lógica pura (sin Firebase): validación, documento que se guarda
// en inventario_general y control de documento duplicado.

export const COL_INVENTARIO = 'inventario_general';
// Un documento por combinación empresa + guía/factura + OC ya ingresada.
// El id sale de esa combinación, así la transacción de guardado (y las
// reglas de Firestore) impiden ingresarla dos veces: Firestore no tiene
// índices únicos, este es su equivalente.
export const COL_DOCUMENTOS_INGRESO = 'inventario_ingresos_documentos';

export const TIPO_REGISTRO_INGRESO = 'INGRESO_STOCK';
export const ACCION_LOG_INGRESO = 'INGRESO_CON_DOCUMENTO';
export const ORIGEN_INGRESO_ESCANEO = 'Ingreso con guía o factura por escaneo';

export const cabeceraVaciaIngreso = () => ({
  numeroGuiaFactura: '',
  numeroOrden: '',
  empresa: '',
  empresaId: '',
  nombreCaja: '',
  ubicacion: '',
  observaciones: ''
});

export const itemVacioIngreso = () => ({ codigoId: '', codigo: '', referencia: '', descripcion: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' });

// Producto del maestro -> datos de la línea de ingreso.
export const datosProductoIngreso = (cat) => ({
  codigoId: cat.id,
  codigo: cat.codigo || '',
  referencia: cat.referencia || '',
  descripcion: cat.descriptorAuto || cat.descripcion || cat.tipo || '',
  precio: Number(cat.precioNeto) || Number(cat.precio) || 0
});

export const validarCabeceraIngreso = (cabecera) => {
  if (!String(cabecera?.numeroGuiaFactura || '').trim()) return 'El número de Guía o Factura es obligatorio';
  if (!String(cabecera?.nombreCaja || '').trim()) return 'El nombre de la caja destino es obligatorio';
  return '';
};

export const validarItemIngreso = (item) => (
  !item?.codigoId || !(item.cantidad > 0)
    ? 'Todos los ítems deben tener una referencia seleccionada y cantidad mayor a cero'
    : ''
);

// Mismas validaciones que tenía Ingresos. Devuelve el mensaje o ''.
export const validarIngresoStock = (cabecera, items) => {
  const errorCabecera = validarCabeceraIngreso(cabecera);
  if (errorCabecera) return errorCabecera;
  if (!items?.length) return 'Debe ingresar al menos una referencia';
  for (const item of items) {
    const error = validarItemIngreso(item);
    if (error) return error;
  }
  return '';
};

// `tipo` es el campo que leen Stock General, Egresos y Tránsito; Ingresos
// solo guardaba `descripcion`. Se guardan ambos (mismo texto).
export const itemsParaGuardar = (items) => items.map((item) => ({ ...item, tipo: item.tipo || item.descripcion || '' }));

const normalizar = (texto) => String(texto ?? '').trim().toUpperCase();

// Clave del documento: empresa (id del maestro o, si se escribió a mano, el
// nombre) + guía/factura + OC, sin distinguir mayúsculas ni espacios en los
// extremos. Misma guía con otra OC u otra guía con la misma OC son
// documentos distintos.
export const claveDocumentoIngreso = (cabecera) => {
  const empresa = cabecera.empresaId ? `id:${cabecera.empresaId}` : `nombre:${normalizar(cabecera.empresa)}`;
  return [empresa, normalizar(cabecera.numeroGuiaFactura), normalizar(cabecera.numeroOrden)].join('|');
};

// Id de documento válido en Firestore (sin "/" ni "." y nunca __x__).
export const idDocumentoIngreso = (cabecera) => `ing_${encodeURIComponent(claveDocumentoIngreso(cabecera)).replace(/\./g, '%2E')}`;

// ¿Un registro ya guardado en inventario_general es el mismo documento?
// La empresa se compara por id cuando ambos lo tienen y si no por nombre.
export const esMismoDocumentoIngreso = (registro, cabecera) => {
  if (registro?.tipoRegistro !== TIPO_REGISTRO_INGRESO) return false;
  if (normalizar(registro.numeroGuiaFactura) !== normalizar(cabecera.numeroGuiaFactura)) return false;
  if (normalizar(registro.numeroOrden) !== normalizar(cabecera.numeroOrden)) return false;
  return registro.empresaId && cabecera.empresaId
    ? registro.empresaId === cabecera.empresaId
    : normalizar(registro.empresa) === normalizar(cabecera.empresa);
};

// Valores de numeroGuiaFactura a consultar: tal como se escribió, sin
// espacios y en mayúsculas (los registros antiguos se guardaron sin normalizar).
export const variantesGuia = (guia) => [...new Set([String(guia ?? ''), String(guia ?? '').trim(), normalizar(guia)])].filter(Boolean);

const fechaHora = (fecha) => {
  const d = fecha?.toDate ? fecha.toDate() : fecha instanceof Date ? fecha : null;
  if (!d || Number.isNaN(d.getTime())) return 'fecha desconocida';
  const dos = (n) => String(n).padStart(2, '0');
  return `${dos(d.getDate())}-${dos(d.getMonth() + 1)}-${d.getFullYear()} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

// previo: { fecha, usuario } del ingreso anterior.
export const mensajeIngresoDuplicado = (cabecera, previo) => {
  const oc = String(cabecera.numeroOrden || '').trim();
  const empresa = String(cabecera.empresa || '').trim();
  return `La guía/factura ${String(cabecera.numeroGuiaFactura).trim()} ${oc ? `con la OC ${oc}` : 'sin OC'}${empresa ? ` de ${empresa}` : ''} ya fue ingresada el ${fechaHora(previo?.fecha)} por ${previo?.usuario || 'usuario desconocido'}.`;
};

// Documento nuevo de inventario_general (sin timestamps: los pone el servicio).
export const construirRegistroIngreso = ({ cabecera, items, usuario, origen }) => ({
  tipoRegistro: TIPO_REGISTRO_INGRESO,
  numeroGuiaFactura: cabecera.numeroGuiaFactura,
  numeroOrden: cabecera.numeroOrden,
  empresa: cabecera.empresa,
  empresaId: cabecera.empresaId,
  nombreCaja: cabecera.nombreCaja,
  ubicacion: cabecera.ubicacion,
  observaciones: cabecera.observaciones,
  items: itemsParaGuardar(items),
  registradoPor: usuario?.nombreCompleto || usuario?.nombre || 'Usuario',
  ...(origen ? { origen } : {})
});

export const detallesLogIngreso = ({ cabecera, items, origen }) => ({
  numeroGuiaFactura: cabecera.numeroGuiaFactura,
  numeroOrden: cabecera.numeroOrden,
  empresa: cabecera.empresa,
  nombreCaja: cabecera.nombreCaja,
  cantidadItems: items.length,
  ...(origen ? { origen } : {})
});
