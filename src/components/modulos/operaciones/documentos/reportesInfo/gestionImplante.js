// Reporte Info → columna "Gestión implante": la marca de cada admisión
// (admisiones_gestionadas_implantes, la mantiene functions/admisiones). Se
// lee solo para las admisiones del mes en pantalla, en lotes de 30.
import { collection, documentId, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import {
  COLECCION_ADMISIONES, ESTADOS_ADMISION, ETIQUETAS_ESTADO, rutaDeClave,
} from '../../../../../../functions/admisiones/nucleo.mjs';

export { ESTADOS_ADMISION, ETIQUETAS_ESTADO };
export const OPCIONES_GESTION = [ESTADOS_ADMISION.PENDIENTE, ESTADOS_ADMISION.GESTIONADA, ESTADOS_ADMISION.CARGADA, ESTADOS_ADMISION.IMPUTADA];

export const claveAdmision = (valor) => {
  const n = Number(String(valor ?? '').trim());
  return Number.isFinite(n) && n > 0 ? String(n) : null;
};

// { [admisión]: marca } de las admisiones dadas (las que no tienen marca no
// aparecen: están "Pendiente").
export const cargarMarcas = async (admisiones) => {
  const ids = [...new Set(admisiones.map(claveAdmision).filter(Boolean))];
  const marcas = {};
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await getDocs(query(collection(db, COLECCION_ADMISIONES), where(documentId(), 'in', ids.slice(i, i + 30))));
    snap.docs.forEach((d) => { marcas[d.id] = d.data(); });
  }
  return marcas;
};

export const estadoDe = (marca) => marca?.estado || ESTADOS_ADMISION.PENDIENTE;

const fecha = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};

export const tooltipMarca = (marca) => {
  if (!marca) return 'Sin gestión en Implantes';
  const partes = [`${marca.cantidad} gestión(es) en Implantes`];
  if (marca.primeraFechaGestion) partes.push(`desde ${fecha(marca.primeraFechaGestion)}`);
  if (marca.estado === ESTADOS_ADMISION.GESTIONADA) partes.push(`faltan ${marca.itemsPendientes} ítem(s) por cargar`);
  if (marca.estado === ESTADOS_ADMISION.CARGADA) partes.push('todos los ítems cargados');
  if (marca.estado === ESTADOS_ADMISION.IMPUTADA) partes.push(marca.itemsPendientes ? `imputada · ${marca.itemsPendientes} ítem(s) sin cargar` : 'imputada');
  return partes.join(' · ');
};

// A dónde lleva "Abrir": con una sola gestión, su detalle; con varias, la
// lista de Gestiones filtrada por la admisión.
export const destinoAbrir = (admision, marca) => {
  const claves = Object.keys(marca?.gestiones || {});
  return claves.length === 1 ? { admision, refPath: rutaDeClave(claves[0]) } : { admision };
};

// Colores del badge: Pendiente (gris), Gestionada (azul), Cargada (verde),
// Imputada (verde oscuro).
export const CLASE_GESTION = {
  [ESTADOS_ADMISION.PENDIENTE]: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  [ESTADOS_ADMISION.GESTIONADA]: 'bg-blue-100 text-[#1d6fa5] border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
  [ESTADOS_ADMISION.CARGADA]: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  [ESTADOS_ADMISION.IMPUTADA]: 'bg-emerald-700 text-white border-emerald-800 dark:bg-emerald-800 dark:text-emerald-50 dark:border-emerald-700',
};
