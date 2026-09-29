import { getDocs, query, limit } from 'firebase/firestore';
import { MESES } from '../../administracion/controlMensual/constants';

// Alta rápida de una combinación Empresa/Fecha desde la columna
// "Empresas / Fechas" del detalle (Implantes y Hemodinamia). Cada módulo
// crea el registro con su propia función (su colección y su log); aquí solo
// vive lo común: la validación y la comprobación de duplicado en Firestore.

const normalizar = (texto) => String(texto || '').trim().toUpperCase();

export const nombrePeriodo = (periodo) => {
  if (!periodo) return '';
  const mesInfo = MESES.find(m => m.id === periodo.mes || m.num === Number(periodo.mes));
  return `${mesInfo?.nombre || periodo.mes} ${periodo.anio}`;
};

// `periodo` es el doc de cierres_periodos del módulo (el mismo que muestra
// el banner "Período abierto para ..." del detalle): { anio, mes: 'septiembre' }.
const fechaEnPeriodo = (fecha, periodo) => {
  const [anio, mes] = fecha.split('-').map(Number);
  const mesPeriodo = MESES.find(m => m.id === periodo.mes)?.num ?? Number(periodo.mes);
  return anio === Number(periodo.anio) && mes === mesPeriodo;
};

/**
 * Validación de frontend antes de crear. Devuelve el mensaje de error o null.
 * `bloques`: las cards ya cargadas en el detalle (para el duplicado local).
 */
export const validarNuevaEmpresaFecha = ({ fecha, empresa, bloques = [], periodo, cargandoPeriodo, nombreModulo }) => {
  if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return 'La fecha es obligatoria.';
  if (!empresa || !String(empresa).trim()) return 'La empresa es obligatoria.';
  if (cargandoPeriodo) return 'Cargando el período abierto, intenta de nuevo en un momento.';
  if (!periodo) return `No hay un período abierto para ${nombreModulo}.`;
  if (!fechaEnPeriodo(fecha, periodo)) {
    return `La fecha debe estar dentro del período abierto (${nombrePeriodo(periodo)}).`;
  }
  const duplicado = bloques.some(b => b.fecha === fecha && normalizar(b.empresa) === normalizar(empresa));
  if (duplicado) return MENSAJE_DUPLICADO;
  return null;
};

export const MENSAJE_DUPLICADO = 'Ya existe un registro para esta empresa y fecha en esta admisión.';

/**
 * Comprobación justo antes del addDoc: la colección "detalles" de la ruta ya
 * es la llave Admisión + Empresa + Fecha, así que basta con que tenga algún
 * documento (por ejemplo, creado por otro usuario después de abrir el detalle).
 */
export const existeGestionEnColeccion = async (detallesColRef) => {
  const snap = await getDocs(query(detallesColRef, limit(1)));
  return !snap.empty;
};

// Datos de la admisión que hereda el nuevo registro. Solo estos: cotizaciones,
// cargas, estado, solicitud e imputación NO se copian (el bloque parte vacío).
const CAMPOS_BASE = [
  'gestionId', 'nombre', 'informe', 'observacion', 'centro',
  'atributo', 'convenio', 'prevision', 'medico', 'descripcion'
];

export const extraerDatosBase = (registro) =>
  Object.fromEntries(CAMPOS_BASE.map(campo => [campo, registro?.[campo]]));
