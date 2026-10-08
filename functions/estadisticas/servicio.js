// Estadísticas: lectura y escritura en Firestore (Admin SDK). La lógica pura
// está en ./nucleo.js. Todo escribe en estadisticas/{modulo}_{AAAA-MM}
// (+ partes {id}__pN si un período no cabe en un documento) y en el índice
// estadisticas/_indice, que la pantalla lee para armar el selector de
// períodos con una sola lectura.

const { FieldValue } = require('firebase-admin/firestore');
const {
  FUENTES, COLECCION_ESTADISTICAS, ID_INDICE, VERSION,
  claveMes, idEstadistica, idParte, calcularPeriodo, repartir, parteDe, tuplaDesdeDoc,
} = require('./nucleo');

const ESTADOS_ABIERTOS = ['ABIERTO', 'REABIERTO'];

const refEstadistica = (db, id) => db.collection(COLECCION_ESTADISTICAS).doc(id);
const refIndice = (db) => refEstadistica(db, ID_INDICE);

const leerDocumentosPeriodo = async (db, modulo, anio, mesId) => {
  const snap = await db.collection(FUENTES[modulo].coleccion).doc(String(anio))
    .collection('meses').doc(mesId).collection('documentos').get();
  return snap.docs.map((d) => d.data());
};

const estadoCierre = async (db, modulo, anio, mesId) => {
  const snap = await db.collection('cierres_periodos').doc(`${anio}_${mesId}_${modulo}`).get();
  return snap.exists ? snap.data().estado || null : null;
};

const entradaIndice = (modulo, anio, mesId, datos) => ({
  periodos: { [modulo]: { [claveMes(anio, mesId)]: { anio: String(anio), mes: mesId, ...datos } } },
});

// Recalcula un período completo desde sus documentos imputados (lecturas =
// cantidad de ítems del período + 1). `definitivo` undefined = conservar el
// estado que tenía. `reiniciarCambios` pone en 0 los cambios posteriores al
// cierre (cierre y recálculo manual).
const recalcularPeriodo = async (db, modulo, anio, mesId, { definitivo, origen, usuario = null, reiniciarCambios = false } = {}) => {
  const id = idEstadistica(modulo, anio, mesId);
  if (!id || !FUENTES[modulo]) throw new Error(`Período inválido: ${modulo} ${anio} ${mesId}`);
  const [docs, previoSnap] = await Promise.all([
    leerDocumentosPeriodo(db, modulo, anio, mesId),
    refEstadistica(db, id).get(),
  ]);
  const previo = previoSnap.exists ? previoSnap.data() : {};
  const { t, nombres, documentos } = calcularPeriodo(modulo, docs);
  const grupos = repartir(t, nombres);
  const esDefinitivo = definitivo === undefined ? Boolean(previo.definitivo) : definitivo;
  const ahora = FieldValue.serverTimestamp();

  const batch = db.batch();
  batch.set(refEstadistica(db, id), {
    modulo,
    bloque: FUENTES[modulo].bloque,
    anio: String(anio),
    mes: mesId,
    periodo: claveMes(anio, mesId),
    version: VERSION,
    definitivo: esDefinitivo,
    definitivoEl: esDefinitivo ? (definitivo === true ? ahora : previo.definitivoEl || ahora) : null,
    cambiosTrasCierre: reiniciarCambios || !esDefinitivo ? 0 : previo.cambiosTrasCierre || 0,
    actualizadoEl: ahora,
    origen,
    ...(usuario ? { recalculadoPor: usuario, recalculadoEl: ahora } : {}),
    documentos,
    partes: grupos.length,
    nombres,
    t: grupos[0],
  });
  grupos.slice(1).forEach((g, i) => batch.set(refEstadistica(db, idParte(id, i + 1)), { base: id, t: g }));
  for (let p = grupos.length; p < (previo.partes || 1); p += 1) batch.delete(refEstadistica(db, idParte(id, p)));
  batch.set(refIndice(db), entradaIndice(modulo, anio, mesId, { definitivo: esDefinitivo }), { merge: true });
  await batch.commit();
  return { id, documentos, tuplas: Object.keys(t).length, partes: grupos.length, definitivo: esDefinitivo };
};

// Trigger de un documento imputado. Solo escribe si cambió la admisión, el
// médico, la cirugía o la empresa (o si se creó o borró). Costo: 0 si no
// cambió nada de eso; si cambió, 1 lectura + 1 escritura.
const aplicarCambio = async (db, modulo, anio, mesId, antes, despues) => {
  const viejo = antes ? tuplaDesdeDoc(modulo, antes) : null;
  const nuevo = despues ? tuplaDesdeDoc(modulo, despues) : null;
  if (viejo && nuevo && viejo.clave === nuevo.clave) return 'sin-cambio';
  if (!viejo && !nuevo) return 'sin-cambio';

  const id = idEstadistica(modulo, anio, mesId);
  if (!id) return 'mes-invalido';
  const snap = await refEstadistica(db, id).get();

  if (!snap.exists) {
    // Primer movimiento de un período sin estadísticas (o anterior al script):
    // se calcula completo una vez. Si el período ya está cerrado, queda
    // definitivo.
    const estado = await estadoCierre(db, modulo, anio, mesId);
    await recalcularPeriodo(db, modulo, anio, mesId, { definitivo: estado === 'CERRADO', origen: 'inicial' });
    return 'recalculado';
  }

  const actual = snap.data();
  if (actual.definitivo) {
    await snap.ref.update({ cambiosTrasCierre: FieldValue.increment(1), ultimoCambioTrasCierre: FieldValue.serverTimestamp() });
    return 'cambio-tras-cierre';
  }

  const partes = actual.partes || 1;
  const porParte = {};
  const agregar = (parte, clave, valor) => {
    porParte[parte] = porParte[parte] || {};
    porParte[parte][clave] = valor;
  };
  if (viejo) agregar(parteDe(viejo.tupla.a, partes), viejo.clave, { n: FieldValue.increment(-1) });
  if (nuevo) agregar(parteDe(nuevo.tupla.a, partes), nuevo.clave, { ...nuevo.tupla, n: FieldValue.increment(1) });

  // Nombres nuevos para el diccionario (los existentes no se pisan).
  const nombres = {};
  if (nuevo) {
    ['m', 'c', 'e'].forEach((dim) => {
      const [[k, v]] = Object.entries(nuevo.nombres[dim]);
      if (!actual.nombres?.[dim]?.[k]) {
        nombres[dim] = nombres[dim] || {};
        nombres[dim][k] = v;
      }
    });
  }

  const batch = db.batch();
  Object.entries(porParte).forEach(([parte, t]) => {
    const p = Number(parte);
    const datos = p === 0
      ? { t, actualizadoEl: FieldValue.serverTimestamp(), origen: 'trigger', ...(Object.keys(nombres).length ? { nombres } : {}) }
      : { t };
    batch.set(refEstadistica(db, idParte(id, p)), datos, { merge: true });
  });
  if (!porParte[0]) {
    batch.set(snap.ref, { actualizadoEl: FieldValue.serverTimestamp(), origen: 'trigger', ...(Object.keys(nombres).length ? { nombres } : {}) }, { merge: true });
  }
  await batch.commit();
  return 'actualizado';
};

// Cambio de estado de un período (cierres_periodos/{anio}_{mes}_{modulo}).
const aplicarCierre = async (db, antes, despues) => {
  const datos = despues || antes;
  const modulo = datos?.modulo;
  if (!FUENTES[modulo]) return 'otro-modulo';
  const { anio, mes } = datos;
  const estadoAntes = antes?.estado || null;
  const estadoDespues = despues?.estado || null;
  if (estadoAntes === estadoDespues) return 'sin-cambio';

  if (estadoDespues === 'CERRADO') {
    await recalcularPeriodo(db, modulo, anio, mes, { definitivo: true, origen: 'cierre', reiniciarCambios: true });
    return 'congelado';
  }
  if (estadoAntes === 'CERRADO' && ESTADOS_ABIERTOS.includes(estadoDespues)) {
    await recalcularPeriodo(db, modulo, anio, mes, { definitivo: false, origen: 'reapertura', reiniciarCambios: true });
    return 'reabierto';
  }
  if (!estadoAntes && ESTADOS_ABIERTOS.includes(estadoDespues)) {
    // Período nuevo: documento vacío (create falla si ya existe, sin leer).
    const id = idEstadistica(modulo, anio, mes);
    try {
      const batch = db.batch();
      batch.create(refEstadistica(db, id), {
        modulo, bloque: FUENTES[modulo].bloque, anio: String(anio), mes, periodo: claveMes(anio, mes), version: VERSION,
        definitivo: false, definitivoEl: null, cambiosTrasCierre: 0, actualizadoEl: FieldValue.serverTimestamp(),
        origen: 'apertura', documentos: 0, partes: 1, nombres: { m: {}, c: {}, e: {} }, t: {},
      });
      batch.set(refIndice(db), entradaIndice(modulo, anio, mes, { definitivo: false }), { merge: true });
      await batch.commit();
    } catch (err) {
      if (err.code !== 6) throw err; // 6 = ALREADY_EXISTS
    }
    return 'abierto';
  }
  return 'sin-cambio';
};

// Recálculo nocturno: períodos abiertos o reabiertos de los módulos con
// estadísticas (consulta de un solo campo: pocos documentos).
const recalcularAbiertos = async (db) => {
  const snap = await db.collection('cierres_periodos').where('estado', 'in', ESTADOS_ABIERTOS).get();
  const resultados = [];
  for (const d of snap.docs) {
    const { modulo, anio, mes } = d.data();
    if (!FUENTES[modulo]) continue;
    resultados.push(await recalcularPeriodo(db, modulo, anio, mes, { definitivo: false, origen: 'nocturno' }));
  }
  return resultados;
};

module.exports = { recalcularPeriodo, aplicarCambio, aplicarCierre, recalcularAbiertos, leerDocumentosPeriodo, estadoCierre };
