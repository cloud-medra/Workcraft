import { normalizarTexto } from '../../../../utils/normalizarTexto';

// Fuente única de verdad de los estados de un documento en Procesos
// (Laboratorio y Vacunatorio) y de su color. Cualquier pantalla que muestre un
// estado debe usar getEstadoProcesoClase / EstadoProcesoBadge para que el
// mismo estado se vea siempre igual en todo el sistema.
//
// Las clases van escritas completas (no interpoladas) para que Tailwind las
// detecte al compilar.

export const ESTADOS_PROCESO = {
  INICIAR_INGRESO: 'Iniciar Ingreso',
  PROCESO_INICIADO: 'Proceso Iniciado',
  PROCESAR_OC: 'Procesar OC',
  FALTA_VINCULACION: 'Falta Vinculación',
  DIFERENCIA_PRECIOS: 'Diferencia Precios',
  VINCULACION_PARCIAL: 'Vinculación Parcial',
  DIFERENCIA_REPORTADA: 'Diferencia Reportada',
  ACEPTADO_CON_DIFERENCIAS: 'Aceptado con Diferencias',
  SOLICITUD_ENVIADA: 'Solicitud Enviada',
  LISTO_PARA_INGRESO: 'Listo para Ingreso',
  RECHAZADA: 'Rechazada',
  FINALIZADO: 'Finalizado',
};

const E = ESTADOS_PROCESO;

const CLASES_POR_ESTADO = {
  [E.INICIAR_INGRESO]: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600',
  [E.PROCESO_INICIADO]: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  [E.PROCESAR_OC]: 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
  [E.FALTA_VINCULACION]: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-950/60 dark:text-violet-300 dark:border-violet-800',
  [E.DIFERENCIA_PRECIOS]: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  [E.VINCULACION_PARCIAL]: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800',
  [E.DIFERENCIA_REPORTADA]: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800',
  [E.ACEPTADO_CON_DIFERENCIAS]: 'bg-lime-100 text-lime-900 border-lime-300 dark:bg-lime-950/60 dark:text-lime-300 dark:border-lime-800',
  [E.SOLICITUD_ENVIADA]: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:border-fuchsia-800',
  [E.LISTO_PARA_INGRESO]: 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
  [E.RECHAZADA]: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800',
  // Estado terminal: fondo sólido para distinguirlo de "Listo para Ingreso".
  [E.FINALIZADO]: 'bg-emerald-600 text-white border-emerald-700 dark:bg-emerald-700 dark:text-white dark:border-emerald-600',
};

const CLASE_DESCONOCIDO = 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600';

// Variantes históricas / de escritura que existen en BD y en filtros.
const ALIAS = {
  'listos para ingreso': E.LISTO_PARA_INGRESO,
  'rechazado': E.RECHAZADA,
  'diferenciasreportadas': E.DIFERENCIA_REPORTADA,
  'completado': E.FINALIZADO,
  'aprobado': E.FINALIZADO,
  'ingresado': E.FINALIZADO,
};

const CANONICO_POR_CLAVE = Object.values(E).reduce(
  (acc, estado) => ({ ...acc, [normalizarTexto(estado)]: estado }),
  {}
);

// Devuelve el nombre canónico del estado ("falta vinculacion" → "Falta Vinculación"),
// o null si no es un estado de Procesos conocido.
export const normalizarEstadoProceso = (estado) => {
  const clave = normalizarTexto(estado);
  if (!clave) return null;
  return CANONICO_POR_CLAVE[clave] || ALIAS[clave] || null;
};

export const getEstadoProcesoClase = (estado) =>
  CLASES_POR_ESTADO[normalizarEstadoProceso(estado)] || CLASE_DESCONOCIDO;
