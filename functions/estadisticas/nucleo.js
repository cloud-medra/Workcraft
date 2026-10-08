// Estadísticas (Administración → Estadísticas): lógica pura, sin Firestore.
// La usan los triggers, el recálculo nocturno, el recálculo manual y el
// script inicial (functions/scripts/generarEstadisticas.js). La prueban
// src/components/modulos/administracion/estadisticas/*.test.js.
//
// Base: los documentos imputados de cada período
//   {coleccion}/{anio}/meses/{mesId}/documentos/{itemId}
// (lo mismo que cuentan Período Actual y Control Mensual). Cada documento es
// un ítem; de él se toma la admisión, el médico, la cirugía y la empresa.
//
// El documento de estadísticas guarda "tuplas": una por combinación distinta
// de admisión–médico–cirugía–empresa, con `n` = cuántos ítems la aportan.
// Con las tuplas la pantalla calcula todos los totales y cruces contando
// admisiones distintas, y los triggers pueden sumar y restar sin releer.

const crypto = require('crypto');

// Bloque 1 (Implantes, Consignación, Hemodinamia). Para sumar Laboratorio y
// Vacunatorio (bloque 2) se agrega su entrada acá, con sus campos.
// `precio`: precio unitario guardado en el ítem al cargarlo (sin IVA ni
// recargo); el monto es cantidad × precio. `descripcionCodigo`: descripción
// del producto (descriptorAuto del maestro, copiada al ítem).
const FUENTES = {
  implantes: { coleccion: 'implantes_imputadas', bloque: 'consumos', campos: { cirugia: 'descripcion', paciente: 'paciente', precio: 'precio', descripcionCodigo: 'descriptorAuto' } },
  consignacion: { coleccion: 'consignacion_imputadas', bloque: 'consumos', campos: { cirugia: 'descripcionPabellon', paciente: 'nombre', precio: 'costo', descripcionCodigo: 'descripcion' } },
  hemodinamia: { coleccion: 'hemodinamia_imputadas', bloque: 'consumos', campos: { cirugia: 'descripcion', paciente: 'paciente', precio: 'precio', descripcionCodigo: 'descriptorAuto' } },
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const COLECCION_ESTADISTICAS = 'estadisticas';
const ID_INDICE = '_indice';
// 2: montos (documento {id}__montos) y códigos ({id}__codigos).
const VERSION = 2;
const SUFIJO_CODIGOS = '__codigos';
const SUFIJO_MONTOS = '__montos';
// Tope por documento (Firestore: 1 MiB). Sobre esto las tuplas se reparten
// en partes ({id}__p1, {id}__p2…), agrupadas por admisión.
const TAMANO_MAXIMO_PARTE = 750 * 1024;

const SIN_INFORMAR = 'SIN INFORMAR';
const VALORES_VACIOS = new Set(['', 'P', '-', 'CARGANDO...', 'CARGANDO', 'SIN INFORMAR', 'N/A', 'NA']);

const mesNumero = (mesId) => MESES.indexOf(String(mesId || '').toLowerCase()) + 1;
const claveMes = (anio, mesId) => {
  const n = mesNumero(mesId);
  return n ? `${anio}-${String(n).padStart(2, '0')}` : null;
};
const idEstadistica = (modulo, anio, mesId) => `${modulo}_${claveMes(anio, mesId)}`;
const idParte = (idBase, parte) => (parte ? `${idBase}__p${parte}` : idBase);

// Texto para mostrar (se conserva la escritura original, sin espacios de más).
const textoVisible = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

// Clave de agrupación: mayúsculas, sin tildes, sin puntuación, espacios
// unificados y sin "DR."/"DRA." al inicio.
const normalizar = (v) => {
  const t = String(v ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[.,;:'"`´()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (VALORES_VACIOS.has(t)) return '';
  return t.replace(/^(DR|DRA|DOCTOR|DOCTORA)\s+/, '').trim();
};

const hash = (t, largo = 10) => crypto.createHash('sha1').update(t).digest('base64url').slice(0, largo);
const claveDe = (norm) => (norm ? hash(norm) : '_');
const tieneId = (id) => normalizar(id) !== '';

// Tupla de un documento imputado. Sin ID, la admisión se identifica por
// paciente + fecha: los ítems de una misma gestión sin ID cuentan como una.
const tuplaDesdeDoc = (modulo, data) => {
  const campos = FUENTES[modulo].campos;
  const id = textoVisible(data.gestionId ?? data.admision);
  const conId = tieneId(id);
  const a = conId ? normalizar(id).replace(/\s/g, '') : `SINID-${hash(`${normalizar(data[campos.paciente])}|${String(data.fecha || '').trim()}`, 12)}`;
  const valores = {
    m: textoVisible(data.medico),
    c: textoVisible(data[campos.cirugia]),
    e: textoVisible(data.empresa),
  };
  const claves = Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, claveDe(normalizar(v))]));
  const tupla = { a, m: claves.m, c: claves.c, e: claves.e, ...(conId ? {} : { s: true }) };
  return {
    clave: hash(`${tupla.a}|${tupla.m}|${tupla.c}|${tupla.e}`, 12),
    tupla,
    // Escritura original de cada nombre (para el diccionario).
    nombres: Object.fromEntries(Object.entries(valores).map(([k, v]) => [k, { [claves[k]]: claves[k] === '_' ? SIN_INFORMAR : v }])),
  };
};

const numero = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const normalizarCodigo = (v) => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const CODIGOS_VACIOS = new Set(['', 'P', '-', 'S/C', 'SC', 'SIN CODIGO', 'NO LLEVA OC']);
// Clave de un precio dentro de un mapa (sin puntos, que separan rutas).
const clavePrecio = (p) => String(Math.round(p * 100) / 100).replace('.', ',');

// Aporte de un documento imputado a las estadísticas: su tupla, su monto y
// su línea de código.
//  - Monto = cantidad × precio unitario (sin IVA ni recargo).
//  - Sub-ítems (contenido de un PAD o lote adicional de una referencia): no
//    tienen código ni precio propios (el PAD / la referencia principal es el
//    que factura). Cuentan para las admisiones, pero no son una línea de
//    código ni cuentan como "sin precio".
//  - Sin código (vacío, "P", "S/C"): línea "Sin código" separada por
//    descripción.
const aporteDesdeDoc = (modulo, data) => {
  const base = tuplaDesdeDoc(modulo, data);
  const campos = FUENTES[modulo].campos;
  const cantidad = numero(data.cantidad);
  const precio = numero(data[campos.precio]);
  const codigoTexto = textoVisible(data.codigo);
  const codigoNorm = normalizarCodigo(codigoTexto);
  const subItem = Boolean(data.padPadreId) || (codigoNorm === 'NO LLEVA OC' && !(precio > 0));
  let linea = null;
  if (!subItem) {
    const descripcion = textoVisible(data[campos.descripcionCodigo]);
    const sinCodigo = CODIGOS_VACIOS.has(codigoNorm);
    const k = sinCodigo ? `SC-${hash(normalizar(descripcion) || '_', 10)}` : hash(codigoNorm, 10);
    linea = {
      clave: hash(`${base.clave}|${k}`, 12),
      datos: { a: base.tupla.a, m: base.tupla.m, c: base.tupla.c, e: base.tupla.e, k },
      codigo: { c: sinCodigo ? '' : codigoTexto, d: VALORES_VACIOS.has(normalizarCodigo(descripcion)) ? '' : descripcion },
      cantidad,
      precio,
    };
  }
  return { ...base, cantidad, precio, monto: cantidad * precio, sinPrecio: !subItem && !(precio > 0), linea };
};

// Huella de lo que un documento aporta: si no cambia, el trigger no escribe.
const huellaAporte = (ap) => (ap
  ? [ap.clave, ap.monto, ap.sinPrecio, ap.linea?.clave, ap.linea?.cantidad, ap.linea?.precio, ap.linea?.codigo.c, ap.linea?.codigo.d].join('|')
  : '');

// Elige, para cada clave, la escritura más frecuente.
const masFrecuente = (conteo) => {
  const resultado = {};
  Object.entries(conteo).forEach(([clave, variantes]) => {
    resultado[clave] = Object.entries(variantes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  });
  return resultado;
};

const contar = (mapa, clave, valor) => {
  mapa[clave] = mapa[clave] || {};
  mapa[clave][valor] = (mapa[clave][valor] || 0) + 1;
};

// Cálculo completo de un período desde sus documentos imputados. Devuelve
// el contenido de los tres documentos: principal (tuplas), códigos (líneas
// admisión × código) y montos (monto de cada tupla y de cada línea, con los
// precios unitarios usados).
const calcularPeriodo = (modulo, docs) => {
  const t = {};
  const conteoNombres = { m: {}, c: {}, e: {} };
  const l = {};
  const conteoCodigos = {};
  const montosT = {};
  const montosL = {};
  let sinPrecio = 0;
  docs.forEach((data) => {
    const ap = aporteDesdeDoc(modulo, data);
    if (!t[ap.clave]) t[ap.clave] = { ...ap.tupla, n: 0 };
    t[ap.clave].n += 1;
    ['m', 'c', 'e'].forEach((dim) => {
      const [[k, v]] = Object.entries(ap.nombres[dim]);
      contar(conteoNombres[dim], k, v);
    });
    montosT[ap.clave] = montosT[ap.clave] || { $: 0, sp: 0 };
    montosT[ap.clave].$ += ap.monto;
    if (ap.sinPrecio) { montosT[ap.clave].sp += 1; sinPrecio += 1; }
    if (ap.linea) {
      const { clave, datos, codigo, cantidad, precio } = ap.linea;
      if (!l[clave]) l[clave] = { ...datos, q: 0, n: 0 };
      l[clave].q += cantidad;
      l[clave].n += 1;
      contar(conteoCodigos, datos.k, JSON.stringify([codigo.c, codigo.d]));
      montosL[clave] = montosL[clave] || { $: 0, p: {} };
      montosL[clave].$ += ap.monto;
      if (precio > 0) montosL[clave].p[clavePrecio(precio)] = (montosL[clave].p[clavePrecio(precio)] || 0) + 1;
    }
  });
  const codigos = Object.fromEntries(Object.entries(masFrecuente(conteoCodigos)).map(([k, v]) => {
    const [c, d] = JSON.parse(v);
    return [k, { c, d }];
  }));
  return {
    t,
    nombres: { m: masFrecuente(conteoNombres.m), c: masFrecuente(conteoNombres.c), e: masFrecuente(conteoNombres.e) },
    documentos: docs.length,
    l,
    codigos,
    montos: { t: montosT, l: montosL },
    sinPrecio,
  };
};

const tamanoAprox = (obj) => Buffer.byteLength(JSON.stringify(obj), 'utf8');

// Reparte un mapa en partes si no cabe en un documento. `grupoDe(clave,
// valor)` da un texto estable para elegir la parte (la pantalla une todas
// las partes, así que cualquier reparto deja los conteos exactos).
const parteDe = (texto, partes) => (partes > 1 ? parseInt(crypto.createHash('md5').update(texto).digest('hex').slice(0, 8), 16) % partes : 0);
const repartirMapa = (mapa, extraBase, grupoDe) => {
  let partes = 1;
  const base = tamanoAprox(extraBase) + 2048;
  while (partes < 50) {
    const grupos = Array.from({ length: partes }, () => ({}));
    Object.entries(mapa).forEach(([k, v]) => { grupos[parteDe(grupoDe(k, v), partes)][k] = v; });
    const maximo = Math.max(...grupos.map((g, i) => tamanoAprox(g) + (i === 0 ? base : 512)));
    if (maximo <= TAMANO_MAXIMO_PARTE) return grupos;
    partes += 1;
  }
  throw new Error('El período no cabe en 50 partes.');
};
// Grupo de reparto de cada documento (los triggers lo usan para saber en qué
// parte está una clave).
const GRUPO = {
  principal: (k, v) => v.a,
  codigos: (k, v) => v.a,
  montosT: (k) => k,
  montosL: (k) => k,
};
// Compatibilidad: tuplas del documento principal.
const repartir = (t, nombres) => repartirMapa(t, nombres, GRUPO.principal);
// Montos: tuplas y líneas en el mismo reparto (por clave).
const repartirMontos = (montos) => {
  const todo = { ...Object.fromEntries(Object.entries(montos.t).map(([k, v]) => [`t:${k}`, v])), ...Object.fromEntries(Object.entries(montos.l).map(([k, v]) => [`l:${k}`, v])) };
  return repartirMapa(todo, {}, (k) => k.slice(2)).map((g) => ({
    t: Object.fromEntries(Object.entries(g).filter(([k]) => k.startsWith('t:')).map(([k, v]) => [k.slice(2), v])),
    l: Object.fromEntries(Object.entries(g).filter(([k]) => k.startsWith('l:')).map(([k, v]) => [k.slice(2), v])),
  }));
};

// Nombres similares que quedaron separados (para el informe del script):
// mismas palabras en otro orden, o diferencia de 1–2 letras.
const distancia = (a, b) => {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const fila = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let previo = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = tmp;
    }
  }
  return fila[b.length];
};
const nombresDudosos = (lista) => {
  const unicos = [...new Set(lista.map(normalizar).filter(Boolean))];
  const pares = [];
  for (let i = 0; i < unicos.length; i += 1) {
    for (let j = i + 1; j < unicos.length; j += 1) {
      const a = unicos[i];
      const b = unicos[j];
      const mismoOrden = a.split(' ').sort().join(' ') === b.split(' ').sort().join(' ');
      if (mismoOrden || (a.length > 5 && distancia(a, b) <= 2)) pares.push([a, b]);
    }
  }
  return pares;
};

module.exports = {
  FUENTES, MESES, COLECCION_ESTADISTICAS, ID_INDICE, VERSION, TAMANO_MAXIMO_PARTE, SIN_INFORMAR, SUFIJO_CODIGOS, SUFIJO_MONTOS,
  mesNumero, claveMes, idEstadistica, idParte, normalizar, tuplaDesdeDoc, aporteDesdeDoc, huellaAporte, clavePrecio, calcularPeriodo,
  repartir, repartirMapa, repartirMontos, parteDe, GRUPO, nombresDudosos, tamanoAprox,
};
