// functions/scripts/limpiarPermisoListadoMaestros.js
//
// Migración única: quita de los usuarios los restos de la vista eliminada
// Maestros → "Listado" (/maestros/listadoMaestros):
//   - usuarios/{id}.permisos.maestros         (arreglo de rutas permitidas)
//   - usuarios/{id}.ordenSubItems.maestros    (orden personalizado del menú)
//   - usuarios/{id}.permisosGranulares['/maestros/listadoMaestros']
// No toca ningún otro campo ni colección.
//
// Por defecto solo lista lo que cambiaría (simulación). Para aplicar:
//   cd functions
//   node scripts/limpiarPermisoListadoMaestros.js            # simulación
//   node scripts/limpiarPermisoListadoMaestros.js --aplicar  # escribe
//
// Credenciales: Application Default Credentials del proyecto
// (`gcloud auth application-default login`, o GOOGLE_APPLICATION_CREDENTIALS
// apuntando a una cuenta de servicio). Con FIRESTORE_EMULATOR_HOST definido
// corre contra el emulador.

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue, FieldPath } = require('firebase-admin/firestore');

const RUTA = '/maestros/listadoMaestros';
const PROYECTO = 'workspace-cloud-15d85';
const APLICAR = process.argv.includes('--aplicar');

const main = async () => {
  initializeApp({ projectId: process.env.GCLOUD_PROJECT || PROYECTO });
  const db = getFirestore();
  const snap = await db.collection('usuarios').get();

  let afectados = 0;
  for (const docSnap of snap.docs) {
    const u = docSnap.data();
    const enPermisos = (u.permisos?.maestros || []).includes(RUTA);
    const enOrden = (u.ordenSubItems?.maestros || []).includes(RUTA);
    const enGranulares = Object.prototype.hasOwnProperty.call(u.permisosGranulares || {}, RUTA);
    if (!enPermisos && !enOrden && !enGranulares) continue;

    afectados++;
    const campos = [enPermisos && 'permisos.maestros', enOrden && 'ordenSubItems.maestros', enGranulares && 'permisosGranulares'].filter(Boolean);
    console.log(`${docSnap.id} (${u.email || u.nombre || 'sin email'}): ${campos.join(', ')}`);

    if (!APLICAR) continue;
    // Se usan pares (FieldPath, valor) porque la clave de permisosGranulares
    // es la ruta y contiene "/"; arrayRemove hace la migración idempotente.
    const cambios = [];
    if (enPermisos) cambios.push(new FieldPath('permisos', 'maestros'), FieldValue.arrayRemove(RUTA));
    if (enOrden) cambios.push(new FieldPath('ordenSubItems', 'maestros'), FieldValue.arrayRemove(RUTA));
    if (enGranulares) cambios.push(new FieldPath('permisosGranulares', RUTA), FieldValue.delete());
    await docSnap.ref.update(...cambios);
  }

  console.log(`\n${afectados} de ${snap.size} usuarios con restos de ${RUTA}.`);
  console.log(APLICAR ? 'Cambios aplicados.' : 'Simulación: no se escribió nada. Use --aplicar para limpiar.');
};

main().catch((error) => {
  console.error('Error en la migración:', error);
  process.exit(1);
});
