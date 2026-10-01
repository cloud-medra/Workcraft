// "OC sin PDF" por mes (Ingreso de Órdenes): lee SOLO las gestiones de
// implantes_gestiones/{anio}/mes/{mes} (rango sobre la ruta, sin índice
// nuevo) y arma las OC desde su ocPorItem. Cada mes leído queda en una caché
// en memoria de la sesión: volver a un mes ya visto no lee nada. En memoria
// (no en IndexedDB) porque trae nombres de pacientes; se pierde al recargar.
import { collectionGroup, query, where, getDocs, documentId } from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import { rangoRutasGestiones } from '../ocIndex/marcarOcPendiente';
import { ocsDeGestion } from '../ocIndex/indiceOC';
import { claveOC } from './ordenesOCHelpers';

const cachePorMes = new Map(); // 'YYYY-MM' -> [{ admision, paciente, empresa, fecha, ocs }]

// Gestión cruda -> lo mínimo para la tabla (null si no tiene OC).
export const resumirGestionOC = (data) => {
  const ocs = ocsDeGestion(data).map(claveOC).filter(Boolean);
  if (ocs.length === 0) return null;
  return {
    admision: String(data.gestionId || data.agendaId || data.admision || ''),
    paciente: data.nombre || '',
    empresa: data.empresa || '',
    fecha: data.fecha || '',
    ocs
  };
};

// { gestiones, lecturas, desdeCache }. `forzar` vuelve a leer el mes.
export const leerGestionesConOCDelMes = async (anio, mes, { forzar = false } = {}) => {
  const clave = `${anio}-${mes}`;
  if (!forzar && cachePorMes.has(clave)) return { gestiones: cachePorMes.get(clave), lecturas: 0, desdeCache: true };
  const { inicio, fin } = rangoRutasGestiones(clave, clave);
  const snap = await getDocs(query(collectionGroup(db, 'detalles'), where(documentId(), '>=', inicio), where(documentId(), '<', fin)));
  const gestiones = snap.docs.map(d => resumirGestionOC(d.data())).filter(Boolean);
  cachePorMes.set(clave, gestiones);
  // Una consulta sin resultados igual cobra 1 lectura.
  return { gestiones, lecturas: Math.max(1, snap.size), desdeCache: false };
};

const ordenar = (set) => [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));

// Gestiones del mes -> una fila por OC sin PDF (la OC puede venir en varias
// gestiones/empresas/admisiones).
export const filasOCSinPdfDesdeGestiones = (gestiones, registro = {}) => {
  const porOC = new Map();
  gestiones.forEach((g) => {
    g.ocs.forEach((oc) => {
      if (registro[oc]) return;
      if (!porOC.has(oc)) porOC.set(oc, { admisiones: new Set(), pacientes: new Set(), empresas: new Set(), fechas: new Set() });
      const f = porOC.get(oc);
      f.admisiones.add(g.admision); f.pacientes.add(g.paciente); f.empresas.add(g.empresa); f.fechas.add(g.fecha);
    });
  });
  return [...porOC.entries()]
    .map(([oc, f]) => {
      const fechas = ordenar(f.fechas);
      return { oc, admisiones: ordenar(f.admisiones), pacientes: ordenar(f.pacientes), empresas: ordenar(f.empresas), fechas, fecha: fechas[0] || '' };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.oc.localeCompare(b.oc, 'es', { numeric: true }));
};
