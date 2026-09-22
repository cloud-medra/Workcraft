// Cálculos puros (sin dependencias externas) para la Hoja 2 ("Información
// del Día") del carrusel de Agenda del Dashboard. Todo se calcula sobre la
// fecha que reciben las funciones — quien las llama decide si es "hoy" o la
// fecha seleccionada en el calendario.

const MS_POR_DIA = 24 * 60 * 60 * 1000;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const iniciarMedianoche = (fecha) => {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const esBisiesto = (anio) => (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;

// "22 de Septiembre de 2026"
export const obtenerFechaCompleta = (fecha) => {
  const mes = MESES[fecha.getMonth()];
  const mesCapitalizado = mes.charAt(0).toUpperCase() + mes.slice(1);
  return `${fecha.getDate()} de ${mesCapitalizado} de ${fecha.getFullYear()}`;
};

export const obtenerDiaSemana = (fecha) => DIAS_SEMANA[fecha.getDay()];

// { diaDelAnio: 265, totalDias: 365, porcentaje: 72.6 }
export const obtenerDiaDelAnio = (fecha) => {
  const inicioAnio = new Date(fecha.getFullYear(), 0, 1);
  const f = iniciarMedianoche(fecha);
  const diaDelAnio = Math.round((f - inicioAnio) / MS_POR_DIA) + 1;
  const totalDias = esBisiesto(fecha.getFullYear()) ? 366 : 365;
  const porcentaje = (diaDelAnio / totalDias) * 100;
  return { diaDelAnio, totalDias, porcentaje };
};

// Semana del año simple (no ISO-8601): semana = día del año / 7, redondeado
// hacia arriba — alcanza para mostrar "Semana 38 de 52" sin la complejidad
// de la definición ISO (que puede asignar el 1 de enero a la última semana
// del año anterior).
export const obtenerSemanaDelAnio = (fecha) => {
  const { diaDelAnio, totalDias } = obtenerDiaDelAnio(fecha);
  const semana = Math.ceil(diaDelAnio / 7);
  const totalSemanas = Math.ceil(totalDias / 7);
  return { semana, totalSemanas };
};

// Estaciones del año para Chile (hemisferio sur), con fechas fijas de
// cambio (21 de cada mes de cambio) — no usa el instante astronómico real
// del solsticio/equinoccio (que varía en horas entre el 20 y 23 según el
// año), así que en la fecha límite exacta puede desfasarse por hasta ~1 día
// respecto al cambio astronómico real.
export const obtenerEstacionChile = (fecha) => {
  const f = iniciarMedianoche(fecha);
  const y = f.getFullYear();

  const limites = [
    { nombre: 'Verano', inicio: new Date(y - 1, 11, 21) },
    { nombre: 'Otoño', inicio: new Date(y, 2, 21) },
    { nombre: 'Invierno', inicio: new Date(y, 5, 21) },
    { nombre: 'Primavera', inicio: new Date(y, 8, 21) },
    { nombre: 'Verano', inicio: new Date(y, 11, 21) },
    { nombre: 'Otoño', inicio: new Date(y + 1, 2, 21) }
  ];

  for (let i = 0; i < limites.length - 1; i++) {
    if (f >= limites[i].inicio && f < limites[i + 1].inicio) {
      const diasRestantes = Math.round((limites[i + 1].inicio - f) / MS_POR_DIA);
      return {
        nombre: limites[i].nombre,
        diasRestantes,
        fechaCambio: limites[i + 1].inicio,
        proximaEstacion: limites[i + 1].nombre
      };
    }
  }

  // No debería alcanzarse — los 6 límites cubren cualquier fecha del año.
  return { nombre: 'Verano', diasRestantes: 0, fechaCambio: f, proximaEstacion: 'Otoño' };
};

// Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario
// gregoriano) — de acá se derivan Viernes y Sábado Santo, los únicos
// feriados chilenos verdaderamente móviles.
export const calcularDomingoPascua = (anio) => {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = marzo, 4 = abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(anio, mes - 1, dia);
};

// Feriados chilenos de fecha FIJA. No incluye:
// - Día Nacional de los Pueblos Indígenas (depende del solsticio de
//   invierno astronómico exacto: 20, 21 o 22 de junio según el año).
// - Feriados que la ley permite "trasladar" al lunes más cercano por
//   decreto en años puntuales (San Pedro y San Pablo, Encuentro de Dos
//   Mundos, Iglesias Evangélicas) — acá siempre se calculan en su fecha
//   original, no en la trasladada.
const FERIADOS_FIJOS = [
  { mes: 1, dia: 1, nombre: 'Año Nuevo' },
  { mes: 5, dia: 1, nombre: 'Día Nacional del Trabajo' },
  { mes: 5, dia: 21, nombre: 'Día de las Glorias Navales' },
  { mes: 6, dia: 29, nombre: 'San Pedro y San Pablo' },
  { mes: 7, dia: 16, nombre: 'Virgen del Carmen' },
  { mes: 8, dia: 15, nombre: 'Asunción de la Virgen' },
  { mes: 9, dia: 18, nombre: 'Independencia Nacional' },
  { mes: 9, dia: 19, nombre: 'Día de las Glorias del Ejército' },
  { mes: 10, dia: 12, nombre: 'Encuentro de Dos Mundos' },
  { mes: 10, dia: 31, nombre: 'Día de las Iglesias Evangélicas y Protestantes' },
  { mes: 11, dia: 1, nombre: 'Día de Todos los Santos' },
  { mes: 12, dia: 8, nombre: 'Inmaculada Concepción' },
  { mes: 12, dia: 25, nombre: 'Navidad' }
];

const esMismoDia = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Devuelve el nombre del feriado si `fecha` es uno (fijo o Semana Santa),
// o `null` si no lo es.
export const obtenerFeriadoChile = (fecha) => {
  const mes = fecha.getMonth() + 1;
  const dia = fecha.getDate();

  const fijo = FERIADOS_FIJOS.find(f => f.mes === mes && f.dia === dia);
  if (fijo) return fijo.nombre;

  const pascua = calcularDomingoPascua(fecha.getFullYear());
  const viernesSanto = new Date(pascua);
  viernesSanto.setDate(pascua.getDate() - 2);
  const sabadoSanto = new Date(pascua);
  sabadoSanto.setDate(pascua.getDate() - 1);

  if (esMismoDia(fecha, viernesSanto)) return 'Viernes Santo';
  if (esMismoDia(fecha, sabadoSanto)) return 'Sábado Santo';

  return null;
};
