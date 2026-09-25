import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { useToast } from '../../../../context/ToastContext';
import {
  aniosDisponiblesPorSondeoImputadas,
  mesesDisponiblesPorSondeoImputadas,
  construirQueryAnioImputadas
} from '../../administracion/cargasConsolidado/hooks/periodoQueryHelpers';

export const TODOS_LOS_MESES = 'TODOS';

const mapearDocs = (snap) => snap.docs.map(d => ({ id: d.id, refPath: d.ref.path, ...d.data() }));

/**
 * Datos base de los Resumen de Implantes / Hemodinamia / Consignación
 * (`{raiz}/{anio}/meses/{mes}/documentos`).
 *
 * Antes cada Resumen escuchaba en vivo TODAS las imputadas de todos los años
 * solo para armar el selector año/mes. Ahora:
 *   - años: sondeo con limit(1) por año candidato;
 *   - meses: sondeo con limit(1) por mes (solo del año elegido);
 *   - documentos: una lectura única al elegir el mes (o el año completo);
 *   - `actualizar()` repite las tres lecturas (botón "Actualizar").
 *
 * El estado de carga se deriva comparando la clave pedida con la cargada,
 * sin setState síncronos dentro de los efectos.
 */
export const useResumenImputadas = (raiz) => {
  const { showToast } = useToast();
  const [anio, setAnioState] = useState('');
  const [mes, setMes] = useState('');
  const [version, setVersion] = useState(0);

  const [anios, setAnios] = useState({ version: null, lista: [] });
  const [meses, setMeses] = useState({ clave: null, lista: [] });
  const [docs, setDocs] = useState({ clave: null, periodo: null, lista: [] });

  // Al cambiar de año se limpia el mes (antes lo hacía un efecto).
  const setAnio = useCallback((valor) => {
    setAnioState(valor);
    setMes('');
  }, []);

  const actualizar = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    let cancelado = false;
    aniosDisponiblesPorSondeoImputadas(raiz)
      .then(lista => { if (!cancelado) setAnios({ version, lista: [...lista].sort() }); })
      .catch(error => {
        console.error(`Error al obtener los años de ${raiz}:`, error);
        showToast('Error al cargar períodos: ' + error.message, 'error');
        if (!cancelado) setAnios(prev => ({ ...prev, version }));
      });
    return () => { cancelado = true; };
  }, [raiz, version, showToast]);

  const claveMeses = anio ? `${anio}|${version}` : null;
  useEffect(() => {
    if (!claveMeses) return undefined;
    let cancelado = false;
    mesesDisponiblesPorSondeoImputadas(raiz, anio)
      .then(lista => {
        if (!cancelado) setMeses({ clave: claveMeses, lista: [...lista].sort((a, b) => a.localeCompare(b)) });
      })
      .catch(error => {
        console.error(`Error al obtener los meses de ${raiz}/${anio}:`, error);
        showToast('Error al cargar períodos: ' + error.message, 'error');
        if (!cancelado) setMeses({ clave: claveMeses, lista: [] });
      });
    return () => { cancelado = true; };
  }, [raiz, anio, claveMeses, showToast]);

  const periodo = anio && mes ? `${anio}|${mes}` : null;
  const claveDocs = periodo ? `${periodo}|${version}` : null;
  useEffect(() => {
    if (!claveDocs) return undefined;
    let cancelado = false;
    const consulta = mes === TODOS_LOS_MESES
      ? construirQueryAnioImputadas(raiz, anio)
      : collection(db, raiz, anio, 'meses', mes, 'documentos');
    getDocs(consulta)
      .then(snap => { if (!cancelado) setDocs({ clave: claveDocs, periodo, lista: mapearDocs(snap) }); })
      .catch(error => {
        console.error(`Error al cargar ${raiz} (${periodo}):`, error);
        showToast('Error al cargar el resumen: ' + error.message, 'error');
        if (!cancelado) setDocs({ clave: claveDocs, periodo, lista: [] });
      });
    return () => { cancelado = true; };
  }, [raiz, anio, mes, periodo, claveDocs, showToast]);

  const cargandoPeriodos = anios.version !== version || (claveMeses !== null && meses.clave !== claveMeses);
  const cargandoDocs = claveDocs !== null && docs.clave !== claveDocs;

  return {
    anio, setAnio,
    mes, setMes,
    aniosDisponibles: anios.lista,
    // Mientras se actualiza se siguen mostrando los meses/documentos del
    // mismo período para que la tabla no parpadee.
    mesesDelAnioActual: anio && meses.clave?.startsWith(`${anio}|`) ? meses.lista : [],
    documentos: periodo && docs.periodo === periodo ? docs.lista : [],
    cargando: cargandoPeriodos || cargandoDocs,
    actualizar
  };
};
