// functions/scripts/marcarOcPendiente.js
//
// Migración única para "Sincronizar OC" (Gestión de Implantes): agrega
// `ocPendiente` a las gestiones de implantes_gestiones que todavía no lo
// tienen. La sincronización consulta where('ocPendiente', '==', true) y
// Firestore no encuentra documentos donde el campo no existe.
//
//   ocPendiente = true  si algún ítem con código no tiene OC en ocPorItem
//   ocPendiente = false si no tiene ítems con código (o ya tienen todos OC)
//
// Usa la misma función que la app (src/.../shared/ocIndex/indiceOC.js).
// Solo toca documentos SIN el campo (re-ejecutarlo no reescribe nada).
//
//   cd functions
//   node scripts/marcarOcPendiente.js            # simulación
//   node scripts/marcarOcPendiente.js --aplicar  # escribe
//
// Costo: 1 lectura por gestión (todas, una vez) + 1 escritura por gestión
// sin el campo.
//
// Credenciales: Application Default Credentials del proyecto
// (`gcloud auth application-default login`, o GOOGLE_APPLICATION_CREDENTIALS
// apuntando a una cuenta de servicio). Con FIRESTORE_EMULATOR_HOST definido
// corre contra el emulador.

/* global require, process, __dirname */
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldPath } = require('firebase-admin/firestore');

const PROYECTO = 'workcraft-491b7';
const APLICAR = process.argv.includes('--aplicar');
const TAMANO_LOTE = 400;

const RUTA_HELPER = path.resolve(__dirname, '../../src/components/modulos/operaciones/shared/ocIndex/indiceOC.js');

const main = async () => {
  const { calcularOcPendiente, itemsDeGestion } = await import(pathToFileURL(RUTA_HELPER).href);

  initializeApp({ projectId: process.env.GCLOUD_PROJECT || PROYECTO });
  const db = getFirestore();

  // Mismo rango sobre __name__ que usa la app para no mezclar con los
  // "detalles" de otros módulos.
  const snap = await db.collectionGroup('detalles')
    .where(FieldPath.documentId(), '>=', db.doc('implantes_gestiones/0000'))
    .where(FieldPath.documentId(), '<', db.doc('implantes_gestiones/9999'))
    .get();

  const aMarcar = [];
  let yaTenian = 0;
  snap.docs.forEach((d) => {
    const data = d.data();
    if (typeof data.ocPendiente === 'boolean') { yaTenian++; return; }
    aMarcar.push({ ref: d.ref, ocPendiente: calcularOcPendiente(itemsDeGestion(data), data.ocPorItem || {}) });
  });

  const pendientes = aMarcar.filter(m => m.ocPendiente).length;
  console.log(`\nGestiones revisadas: ${snap.size}`);
  console.log(`Ya tenían ocPendiente: ${yaTenian}`);
  console.log(`A marcar: ${aMarcar.length} (ocPendiente=true: ${pendientes}, false: ${aMarcar.length - pendientes})`);

  if (!APLICAR) {
    console.log('\nSimulación: no se escribió nada. Use --aplicar para escribir.');
    return;
  }

  for (let i = 0; i < aMarcar.length; i += TAMANO_LOTE) {
    const batch = db.batch();
    aMarcar.slice(i, i + TAMANO_LOTE).forEach(({ ref, ocPendiente }) => batch.update(ref, { ocPendiente }));
    await batch.commit();
    console.log(`  ${Math.min(i + TAMANO_LOTE, aMarcar.length)}/${aMarcar.length}`);
  }
  console.log(`\n${aMarcar.length} gestión(es) actualizada(s).`);
};

main().catch((error) => {
  console.error('Error en la migración:', error);
  process.exit(1);
});
