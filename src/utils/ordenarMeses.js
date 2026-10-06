// Orden cronológico de meses para selectores. Los meses llegan en formatos
// distintos según el módulo: '01'..'12' (fechas YYYY-MM-DD), '1'..'12' o
// número (marcadores de guías), o el nombre en minúsculas 'enero'..
// 'diciembre' (ids de cierres_periodos e imputadas). Ordenarlos como texto
// los desordena ('10' antes de '9', 'agosto' antes de 'enero'), así que
// siempre se ordena por número de mes (1 a 12).

const NOMBRES_MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const sinTildes = (texto) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Mes en cualquiera de los formatos de arriba -> número 1..12, o null si
// no se reconoce.
export const numeroDeMes = (mes) => {
  if (typeof mes === 'number') return Number.isInteger(mes) && mes >= 1 && mes <= 12 ? mes : null;
  const texto = sinTildes(String(mes ?? '').trim().toLowerCase());
  if (/^\d{1,2}$/.test(texto)) {
    const n = Number(texto);
    return n >= 1 && n <= 12 ? n : null;
  }
  if (texto === 'setiembre') return 9;
  const indice = NOMBRES_MESES.indexOf(texto);
  return indice >= 0 ? indice + 1 : null;
};

// Comparador para Array.sort: por número de mes; los no reconocidos van al
// final, entre ellos por texto.
export const compararMeses = (a, b) => {
  const na = numeroDeMes(a);
  const nb = numeroDeMes(b);
  if (na !== null && nb !== null && na !== nb) return na - nb;
  if (na === null && nb !== null) return 1;
  if (na !== null && nb === null) return -1;
  return String(a ?? '').localeCompare(String(b ?? ''));
};

// Copia ordenada cronológicamente (no modifica el arreglo recibido).
export const ordenarMeses = (meses) => [...(meses || [])].sort(compararMeses);

// Para selectores con meses de varios años: por año y luego por mes.
// `obtener` extrae { anio, mes } de cada elemento.
export const compararPeriodos = (a, b, obtener = (p) => p) => {
  const pa = obtener(a) || {};
  const pb = obtener(b) || {};
  const diferenciaAnio = (Number(pa.anio) || 0) - (Number(pb.anio) || 0);
  return diferenciaAnio !== 0 ? diferenciaAnio : compararMeses(pa.mes, pb.mes);
};

export const ordenarPeriodos = (periodos, obtener) =>
  [...(periodos || [])].sort((a, b) => compararPeriodos(a, b, obtener));
