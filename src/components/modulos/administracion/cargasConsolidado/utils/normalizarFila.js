// Capa de normalización: Implantes y Hemodinamia (bloques anidados en
// implantes_gestiones / hemodinamia_gestiones) y Consignación (ítems planos en
// consignacion_registros) tienen formas de datos distintas — acá se
// mapean a una forma común para que la tabla combinada, Imputadas y
// Solicitudes puedan renderizar ambos orígenes con las mismas columnas.
// `_raw` conserva el documento original tal cual lo entrega el hook de
// cada módulo, para que el modal de detalle y la acción de exportar
// puedan seguir operando con la forma nativa de cada uno.

import { CENTRO_HEMODINAMIA } from '../../../operaciones/hemodinamia/gestionHemodinamia/utils/constantesHemodinamia';
import { CODIGO_SIN_OC } from '../../../operaciones/implantes/gestionImplantes/components/Cargastab/cargasHelpers';

export const ORIGEN = {
  IMPLANTES: 'IMPLANTES',
  CONSIGNACION: 'CONSIGNACION',
  HEMODINAMIA: 'HEMODINAMIA'
};

export const ORIGEN_LABEL = {
  [ORIGEN.IMPLANTES]: 'Implantes',
  [ORIGEN.CONSIGNACION]: 'Consignación',
  [ORIGEN.HEMODINAMIA]: 'Hemodinamia'
};

export const ORIGEN_BADGE_STYLE = {
  [ORIGEN.IMPLANTES]: 'bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-300 dark:border-violet-800',
  [ORIGEN.CONSIGNACION]: 'bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800',
  [ORIGEN.HEMODINAMIA]: 'bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800'
};

// --- Gestión (tabla principal) ---

// El "Período" (periodoAño/Mes, contable) es un dato aparte de la "fecha"
// (admisión/registro) por la que se filtra la tabla — pueden no coincidir
// (ej. fecha 30-08-2026 imputada al período de septiembre). Para un bloque
// de Implantes se toma del primer ítem que lo tenga, mismo criterio que
// usa DetallesTab.jsx para mostrarlo en el detalle.
const obtenerPeriodoBloqueImplantes = (bloque) => {
  for (const cot of bloque.cotizaciones || []) {
    const it = (cot.items || []).find(x => x.periodoAnio && x.periodoMes);
    if (it) return { periodoAnio: it.periodoAnio, periodoMes: it.periodoMes };
  }
  return { periodoAnio: '', periodoMes: '' };
};

export const normalizarFilaGestionImplantes = (bloque) => ({
  origen: ORIGEN.IMPLANTES,
  id: bloque.id,
  refPath: bloque.refPath,
  gestionId: bloque.gestionId || bloque.agendaId || 'P',
  nombre: bloque.nombre || 'P',
  medico: bloque.medico || 'P',
  fecha: bloque.fecha || '',
  empresa: bloque.empresa || 'P',
  centro: bloque.centro || 'P',
  atributo: bloque.atributo || 'P',
  estado: bloque.estado || 'AGENDADO',
  costo: Number(bloque.costo) || 0,
  solicitud: bloque.solicitud || 'PENDIENTE',
  registradoPor: bloque.registradoPor || '',
  fechaRegistro: bloque.fechaRegistro || null,
  ...obtenerPeriodoBloqueImplantes(bloque),
  _raw: bloque
});

export const normalizarFilaGestionHemodinamia = (bloque) => ({
  origen: ORIGEN.HEMODINAMIA,
  id: bloque.id,
  refPath: bloque.refPath,
  gestionId: bloque.gestionId || bloque.agendaId || 'P',
  nombre: bloque.nombre || 'P',
  medico: bloque.medico || 'P',
  fecha: bloque.fecha || '',
  empresa: bloque.empresa || 'P',
  centro: CENTRO_HEMODINAMIA,
  atributo: bloque.atributo || 'HEMODINAMIA',
  estado: bloque.estado || 'AGENDADO',
  costo: Number(bloque.costo) || 0,
  solicitud: bloque.solicitud || 'PENDIENTE',
  registradoPor: bloque.registradoPor || '',
  fechaRegistro: bloque.fechaRegistro || null,
  ...obtenerPeriodoBloqueImplantes(bloque),
  _raw: bloque
});

export const normalizarFilaGestionConsignacion = (item) => ({
  origen: ORIGEN.CONSIGNACION,
  id: item.id,
  refPath: item.ref?.path || item.refPath || null,
  gestionId: item.gestionId || 'P',
  nombre: item.nombre || 'P',
  medico: item.medico || 'P',
  fecha: item.fecha || '',
  empresa: item.empresa || 'P',
  centro: item.centro || 'P',
  atributo: item.atributo || 'P',
  estado: item.estado || 'INGRESADO',
  costo: Number(item.costo) || 0,
  solicitud: (item.estado || '').toUpperCase() === 'SOLICITADO' ? 'SOLICITADO' : 'PENDIENTE',
  registradoPor: item.registradoPor || '',
  fechaRegistro: item.fechaRegistro || null,
  periodoAnio: item.periodoAnio || '',
  periodoMes: item.periodoMes || '',
  _raw: item
});

// --- Imputadas ---

export const normalizarImputadaImplantes = (doc) => ({
  origen: ORIGEN.IMPLANTES,
  id: doc.id,
  gestionId: doc.gestionId || doc.agendaId || 'P',
  paciente: doc.paciente || 'P',
  medico: doc.medico || 'P',
  fecha: doc.fecha || '',
  empresa: doc.empresa || 'P',
  codigo: doc.codigo || 'P',
  referencia: doc.referencia || 'P',
  cantidad: Number(doc.cantidad) || 0,
  costoUnitario: Number(doc.precio) || 0,
  vecesCosto: doc.vecesCosto ?? null,
  venta: Number(doc.venta) || 0,
  total: Number(doc.total) || 0,
  lote: doc.lote || '',
  vencimiento: doc.vencimiento || '',
  estado: doc.estado || 'AGENDADO',
  periodoAnio: doc.periodoAnio || '',
  periodoMes: doc.periodoMes || '',
  _raw: doc
});

export const normalizarImputadaHemodinamia = (doc) => ({
  origen: ORIGEN.HEMODINAMIA,
  id: doc.id,
  gestionId: doc.gestionId || doc.agendaId || 'P',
  paciente: doc.paciente || 'P',
  medico: doc.medico || 'P',
  fecha: doc.fecha || '',
  empresa: doc.empresa || 'P',
  codigo: doc.codigo || 'P',
  referencia: doc.referencia || 'P',
  cantidad: Number(doc.cantidad) || 0,
  costoUnitario: Number(doc.precio) || 0,
  vecesCosto: doc.vecesCosto ?? null,
  venta: Number(doc.venta) || 0,
  total: Number(doc.total) || 0,
  lote: doc.lote || '',
  vencimiento: doc.vencimiento || '',
  estado: doc.estado || 'AGENDADO',
  periodoAnio: doc.periodoAnio || '',
  periodoMes: doc.periodoMes || '',
  _raw: doc
});

export const normalizarImputadaConsignacion = (doc) => ({
  origen: ORIGEN.CONSIGNACION,
  id: doc.id,
  gestionId: doc.gestionId || 'P',
  paciente: doc.nombre || 'P',
  medico: doc.medico || 'P',
  fecha: doc.fecha || '',
  empresa: doc.empresa || 'P',
  codigo: doc.codigo || 'P',
  referencia: doc.referencia || 'P',
  cantidad: Number(doc.cantidad) || 0,
  costoUnitario: Number(doc.costo) || 0,
  vecesCosto: doc.recargoVecesCosto ?? null,
  venta: Number(doc.venta) || 0,
  total: Number(doc.total) || 0,
  lote: doc.lote || '',
  vencimiento: doc.vencimiento || '',
  estado: doc.estado || 'INGRESADO',
  periodoAnio: doc.periodoAnio || '',
  periodoMes: doc.periodoMes || '',
  _raw: doc
});

// --- Solicitudes ---
// Implantes agrupa por BLOQUE (con .items[] adentro); Consignación es un
// ítem suelto. Se normaliza a nivel de fila-solicitud (1 fila = 1 bloque
// de implantes con todos sus ítems, o 1 ítem de consignación) porque la
// acción de exportar necesita esa agrupación nativa para escribir en la
// colección de imputadas correcta con la forma que cada módulo espera.

export const normalizarSolicitudImplantes = (bloque) => ({
  origen: ORIGEN.IMPLANTES,
  id: bloque.refPath,
  refPath: bloque.refPath,
  gestionId: bloque.gestionId || 'P',
  paciente: bloque.nombre || 'P',
  medico: bloque.medico || 'P',
  fecha: bloque.fecha || '',
  empresa: bloque.empresa || 'P',
  cantidadItems: bloque.items?.length || 0,
  costo: Number(bloque.costo) || 0,
  _raw: bloque
});

// `id` usa item.id (no item.refPath): las filas de desglose de guía que
// arma cargarCandidatosSolicitudConsignacion (esFilaGuia: true) no tienen
// documento propio en Firestore, así que no tienen refPath — solo id.
// Usar refPath como id las dejaba todas con el mismo id (undefined),
// rompiendo la selección por checkbox y las keys de React.
export const normalizarSolicitudConsignacion = (item) => ({
  origen: ORIGEN.CONSIGNACION,
  id: item.id,
  refPath: item.refPath || null,
  gestionId: item.gestionId || 'P',
  paciente: item.nombre || 'P',
  medico: item.medico || 'P',
  fecha: item.fecha || '',
  empresa: item.empresa || 'P',
  cantidadItems: 1,
  costo: Number(item.costo) || 0,
  _raw: item
});

// Hemodinamia guarda igual que Implantes (bloques con cotizaciones[0].items).
// `_raw` toma la forma nativa que arma useSolicitudHemodinamiaData (con
// `items` ya extraídos y valores por defecto), porque el export de este
// módulo la necesita tal cual para escribir en hemodinamia_imputadas.
export const normalizarSolicitudHemodinamia = (doc) => {
  const items = doc.cotizaciones?.[0]?.items || [];
  const bloque = {
    id: doc.id,
    refPath: doc.refPath,
    gestionId: doc.gestionId || doc.agendaId || 'P',
    agendaId: doc.agendaId || doc.gestionId || 'P',
    admision: doc.admision || 'P',
    nombre: doc.nombre || 'P',
    medico: doc.medico || 'P',
    empresa: doc.empresa || 'P',
    fecha: doc.fecha || 'P',
    informe: doc.informe || 'PENDIENTE',
    convenio: doc.convenio || 'P',
    prevision: doc.prevision || 'P',
    descripcion: doc.descripcion || 'P',
    centro: CENTRO_HEMODINAMIA,
    atributo: doc.atributo || 'HEMODINAMIA',
    estado: doc.estado || 'AGENDANDO',
    costo: doc.costo || 0,
    registradoPor: doc.registradoPor || 'Usuario',
    fechaRegistro: doc.fechaRegistro || null,
    numCotizacion: doc.cotizaciones?.[0]?.numCotizacion || 'P',
    items
  };
  return {
    origen: ORIGEN.HEMODINAMIA,
    id: bloque.refPath,
    refPath: bloque.refPath,
    gestionId: bloque.gestionId,
    paciente: bloque.nombre,
    medico: bloque.medico,
    fecha: bloque.fecha === 'P' ? '' : bloque.fecha,
    empresa: bloque.empresa,
    cantidadItems: items.length,
    costo: Number(bloque.costo) || 0,
    _raw: bloque
  };
};

// --- Orden compartido del Consolidado ---
// Las 3 colecciones ya llegan unificadas al mismo campo `gestionId`
// (número de admisión) gracias a los normalizadores de arriba, así que el
// orden se puede aplicar una sola vez sobre el arreglo combinado, sin
// importar de qué origen venga cada fila.
//
// 1° criterio: número de admisión ascendente (las admisiones son
// numéricas, ej. "102030" — se comparan como número, no como texto, para
// que "9" no quede después de "10"; un gestionId no numérico como el
// placeholder "P" se manda al final del todo).
// 2° criterio, dentro del mismo grupo de admisión: filas con código de OC
// van primero, filas sin código (CODIGO_SIN_OC = "No lleva OC", el
// placeholder "P", vacío o nulo) van al final de ese grupo.
const compararAdmision = (a, b) => {
  const na = Number(a);
  const nb = Number(b);
  const aEsNumero = a !== '' && a != null && !Number.isNaN(na);
  const bEsNumero = b !== '' && b != null && !Number.isNaN(nb);
  if (aEsNumero && bEsNumero) return na - nb;
  if (aEsNumero) return -1;
  if (bEsNumero) return 1;
  return String(a ?? '').localeCompare(String(b ?? ''));
};

const grupoOC = (codigo) => {
  const c = (codigo ?? '').toString().trim();
  return (c === '' || c === CODIGO_SIN_OC || c === 'P') ? 1 : 0;
};

export const ordenarPorAdmisionYOC = (filas) =>
  [...filas].sort((a, b) => {
    const cmpAdmision = compararAdmision(a.gestionId, b.gestionId);
    if (cmpAdmision !== 0) return cmpAdmision;
    return grupoOC(a.codigo) - grupoOC(b.codigo);
  });

// --- Filtros compartidos del Consolidado (Gestión, Solicitudes, Imputadas) ---
// Lista fija (no se deriva de los datos, a diferencia de un filtro de
// "estados vistos"): el Consolidado por definición solo junta estas 3
// colecciones, así que las opciones del selector de Origen no cambian.
export const ORIGENES_DISPONIBLES = [ORIGEN.IMPLANTES, ORIGEN.CONSIGNACION, ORIGEN.HEMODINAMIA];

// Búsqueda parcial (sin distinguir mayúsculas) por admisión o por
// nombre/paciente — cada normalizador de arriba usa `nombre` (Gestión) o
// `paciente` (Solicitudes/Imputadas), así que se revisan ambos campos sin
// necesidad de unificar el nombre de la propiedad entre los 3.
// `origenesSeleccionados` vacío = sin restricción ("Todas"), igual que el
// patrón ya usado en los demás filtros multi-selección de la app
// (ver filtrosEstados en Consignación/Implantes): no es necesario marcar
// "Todas" explícitamente, alcanza con no marcar ninguna opción individual.
export const filtrarPorBusquedaYOrigen = (filas, { busqueda = '', origenesSeleccionados = [] } = {}) => {
  const texto = busqueda.trim().toLowerCase();
  return filas.filter(f => {
    if (origenesSeleccionados.length > 0 && !origenesSeleccionados.includes(f.origen)) return false;
    if (!texto) return true;
    const admision = String(f.gestionId ?? '').toLowerCase();
    const nombre = String(f.nombre ?? f.paciente ?? '').toLowerCase();
    return admision.includes(texto) || nombre.includes(texto);
  });
};
