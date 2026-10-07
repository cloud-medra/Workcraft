// functions/scripts/migrarPermisoInventarioCajas.js
//
// Migración única: "Inventario por cajas" dejó de ser una operación dentro
// de Inventario → Escaneo (/inventario/escaneoInventario) y pasó a ser un
// ítem propio (/inventario/inventarioCajas). A cada usuario que hoy ve
// Escaneo se le da el mismo acceso al ítem nuevo:
//   - usuarios/{id}.permisos.inventario       agrega la ruta nueva
//   - usuarios/{id}.ordenSubItems.inventario  la inserta justo después de
//                                             Escaneo (si tiene orden propio)
//   - usuarios/{id}.permisosGranulares['/inventario/inventarioCajas']
//       copia de las secciones inventario_cajas y finalizar_inventario que
//       tenga en Escaneo (si no tiene entrada para Escaneo no se crea: el
//       botón Finalizar seguía bloqueado igual que antes).
// No quita nada de Escaneo ni toca ningún otro campo ni colección.
//
// Por defecto solo lista lo que cambiaría (simulación). Para aplicar:
//   cd functions
//   node scripts/migrarPermisoInventarioCajas.js            # simulación
//   node scripts/migrarPermisoInventarioCajas.js --aplicar  # escribe
//
// Credenciales: Application Default Credentials del proyecto
// (`gcloud auth application-default login`, o GOOGLE_APPLICATION_CREDENTIALS
// apuntando a una cuenta de servicio). Con FIRESTORE_EMULATOR_HOST definido
// corre contra el emulador.

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldPath } = require('firebase-admin/firestore');

const RUTA_ESCANEO = '/inventario/escaneoInventario';
const RUTA_NUEVA = '/inventario/inventarioCajas';
const SECCIONES = ['inventario_cajas', 'finalizar_inventario'];
const PROYECTO = 'workspace-cloud-15d85';
const APLICAR = process.argv.includes('--aplicar');

const main = async () => {
  initializeApp({ projectId: process.env.GCLOUD_PROJECT || PROYECTO });
  const db = getFirestore();
  const snap = await db.collection('usuarios').get();

  let afectados = 0;
  for (const docSnap of snap.docs) {
    const u = docSnap.data();
    const permisos = u.permisos?.inventario || [];
    // Solo quien ve Escaneo y aún no tiene el ítem nuevo (idempotente).
    if (!permisos.includes(RUTA_ESCANEO) || permisos.includes(RUTA_NUEVA)) continue;

    const orden = u.ordenSubItems?.inventario || [];
    const granularEscaneo = u.permisosGranulares?.[RUTA_ESCANEO];

    // Se usan pares (FieldPath, valor) porque la clave de permisosGranulares
    // es la ruta y contiene "/".
    const cambios = [new FieldPath('permisos', 'inventario'), [...permisos, RUTA_NUEVA]];
    const campos = ['permisos.inventario'];
    if (orden.length && !orden.includes(RUTA_NUEVA)) {
      const i = orden.indexOf(RUTA_ESCANEO);
      const nuevoOrden = i >= 0 ? [...orden.slice(0, i + 1), RUTA_NUEVA, ...orden.slice(i + 1)] : [...orden, RUTA_NUEVA];
      cambios.push(new FieldPath('ordenSubItems', 'inventario'), nuevoOrden);
      campos.push('ordenSubItems.inventario');
    }
    if (granularEscaneo && !u.permisosGranulares?.[RUTA_NUEVA]) {
      const copia = Object.fromEntries(SECCIONES.filter((k) => granularEscaneo[k]).map((k) => [k, granularEscaneo[k]]));
      cambios.push(new FieldPath('permisosGranulares', RUTA_NUEVA), copia);
      campos.push(`permisosGranulares (${Object.keys(copia).join(', ') || 'sin restricciones'})`);
    }

    afectados++;
    console.log(`${docSnap.id} (${u.email || u.nombre || 'sin email'}): ${campos.join(', ')}`);
    if (APLICAR) await docSnap.ref.update(...cambios);
  }

  console.log(`\n${afectados} de ${snap.size} usuarios con Escaneo sin ${RUTA_NUEVA}.`);
  console.log(APLICAR ? 'Cambios aplicados.' : 'Simulación: no se escribió nada. Use --aplicar para migrar.');
};

main().catch((error) => {
  console.error('Error en la migración:', error);
  process.exit(1);
});
