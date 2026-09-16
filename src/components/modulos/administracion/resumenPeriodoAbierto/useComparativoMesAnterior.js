import { useEffect, useState } from 'react';
import { MODULOS, MESES } from '../controlMensual/constants';
import { obtenerSnapshotMensual } from '../controlMensual/snapshotMensual';

const mesAnteriorDe = (mesId, anioStr) => {
  const idx = MESES.findIndex(m => m.id === mesId);
  if (idx === -1) return null;
  if (idx === 0) {
    return { mesId: MESES[MESES.length - 1].id, anio: String(Number(anioStr) - 1) };
  }
  return { mesId: MESES[idx - 1].id, anio: anioStr };
};

// Trae el total del mes anterior por módulo leyendo el snapshot guardado en
// `imputaciones_periodos` (una lectura liviana por módulo), en vez de recalcular
// sumando los documentos crudos del mes ya cerrado.
export const useComparativoMesAnterior = (periodoAbiertoInfo) => {
  const [datosPorModulo, setDatosPorModulo] = useState({});
  const [cargando, setCargando] = useState(false);

  const mesAnteriorInfo = periodoAbiertoInfo
    ? mesAnteriorDe(periodoAbiertoInfo.mesId, periodoAbiertoInfo.anio)
    : null;

  useEffect(() => {
    if (!mesAnteriorInfo) return;

    let cancelado = false;
    setCargando(true);

    Promise.all(
      MODULOS.map(async (mod) => {
        const snap = await obtenerSnapshotMensual(mod.id, mesAnteriorInfo.anio, mesAnteriorInfo.mesId);
        return [mod.id, snap];
      })
    ).then((entradas) => {
      if (cancelado) return;
      setDatosPorModulo(Object.fromEntries(entradas));
      setCargando(false);
    });

    return () => { cancelado = true; };
    // Se depende de los primitivos (mesId/anio) y no del objeto mesAnteriorInfo,
    // que es una referencia nueva en cada render y dispararía el efecto sin fin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesAnteriorInfo?.mesId, mesAnteriorInfo?.anio]);

  const mesAnteriorNombre = mesAnteriorInfo
    ? MESES.find(m => m.id === mesAnteriorInfo.mesId)?.nombre
    : null;

  return {
    datosMesAnterior: datosPorModulo,
    cargandoMesAnterior: cargando,
    mesAnteriorInfo: mesAnteriorInfo ? { ...mesAnteriorInfo, nombre: mesAnteriorNombre } : null
  };
};
