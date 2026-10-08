// Cálculos de la pantalla de Estadísticas, en memoria y sin lecturas: todo
// sale de las tuplas ya cargadas (una por admisión–médico–cirugía–empresa,
// ver functions/estadisticas/nucleo.js). Siempre se cuentan admisiones
// DISTINTAS: una admisión con varios ítems o empresas cuenta una vez.

import { SIN_INFORMAR } from './estadisticasConfig';

const SIN_CLAVE = '_';

// Une los documentos de uno o más módulos (y sus partes). En "Todos", una
// admisión presente en dos módulos tiene la misma clave `a` y cuenta una vez.
export const unirDatos = (documentos) => {
  const tuplas = [];
  const nombres = { m: {}, c: {}, e: {} };
  documentos.filter(Boolean).forEach((d) => {
    (d.piezas || [d]).forEach((p) => {
      Object.values(p.t || {}).forEach((t) => { if (t.n > 0) tuplas.push({ ...t, modulo: d.modulo }); });
    });
    ['m', 'c', 'e'].forEach((dim) => Object.assign(nombres[dim], d.nombres?.[dim] || {}));
  });
  return { tuplas, nombres };
};

export const nombreDe = (nombres, dim, clave) =>
  (clave === SIN_CLAVE ? SIN_INFORMAR : nombres?.[dim]?.[clave] || SIN_INFORMAR);

const distintas = (tuplas) => new Set(tuplas.map((t) => t.a)).size;
const clavesInformadas = (tuplas, dim) => new Set(tuplas.map((t) => t[dim]).filter((k) => k !== SIN_CLAVE)).size;

export const indicadores = (tuplas) => ({
  admisiones: distintas(tuplas),
  sinId: distintas(tuplas.filter((t) => t.s)),
  m: clavesInformadas(tuplas, 'm'),
  c: clavesInformadas(tuplas, 'c'),
  e: clavesInformadas(tuplas, 'e'),
});

// clave -> cantidad de admisiones distintas.
export const conteoPor = (tuplas, dim) => {
  const sets = new Map();
  tuplas.forEach((t) => {
    if (!sets.has(t[dim])) sets.set(t[dim], new Set());
    sets.get(t[dim]).add(t.a);
  });
  return new Map([...sets].map(([k, s]) => [k, s.size]));
};

export const variacion = (actual, anterior) => (anterior > 0 ? ((actual - anterior) / anterior) * 100 : null);

// Filas de una tabla: período elegido vs. anterior, para las claves de
// cualquiera de los dos. `total` = admisiones distintas del período (no la
// suma de filas: una admisión con dos médicos aparece en ambos).
export const filasComparadas = (dim, actual, anterior) => {
  const cActual = conteoPor(actual.tuplas, dim);
  const cAnterior = conteoPor(anterior.tuplas, dim);
  const total = distintas(actual.tuplas);
  const claves = new Set([...cActual.keys(), ...cAnterior.keys()]);
  return [...claves].map((clave) => {
    const a = cActual.get(clave) || 0;
    const b = cAnterior.get(clave) || 0;
    return {
      clave,
      nombre: clave === SIN_CLAVE ? SIN_INFORMAR : actual.nombres?.[dim]?.[clave] || anterior.nombres?.[dim]?.[clave] || SIN_INFORMAR,
      actual: a,
      anterior: b,
      diferencia: a - b,
      variacion: variacion(a, b),
      participacion: total ? (a / total) * 100 : 0,
    };
  });
};

// Cruce: dentro de las admisiones de `clave` en `dim`, cuántas por `otra`.
export const filasCruce = (dim, clave, otra, actual, anterior) => filasComparadas(
  otra,
  { ...actual, tuplas: actual.tuplas.filter((t) => t[dim] === clave) },
  { ...anterior, tuplas: anterior.tuplas.filter((t) => t[dim] === clave) },
);

const texto = (v) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const filtrarFilas = (filas, busqueda) => {
  const q = texto(busqueda).trim();
  return q ? filas.filter((f) => texto(f.nombre).includes(q)) : filas;
};

// Orden: columna y sentido; nulos (variación sin período anterior) al final.
export const ordenarFilas = (filas, columna = 'actual', sentido = 'desc') => {
  const factor = sentido === 'asc' ? 1 : -1;
  return [...filas].sort((x, y) => {
    const a = x[columna];
    const b = y[columna];
    if (a == null && b == null) return x.nombre.localeCompare(y.nombre, 'es');
    if (a == null) return 1;
    if (b == null) return -1;
    if (typeof a === 'string') return factor * a.localeCompare(b, 'es') || 0;
    return factor * (a - b) || x.nombre.localeCompare(y.nombre, 'es');
  });
};
