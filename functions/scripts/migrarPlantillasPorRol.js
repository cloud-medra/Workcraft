// functions/scripts/migrarPlantillasPorRol.js
//
// Pasa las plantillas de permisos por centro (sin rol) a plantillas por
// centro + rol (ver functions/permisos/migracion.js): la de cada centro
// queda como la de Operador (y la de otro rol que tenga usuarios en ese
// centro), los demás roles quedan "Sin configurar". Ningún usuario gana ni
// pierde permisos: la simulación lo verifica usuario por usuario.
//
// Por defecto solo simula (no escribe nada):
//   cd functions
//   node scripts/migrarPlantillasPorRol.js            # simulación
//   node scripts/migrarPlantillasPorRol.js --aplicar  # escribe
//
// Correrlo DESPUÉS de desplegar las funciones nuevas (las anteriores leen
// la plantilla sin rol). Es idempotente: se puede volver a correr; sin
// plantillas antiguas no hace nada.
//
// Credenciales: Application Default Credentials del proyecto
// (`gcloud auth application-default login`, o GOOGLE_APPLICATION_CREDENTIALS).
// Con FIRESTORE_EMULATOR_HOST definido corre contra el emulador. Proyecto:
// GCLOUD_PROJECT o workcraft-491b7.

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { migrarPlantillasPorRol } = require('../permisos/migracion');

const PROYECTO = process.env.GCLOUD_PROJECT || 'workcraft-491b7';
const aplicar = process.argv.includes('--aplicar');

(async () => {
  const db = getFirestore(initializeApp({ projectId: PROYECTO }));
  console.log(`${aplicar ? 'APLICANDO' : 'SIMULACIÓN (sin escribir)'} — proyecto ${PROYECTO}`);
  const resultado = await migrarPlantillasPorRol(db, { aplicar });
  if (resultado.length === 0) {
    console.log('No hay plantillas antiguas (sin rol): nada que migrar.');
    return;
  }
  let problemas = 0;
  for (const r of resultado) {
    const nombre = (await db.collection('maestros_centros').doc(r.centroId).get()).data()?.nombre || r.centroId;
    console.log(`\n• ${nombre} (${r.centroId})`);
    console.log(`  usuarios del centro: ${r.usuarios}${r.rolesConUsuarios.length ? ` (roles: ${r.rolesConUsuarios.join(', ')})` : ''}`);
    console.log(`  ${aplicar ? 'creada(s)' : 'se crearía(n)'}: ${r.roles.map((rol) => `${r.centroId}__${rol}`).join(', ') || '—'}`);
    if (r.conflictos.length) {
      problemas += 1;
      console.log(`  ⚠ ya existe plantilla para: ${r.conflictos.join(', ')} → este centro NO se migra; revisar a mano.`);
    }
    if (r.cambian.length) {
      problemas += 1;
      console.log(`  ⚠ usuarios cuyo permiso cambiaría: ${r.cambian.join(', ')}`);
    } else {
      console.log('  ✓ ningún usuario gana ni pierde permisos');
    }
  }
  console.log(`\n${resultado.length} plantilla(s) antigua(s)${problemas ? ` · ${problemas} con advertencias` : ''}.${aplicar ? '' : ' Para aplicar: --aplicar'}`);
})().catch((err) => { console.error(err); process.exit(1); });
