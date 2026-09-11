import { collectionGroup, collection, query, where, getDocs } from 'firebase/firestore';

const NOMBRE_SUBCOL_DETALLES_GUIAS = 'detalles';
const COL_BASE = 'consignacion_registros';
const COL_MAESTROS_CODIGOS = 'maestros_codigos';
const CODIGOS_EXCLUIDOS_GUIA = ['KITBYPASSTCRL2'];

const normalizarCodigo = (c) => (c || '').trim().toUpperCase();
const estaExcluido = (codigo) => CODIGOS_EXCLUIDOS_GUIA.includes(normalizarCodigo(codigo));

const trocear = (arr, tamano) => {
  const bloques = [];
  for (let i = 0; i < arr.length; i += tamano) {
    bloques.push(arr.slice(i, i + tamano));
  }
  return bloques;
};

const cacheGuias = new Map();
const cacheMaestros = new Map();
const referenciasResueltas = new Set();

/**
 * Busca (y cachea) la guía de despacho asociada a un N° de Documento.
 * Solo hace la lectura a Firestore la PRIMERA vez que se pide ese
 * número; llamadas posteriores devuelven el resultado ya resuelto sin
 * gastar lecturas nuevas.
 *
 * @param {boolean} forzar - si es true, ignora la caché y vuelve a
 * consultar Firestore (útil para un botón "Actualizar" cuando el
 * usuario sabe que la guía pudo haberse creado recién).
 */
export function resolverGuiaCacheada(db, numeroDocumento, forzar = false) {
  const clave = (numeroDocumento || '').trim();
  if (!clave) return Promise.resolve(null);

  if (!forzar && cacheGuias.has(clave)) {
    return cacheGuias.get(clave);
  }

  const promesa = (async () => {
    try {
      const q = query(
        collectionGroup(db, NOMBRE_SUBCOL_DETALLES_GUIAS),
        where('numeroDocumento', '==', clave)
      );
      const snap = await getDocs(q);

      const docsConsignacion = snap.docs.filter((d) => d.ref.path.startsWith(`${COL_BASE}/`));

      if (docsConsignacion.length === 0) return null;

      const productos = docsConsignacion
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((p) => !estaExcluido(p.codigo));
      const primero = docsConsignacion[0].data();

      return {
        numeroGuia: primero.numeroGuia || '',
        numeroDocumento: primero.numeroDocumento || clave,
        fechaEmision: primero.fechaEmision || '',
        productos
      };
    } catch (err) {
      console.error('Error al resolver guía cacheada:', clave, err);
      cacheGuias.delete(clave);
      return null;
    }
  })();

  cacheGuias.set(clave, promesa);
  return promesa;
}

export async function resolverMaestroCacheado(db, referencia) {
  const clave = (referencia || '').trim();
  if (!clave) return null;
  if (cacheMaestros.has(clave)) return cacheMaestros.get(clave);

  try {
    const q = query(collection(db, COL_MAESTROS_CODIGOS), where('referencia', '==', clave));
    const snap = await getDocs(q);
    const data = snap.docs[0]?.data();
    const vinculo = data
      ? {
          codigo: data.codigo || '',
          descripcion: data.descriptorEmpresa || data.descriptorAuto || '',
          tipo: data.tipo || '',
          empresa: data.empresa || ''
        }
      : null;
    cacheMaestros.set(clave, vinculo);
    return vinculo;
  } catch (err) {
    console.error('Error al resolver maestro cacheado:', clave, err);
    return null;
  }
}

export async function resolverMaestrosCacheados(db, referencias) {
  const unicas = [...new Set((referencias || []).map((r) => (r || '').trim()).filter(Boolean))];
  const pendientesPorConsultar = unicas.filter((r) => !referenciasResueltas.has(r));

  if (pendientesPorConsultar.length > 0) {
    const bloques = trocear(pendientesPorConsultar, 10);
    for (const bloque of bloques) {
      try {
        const q = query(collection(db, COL_MAESTROS_CODIGOS), where('referencia', 'in', bloque));
        const snap = await getDocs(q);
        const encontrados = new Set();
        snap.docs.forEach((d) => {
          const data = d.data();
          if (data.referencia) {
            cacheMaestros.set(data.referencia, {
              codigo: data.codigo || '',
              descripcion: data.descriptorEmpresa || data.descriptorAuto || '',
              tipo: data.tipo || '',
              empresa: data.empresa || ''
            });
            encontrados.add(data.referencia);
          }
        });
        bloque.forEach((r) => {
          if (!encontrados.has(r)) cacheMaestros.set(r, cacheMaestros.get(r) ?? null);
          referenciasResueltas.add(r);
        });
      } catch (err) {
        console.error('Error al resolver bloque de maestros_codigos:', bloque, err);
      }
    }
  }

  const resultado = {};
  unicas.forEach((r) => {
    resultado[r] = cacheMaestros.get(r) ?? null;
  });
  return resultado;
}

export function invalidarCacheGuia(numeroDocumento) {
  const clave = (numeroDocumento || '').trim();
  if (clave) cacheGuias.delete(clave);
}

export { estaExcluido, normalizarCodigo };