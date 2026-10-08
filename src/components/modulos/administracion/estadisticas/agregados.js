// Cálculos de la pantalla de Estadísticas, en memoria y sin lecturas: todo
// sale de las tuplas ya cargadas (una por admisión–médico–cirugía–empresa,
// ver functions/estadisticas/nucleo.js). Siempre se cuentan admisiones
// DISTINTAS: una admisión con varios ítems o empresas cuenta una vez.

import { SIN_INFORMAR, SIN_CODIGO } from './estadisticasConfig';

const SIN_CLAVE = '_';

// Une el mapa `campo` de todas las partes de un documento complementario.
const mapaDe = (doc, campo) => {
  const mapa = {};
  (doc?.piezas || (doc ? [doc] : [])).forEach((p) => Object.assign(mapa, p[campo] || {}));
  return mapa;
};

// Líneas de código (una por admisión × código) de los documentos __codigos,
// con sus montos y precios si se cargaron los __montos.
export const unirCodigos = (documentos, montos = []) => {
  const lineas = [];
  const codigos = {};
  documentos.forEach((d, i) => {
    if (!d) return;
    const ml = mapaDe(montos[i], 'l');
    Object.assign(codigos, d.codigos || {});
    Object.entries(mapaDe(d, 'l')).forEach(([clave, l]) => {
      if (l.n > 0) lineas.push({ ...l, modulo: d.modulo, $: ml[clave]?.$ || 0, p: ml[clave]?.p || {} });
    });
  });
  return { lineas, codigos };
};

// Une los documentos de uno o más módulos (y sus partes). En "Todos", una
// admisión presente en dos módulos tiene la misma clave `a` y cuenta una vez.
// `montos` (opcional, mismo orden que `documentos`): documentos __montos;
// cada tupla recibe su monto `$` y sus ítems sin precio `sp`.
export const unirDatos = (documentos, montos = []) => {
  const tuplas = [];
  const nombres = { m: {}, c: {}, e: {} };
  documentos.forEach((d, i) => {
    if (!d) return;
    const mt = mapaDe(montos[i], 't');
    (d.piezas || [d]).forEach((p) => {
      Object.entries(p.t || {}).forEach(([clave, t]) => {
        if (t.n > 0) tuplas.push({ ...t, modulo: d.modulo, $: mt[clave]?.$ || 0, sp: mt[clave]?.sp || 0 });
      });
    });
    ['m', 'c', 'e'].forEach((dim) => Object.assign(nombres[dim], d.nombres?.[dim] || {}));
  });
  return { tuplas, nombres };
};

export const nombreDe = (nombres, dim, clave) =>
  (clave === SIN_CLAVE ? SIN_INFORMAR : nombres?.[dim]?.[clave] || SIN_INFORMAR);

const distintas = (tuplas) => new Set(tuplas.map((t) => t.a)).size;
const clavesInformadas = (tuplas, dim) => new Set(tuplas.map((t) => t[dim]).filter((k) => k !== SIN_CLAVE)).size;

const sumaDe = (lista, campo) => lista.reduce((s, x) => s + (x[campo] || 0), 0);

export const indicadores = (tuplas) => ({
  admisiones: distintas(tuplas),
  sinId: distintas(tuplas.filter((t) => t.s)),
  m: clavesInformadas(tuplas, 'm'),
  c: clavesInformadas(tuplas, 'c'),
  e: clavesInformadas(tuplas, 'e'),
  monto: sumaDe(tuplas, '$'),
  sinPrecio: sumaDe(tuplas, 'sp'),
});

const sumaPor = (lista, dim, campo) => {
  const mapa = new Map();
  lista.forEach((x) => mapa.set(x[dim], (mapa.get(x[dim]) || 0) + (x[campo] || 0)));
  return mapa;
};

// Columnas de monto de una fila (período vs. anterior).
const camposMonto = (a, b) => ({ monto: a, montoAnterior: b, montoDiferencia: a - b, montoVariacion: variacion(a, b) });

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
  const mActual = sumaPor(actual.tuplas, dim, '$');
  const mAnterior = sumaPor(anterior.tuplas, dim, '$');
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
      ...camposMonto(mActual.get(clave) || 0, mAnterior.get(clave) || 0),
    };
  });
};

// Precios unitarios usados (con cantidad de ítems), unidos de varias líneas.
const preciosDe = (lineas) => {
  const precios = {};
  lineas.forEach((l) => Object.entries(l.p || {}).forEach(([k, n]) => {
    if (n > 0) precios[k] = (precios[k] || 0) + n;
  }));
  return Object.keys(precios).map((k) => Number(k.replace(',', '.'))).sort((x, y) => x - y);
};

// Filas de la pestaña Códigos: cantidad usada (= `actual`, para ordenar y el
// Top 10), admisiones distintas, monto y precio unitario promedio (monto /
// cantidad). Si el código tuvo distintos precios, `precioMin`/`precioMax`.
export const filasCodigos = (actual, anterior) => {
  const porCodigo = (lineas) => {
    const mapa = new Map();
    lineas.forEach((l) => {
      if (!mapa.has(l.k)) mapa.set(l.k, []);
      mapa.get(l.k).push(l);
    });
    return mapa;
  };
  const pa = porCodigo(actual.lineas);
  const pb = porCodigo(anterior.lineas);
  const claves = new Set([...pa.keys(), ...pb.keys()]);
  return [...claves].map((k) => {
    const la = pa.get(k) || [];
    const lb = pb.get(k) || [];
    const info = actual.codigos?.[k] || anterior.codigos?.[k] || {};
    const cantidad = sumaDe(la, 'q');
    const cantidadAnterior = sumaDe(lb, 'q');
    const monto = sumaDe(la, '$');
    const precios = preciosDe(la);
    return {
      clave: k,
      codigo: info.c || SIN_CODIGO,
      sinCodigo: !info.c,
      descripcion: info.d || '',
      nombre: `${info.c || SIN_CODIGO} ${info.d || ''}`.trim(),
      actual: cantidad,
      anterior: cantidadAnterior,
      diferencia: cantidad - cantidadAnterior,
      variacion: variacion(cantidad, cantidadAnterior),
      admisiones: distintas(la),
      precio: cantidad > 0 && monto > 0 ? monto / cantidad : null,
      precioMin: precios.length > 1 ? precios[0] : null,
      precioMax: precios.length > 1 ? precios[precios.length - 1] : null,
      ...camposMonto(monto, sumaDe(lb, '$')),
    };
  });
};

// Detalle de un código: cantidad, admisiones y monto por médico, cirugía o
// empresa (`otra`).
export const filasCruceCodigo = (k, otra, actual, anterior, nombresActual, nombresAnterior) => {
  const la = actual.lineas.filter((l) => l.k === k);
  const lb = anterior.lineas.filter((l) => l.k === k);
  const qa = sumaPor(la, otra, 'q');
  const qb = sumaPor(lb, otra, 'q');
  const ma = sumaPor(la, otra, '$');
  const mb = sumaPor(lb, otra, '$');
  const adm = conteoPor(la, otra);
  const claves = new Set([...qa.keys(), ...qb.keys()]);
  return [...claves].map((clave) => {
    const a = qa.get(clave) || 0;
    const b = qb.get(clave) || 0;
    return {
      clave,
      nombre: clave === SIN_CLAVE ? SIN_INFORMAR : nombresActual?.[otra]?.[clave] || nombresAnterior?.[otra]?.[clave] || SIN_INFORMAR,
      actual: a,
      anterior: b,
      diferencia: a - b,
      variacion: variacion(a, b),
      admisiones: adm.get(clave) || 0,
      ...camposMonto(ma.get(clave) || 0, mb.get(clave) || 0),
    };
  });
};

// Detalle de un médico, cirugía o empresa: los códigos que usó.
export const codigosDe = (dim, clave, actual, anterior) => filasCodigos(
  { ...actual, lineas: actual.lineas.filter((l) => l[dim] === clave) },
  { ...anterior, lineas: anterior.lineas.filter((l) => l[dim] === clave) },
);

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
