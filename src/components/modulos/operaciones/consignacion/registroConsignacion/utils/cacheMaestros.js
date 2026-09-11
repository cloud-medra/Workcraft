import { collection, query, where, getDocs } from 'firebase/firestore';
import { buscarReporteInfoPorAdmision as buscarReporteInfoPorAdmisionBase } from './buscarReporteInfoPorAdmision';

let promesaMedicos = null;

export function obtenerMedicosCacheados(db, forzar = false) {
  if (!forzar && promesaMedicos) return promesaMedicos;

  promesaMedicos = (async () => {
    try {
      const snap = await getDocs(collection(db, 'maestros_prestadores'));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => (p.estado || 'ACTIVO').toUpperCase() !== 'INACTIVO');
    } catch (err) {
      promesaMedicos = null; 
      throw err;
    }
  })();

  return promesaMedicos;
}

const cachePorTipo = new Map();

export function obtenerCodigosCacheados(db, tipo, forzar = false) {
  if (!forzar && cachePorTipo.has(tipo)) return cachePorTipo.get(tipo);

  const promesa = (async () => {
    try {
      const q = query(collection(db, 'maestros_codigos'), where('tipo', '==', tipo));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
      cachePorTipo.delete(tipo);
      throw err;
    }
  })();

  cachePorTipo.set(tipo, promesa);
  return promesa;
}

const cacheReportes = new Map(); 

export function buscarReporteInfoPorAdmisionCacheado(db, admisionId, forzar = false) {
  const clave = String(admisionId || '').trim();
  if (!clave) return Promise.resolve(null);

  if (!forzar && cacheReportes.has(clave)) return cacheReportes.get(clave);

  const promesa = buscarReporteInfoPorAdmisionBase(db, clave).catch((err) => {
    cacheReportes.delete(clave); 
    throw err;
  });

  cacheReportes.set(clave, promesa);
  return promesa;
}

export function invalidarReporteAdmision(admisionId) {
  const clave = String(admisionId || '').trim();
  if (clave) cacheReportes.delete(clave);
}