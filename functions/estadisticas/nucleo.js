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
const FUENTES = {
  implantes: { coleccion: 'implantes_imputadas', bloque: 'consumos', campos: { cirugia: 'descripcion', paciente: 'paciente' } },
  consignacion: { coleccion: 'consignacion_imputadas', bloque: 'consumos', campos: { cirugia: 'descripcionPabellon', paciente: 'nombre' } },
  hemodinamia: { coleccion: 'hemodinamia_imputadas', bloque: 'consumos', campos: { cirugia: 'descripcion', paciente: 'paciente' } },
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const COLECCION_ESTADISTICAS = 'estadisticas';
const ID_INDICE = '_indice';
const VERSION = 1;
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

// Elige, para cada clave, la escritura más frecuente.
const masFrecuente = (conteo) => {
  const resultado = {};
  Object.entries(conteo).forEach(([clave, variantes]) => {
    resultado[clave] = Object.entries(variantes).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  });
  return resultado;
};

// Cálculo completo de un período desde sus documentos imputados.
const calcularPeriodo = (modulo, docs) => {
  const t = {};
  const conteoNombres = { m: {}, c: {}, e: {} };
  docs.forEach((data) => {
    const { clave, tupla, nombres } = tuplaDesdeDoc(modulo, data);
    if (!t[clave]) t[clave] = { ...tupla, n: 0 };
    t[clave].n += 1;
    ['m', 'c', 'e'].forEach((dim) => {
      const [[k, v]] = Object.entries(nombres[dim]);
      conteoNombres[dim][k] = conteoNombres[dim][k] || {};
      conteoNombres[dim][k][v] = (conteoNombres[dim][k][v] || 0) + 1;
    });
  });
  return {
    t,
    nombres: { m: masFrecuente(conteoNombres.m), c: masFrecuente(conteoNombres.c), e: masFrecuente(conteoNombres.e) },
    documentos: docs.length,
  };
};

const tamanoAprox = (obj) => Buffer.byteLength(JSON.stringify(obj), 'utf8');

// Reparte las tuplas en partes si no caben en un documento. Todas las tuplas
// de una admisión quedan en la misma parte (parteDe), así los conteos de
// admisiones distintas siguen exactos al sumar las partes.
const parteDe = (a, partes) => (partes > 1 ? parseInt(crypto.createHash('md5').update(a).digest('hex').slice(0, 8), 16) % partes : 0);
const repartir = (t, nombres) => {
  let partes = 1;
  const base = tamanoAprox(nombres) + 2048;
  while (partes < 50) {
    const grupos = Array.from({ length: partes }, () => ({}));
    Object.entries(t).forEach(([k, v]) => { grupos[parteDe(v.a, partes)][k] = v; });
    const maximo = Math.max(...grupos.map((g, i) => tamanoAprox(g) + (i === 0 ? base : 512)));
    if (maximo <= TAMANO_MAXIMO_PARTE) return grupos;
    partes += 1;
  }
  throw new Error('El período no cabe en 50 partes.');
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
  FUENTES, MESES, COLECCION_ESTADISTICAS, ID_INDICE, VERSION, TAMANO_MAXIMO_PARTE, SIN_INFORMAR,
  mesNumero, claveMes, idEstadistica, idParte, normalizar, tuplaDesdeDoc, calcularPeriodo,
  repartir, parteDe, nombresDudosos, tamanoAprox,
};
