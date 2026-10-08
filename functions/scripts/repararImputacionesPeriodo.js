// functions/scripts/repararImputacionesPeriodo.js
//
// Repara las imputaciones de Implantes y Hemodinamia afectadas por el error
// corregido en periodoImputacion (src/components/modulos/operaciones/shared):
// al editar una gestión ya SOLICITADA, la app reescribía la imputación en el
// período de CARGA del ítem en vez del período de SOLICITUD. Eso dejó:
//
//   1) Duplicados: el mismo ítem imputado en dos períodos. El correcto es el
//      que tiene los datos de la solicitud (solicitadoPor / fechaSolicitud);
//      la copia la creó la edición y no los tiene. Si la copia es más nueva,
//      sus datos (cantidad, precio, médico…) se pasan al correcto, que
//      conserva su período; luego la copia se borra.
//   2) Huérfanos: imputaciones de ítems que ya no existen en su gestión (se
//      eliminaron, pero la app borró en el período de carga). Solo se
//      informan: hay que revisarlos a mano (opción --huerfanos, que además
//      lee todas las gestiones).
//
// Por seguridad, solo toca períodos ABIERTOS o REABIERTOS. Con
// --incluir-cerrados también repara duplicados en períodos cerrados e
// invalida su resumen guardado (imputaciones_periodos), que Control Mensual
// vuelve a calcular al consultarlo. Las Estadísticas de un período cerrado
// no cambian solas: registran "cambios posteriores al cierre" y un admin
// puede recalcularlas.
//
//   cd functions
//   node scripts/repararImputacionesPeriodo.js                      # simulación
//   node scripts/repararImputacionesPeriodo.js --huerfanos          # + huérfanos
//   node scripts/repararImputacionesPeriodo.js --aplicar            # repara
//   node scripts/repararImputacionesPeriodo.js --aplicar --incluir-cerrados
//   node scripts/repararImputacionesPeriodo.js --modulo implantes
//
// Lecturas: todas las imputaciones de los módulos (+ todas las gestiones con
// --huerfanos) + los cierres. Escrituras: 1–2 por duplicado reparado.
//
// Credenciales: Application Default Credentials del proyecto
// (`gcloud auth application-default login`, o GOOGLE_APPLICATION_CREDENTIALS
// apuntando a una cuenta de servicio). Con FIRESTORE_EMULATOR_HOST definido
// corre contra el emulador. Proyecto: GCLOUD_PROJECT o workcraft-491b7.

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldPath } = require('firebase-admin/firestore');

const PROYECTO = process.env.GCLOUD_PROJECT || 'workcraft-491b7';
const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
const INCLUIR_CERRADOS = args.includes('--incluir-cerrados');
const HUERFANOS = args.includes('--huerfanos');
const iModulo = args.indexOf('--modulo');
const SOLO_MODULO = iModulo >= 0 ? args[iModulo + 1] : null;

const MODULOS = ['implantes', 'hemodinamia'];
if (SOLO_MODULO && !MODULOS.includes(SOLO_MODULO)) {
  console.error(`Módulo desconocido: ${SOLO_MODULO}. Opciones: ${MODULOS.join(', ')}`);
  process.exit(1);
}

// Campos que pone la solicitud (o el período) y que la copia no debe pisar.
const CAMPOS_DEL_CORRECTO = new Set(['periodoAnio', 'periodoMes', 'periodo', 'periodoAnioCarga', 'periodoMesCarga', 'fechaSolicitud', 'solicitadoPor', 'fechaIngreso', 'modulo']);
const ESTADOS_ABIERTOS = ['ABIERTO', 'REABIERTO'];

initializeApp({ projectId: PROYECTO });
const db = getFirestore();

const ms = (v) => (v?.toMillis ? v.toMillis() : v instanceof Date ? v.getTime() : 0);
const esDeSolicitud = (d) => Boolean(d.data.solicitadoPor || d.data.fechaSolicitud);

const leerRango = async (grupo, raiz) => (await db.collectionGroup(grupo)
  .where(FieldPath.documentId(), '>=', `${raiz}/0000`)
  .where(FieldPath.documentId(), '<', `${raiz}/9999`)
  .get()).docs;

const main = async () => {
  console.log(`Proyecto: ${PROYECTO}${process.env.FIRESTORE_EMULATOR_HOST ? ' (emulador)' : ''}`);
  console.log(APLICAR ? `MODO: APLICAR${INCLUIR_CERRADOS ? ' (incluye períodos cerrados)' : ' (solo períodos abiertos)'}\n` : 'MODO: SIMULACIÓN (no escribe; usa --aplicar para reparar)\n');

  const estados = new Map((await db.collection('cierres_periodos').get()).docs.map((d) => [d.id, d.data().estado]));
  const estadoDe = (modulo, anio, mes) => estados.get(`${anio}_${mes}_${modulo}`) || 'SIN PERÍODO';
  const abierto = (modulo, anio, mes) => ESTADOS_ABIERTOS.includes(estadoDe(modulo, anio, mes));

  for (const modulo of SOLO_MODULO ? [SOLO_MODULO] : MODULOS) {
    const coleccion = `${modulo}_imputadas`;
    const docs = (await leerRango('documentos', coleccion)).map((d) => {
      const [, anio, , mes] = d.ref.path.split('/'); // {col}/{anio}/meses/{mes}/documentos/{id}
      return { ref: d.ref, id: d.id, anio, mes, data: d.data() };
    });
    const porItem = new Map();
    docs.forEach((d) => { if (!porItem.has(d.id)) porItem.set(d.id, []); porItem.get(d.id).push(d); });

    const duplicados = [...porItem.values()].filter((l) => l.length > 1);
    console.log(`=== ${modulo}: ${docs.length} imputaciones, ${duplicados.length} ítem(s) duplicado(s)`);

    let reparados = 0;
    let omitidosCerrados = 0;
    const ambiguos = [];
    const resumenesAInvalidar = new Set();
    let batch = db.batch();
    let enBatch = 0;
    const agregar = async (fn) => {
      fn(batch);
      enBatch += 1;
      if (enBatch >= 400) { await batch.commit(); batch = db.batch(); enBatch = 0; }
    };

    for (const lista of duplicados) {
      const correctos = lista.filter(esDeSolicitud);
      if (correctos.length !== 1) { ambiguos.push(lista); continue; }
      const correcto = correctos[0];
      const copias = lista.filter((d) => d !== correcto);
      const periodos = [correcto, ...copias];
      const cerrados = periodos.filter((d) => !abierto(modulo, d.anio, d.mes));
      const texto = `  ítem ${correcto.id}: correcto ${correcto.mes} ${correcto.anio} [${estadoDe(modulo, correcto.anio, correcto.mes)}]; copia(s) ${copias.map((c) => `${c.mes} ${c.anio} [${estadoDe(modulo, c.anio, c.mes)}]`).join(', ')}`;
      if (cerrados.length && !INCLUIR_CERRADOS) {
        omitidosCerrados += 1;
        console.log(`${texto}  → se omite (período cerrado)`);
        continue;
      }
      const masNueva = copias.reduce((a, b) => (ms(b.data.actualizadoEn) > ms(a.data.actualizadoEn) ? b : a));
      const actualizar = ms(masNueva.data.actualizadoEn) > ms(correcto.data.actualizadoEn);
      console.log(`${texto}${actualizar ? '  → pasa los datos de la copia (más nueva)' : ''}`);
      reparados += 1;
      cerrados.forEach((d) => resumenesAInvalidar.add(`${d.anio}_${d.mes}_${modulo}`));
      if (!APLICAR) continue;
      if (actualizar) {
        const datos = Object.fromEntries(Object.entries(masNueva.data).filter(([k]) => !CAMPOS_DEL_CORRECTO.has(k)));
        await agregar((b) => b.set(correcto.ref, datos, { merge: true }));
      }
      for (const c of copias) await agregar((b) => b.delete(c.ref));
    }
    if (APLICAR) {
      for (const id of resumenesAInvalidar) await agregar((b) => b.delete(db.collection('imputaciones_periodos').doc(id)));
      if (enBatch) await batch.commit();
    }

    console.log(`  ${APLICAR ? 'Reparados' : 'A reparar'}: ${reparados}${omitidosCerrados ? `  ·  omitidos por período cerrado: ${omitidosCerrados} (usa --incluir-cerrados)` : ''}`);
    if (resumenesAInvalidar.size) console.log(`  Resúmenes de períodos cerrados ${APLICAR ? 'invalidados' : 'a invalidar'}: ${[...resumenesAInvalidar].join(', ')}`);
    if (ambiguos.length) {
      console.log(`  Ambiguos (revisar a mano; ninguno o varios tienen datos de solicitud): ${ambiguos.length}`);
      ambiguos.slice(0, 30).forEach((l) => console.log(`    - ítem ${l[0].id}: ${l.map((d) => `${d.mes} ${d.anio}`).join(', ')}`));
    }

    if (HUERFANOS) {
      const idsVigentes = new Set();
      (await leerRango('detalles', `${modulo}_gestiones`)).forEach((g) => {
        (g.data().cotizaciones || []).forEach((c) => (c.items || []).forEach((it) => idsVigentes.add(it.id)));
      });
      const huerfanos = docs.filter((d) => !idsVigentes.has(d.id));
      console.log(`  Huérfanos (imputación sin ítem en ninguna gestión; solo se informan): ${huerfanos.length}`);
      huerfanos.slice(0, 50).forEach((d) => console.log(`    - ${d.mes} ${d.anio} [${estadoDe(modulo, d.anio, d.mes)}]  ítem ${d.id}  admisión ${d.data.gestionId || '—'}  ${d.data.referencia || ''}`));
      if (huerfanos.length > 50) console.log(`    … y ${huerfanos.length - 50} más`);
    }
    console.log('');
  }
  console.log(APLICAR ? 'Listo.' : 'Simulación terminada: no se escribió nada.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
