// Período de imputación de un ítem de Implantes / Hemodinamia.
//
// Cada ítem guarda su período de CARGA (periodoAnio/periodoMes: el abierto
// cuando se agregó en Cargas). Al "Solicitar", el ítem se imputa en el
// período ABIERTO EN ESE MOMENTO ({modulo}_imputadas/{anio}/meses/{mes}),
// que puede ser otro. Una vez solicitado, ese es el período del ítem: editar
// la gestión debe resincronizar, borrar y validar el candado contra él, no
// contra el de carga (antes se usaba el de carga y se duplicaban o quedaban
// huérfanas imputaciones en Período Actual).
//
// El período de solicitud se guarda en el bloque (periodoSolicitudAnio /
// periodoSolicitudMes). Los bloques solicitados antes de ese campo solo
// tienen el texto `periodo` ("Octubre 2026"), del que se deduce.

import { MESES } from '../../administracion/controlMensual/constants';

const sinTildes = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');

export const esBloqueSolicitado = (bloque) => String(bloque?.solicitud || '').trim().toUpperCase() === 'SOLICITADO';

// "Octubre 2026" -> { anio: '2026', mes: 'octubre' } (null si no se entiende).
export const periodoDesdeTexto = (texto) => {
  const m = sinTildes(texto).trim().toLowerCase().match(/^([a-z]+)\s+(\d{4})$/);
  if (!m) return null;
  const mes = MESES.find((x) => x.id === m[1]);
  return mes ? { anio: m[2], mes: mes.id } : null;
};

export const periodoSolicitudDeBloque = (bloque) => {
  if (bloque?.periodoSolicitudAnio && bloque?.periodoSolicitudMes) {
    return { anio: String(bloque.periodoSolicitudAnio), mes: bloque.periodoSolicitudMes };
  }
  return periodoDesdeTexto(bloque?.periodo);
};

// Campos que se escriben en el bloque al solicitarlo.
export const camposPeriodoSolicitud = (periodo) => ({
  periodoSolicitudAnio: String(periodo.anio),
  periodoSolicitudMes: periodo.mes,
});

// Período donde está (o estará) imputado el ítem: el de solicitud si el
// bloque ya fue solicitado; si no, el de carga del ítem. null si no hay.
export const periodoImputacion = (bloque, item) => {
  if (esBloqueSolicitado(bloque)) {
    const p = periodoSolicitudDeBloque(bloque);
    if (p) return p;
  }
  return item?.periodoAnio && item?.periodoMes ? { anio: item.periodoAnio, mes: item.periodoMes } : null;
};

// Períodos distintos de imputación de los ítems de un bloque (candado). Un
// bloque solicitado tiene uno solo: el de solicitud.
export const periodosImputacionDeBloque = (bloque, items) => {
  if (esBloqueSolicitado(bloque)) {
    const p = periodoSolicitudDeBloque(bloque);
    if (p) return [p];
  }
  const mapa = new Map();
  (items || []).forEach((it) => {
    const p = periodoImputacion(bloque, it);
    if (p) mapa.set(`${p.anio}__${p.mes}`, p);
  });
  return [...mapa.values()];
};

// Datos de la solicitud guardados en el bloque. Deben viajar con él cuando
// el documento se recrea en otra ruta (cambio de ID, fecha o empresa); si
// no, el bloque seguiría SOLICITADO pero sin saber en qué período.
const CAMPOS_SOLICITUD = ['periodo', 'periodoSolicitudAnio', 'periodoSolicitudMes', 'fechaSolicitud', 'solicitadoPor'];
export const camposSolicitudDe = (bloque) =>
  Object.fromEntries(CAMPOS_SOLICITUD.filter((k) => bloque?.[k] != null && bloque[k] !== '').map((k) => [k, bloque[k]]));

// Bloque con lo necesario para periodoImputacion al guardar desde el
// detalle: el estado de solicitud que se guarda y los datos de solicitud
// del documento en Firestore (`original`), que el detalle no siempre trae.
export const bloqueParaImputacion = (registro, original) => ({
  ...camposSolicitudDe(registro),
  ...camposSolicitudDe(original),
  solicitud: registro?.solicitud ?? original?.solicitud,
});
