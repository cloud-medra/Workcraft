// Marca de admisiones gestionadas en Implantes (ver nucleo.mjs): la
// mantiene el trigger (index.js) y la carga/repara el script
// scripts/marcarAdmisionesGestionadas.js. Separado del trigger para
// probarlo contra el emulador (tests/emulador).

const { FieldValue } = require('firebase-admin/firestore');
const {
  COLECCION_ADMISIONES, admisionDe, resumenGestion, agregarAdmision, claveGestion,
} = require('./nucleo.mjs');

const ref = (db, admision) => db.collection(COLECCION_ADMISIONES).doc(admision);
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Pone (resumen) o quita (null) una gestión de su admisión, en una
// transacción. Sin gestiones, la admisión se borra (vuelve a "Pendiente").
const actualizar = (db, admision, ruta, resumen) => db.runTransaction(async (t) => {
  const r = ref(db, admision);
  const snap = await t.get(r);
  const previo = snap.exists ? snap.data() : null;
  const gestiones = { ...(previo?.gestiones || {}) };
  const clave = claveGestion(ruta);
  if (resumen) gestiones[clave] = resumen; else delete gestiones[clave];
  if (Object.keys(gestiones).length === 0) {
    if (previo) t.delete(r);
    return previo ? 'borrada' : 'sin cambios';
  }
  if (previo && igual(previo.gestiones, gestiones)) return 'sin cambios';
  t.set(r, {
    admision: Number(admision),
    gestiones,
    ...agregarAdmision(gestiones),
    primeraGestionEl: previo?.primeraGestionEl || FieldValue.serverTimestamp(),
    actualizadoEl: FieldValue.serverTimestamp(),
  });
  return previo ? 'actualizada' : 'creada';
});

// Cambio de un documento de gestión (antes/después: datos o null; ruta del
// documento). Saca la gestión de la admisión anterior si cambió y la pone
// (con su resumen al día) en la nueva.
const aplicarCambioGestion = async (db, ruta, antes, despues) => {
  const a = antes ? admisionDe(antes) : null;
  const d = despues ? admisionDe(despues) : null;
  const resultado = {};
  if (a && a !== d) resultado[a] = await actualizar(db, a, ruta, null);
  if (d) resultado[d] = await actualizar(db, d, ruta, resumenGestion(despues));
  return resultado;
};

// Recuento completo desde las gestiones (script inicial / reparación).
const recontar = async (db, { aplicar = false } = {}) => {
  const snap = await db.collectionGroup('detalles')
    .orderBy('__name__')
    .startAt(db.doc('implantes_gestiones/0000'))
    .endBefore(db.doc('implantes_gestiones/9999'))
    .get();
  const porAdmision = new Map();
  let sinAdmision = 0;
  snap.docs.forEach((d) => {
    const admision = admisionDe(d.data());
    if (!admision) { sinAdmision += 1; return; }
    const gestiones = porAdmision.get(admision) || {};
    gestiones[claveGestion(d.ref.path)] = resumenGestion(d.data());
    porAdmision.set(admision, gestiones);
  });
  const existentes = new Map((await db.collection(COLECCION_ADMISIONES).get()).docs.map((d) => [d.id, d.data()]));
  const filas = [...porAdmision].map(([admision, gestiones]) => ({ admision, ...agregarAdmision(gestiones), gestiones, nueva: !existentes.has(admision) }));
  const sobrantes = [...existentes.keys()].filter((a) => !porAdmision.has(a));
  if (aplicar) {
    const ops = [
      ...filas.map((f) => ({ tipo: 'set', f })),
      ...sobrantes.map((a) => ({ tipo: 'delete', a })),
    ];
    for (let i = 0; i < ops.length; i += 400) {
      const lote = db.batch();
      ops.slice(i, i + 400).forEach((op) => {
        if (op.tipo === 'delete') { lote.delete(ref(db, op.a)); return; }
        const { f } = op;
        const previo = existentes.get(f.admision);
        lote.set(ref(db, f.admision), {
          admision: Number(f.admision),
          gestiones: f.gestiones,
          ...agregarAdmision(f.gestiones),
          primeraGestionEl: previo?.primeraGestionEl || FieldValue.serverTimestamp(),
          actualizadoEl: FieldValue.serverTimestamp(),
        });
      });
      await lote.commit();
    }
  }
  return { totalGestiones: snap.size, sinAdmision, filas, sobrantes };
};

module.exports = { aplicarCambioGestion, recontar };
