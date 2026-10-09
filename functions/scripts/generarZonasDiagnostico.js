// functions/scripts/generarZonasDiagnostico.js
//
// Carga inicial (y reparación) del Maestro "Zonas por diagnóstico"
// (maestros_zonas_diagnostico): lee la descripción de todas las gestiones
// de Implantes, crea las descripciones que faltan con su sugerencia por
// palabras clave ("Sugerida" o "Sin asignar") y fija el contador de
// gestiones de todas. No toca zonas, lado ni estado de las existentes; las
// que ya no tienen gestiones quedan en 0. Excluye "P" y vacías.
// Después lo mantiene el trigger zonasDiagnosticoGestionImplante.
//
//   cd functions
//   node scripts/generarZonasDiagnostico.js            # simulación (no escribe)
//   node scripts/generarZonasDiagnostico.js --aplicar  # escribe
//
// Correrlo DESPUÉS de desplegar la función (así no se pierde ninguna gestión
// creada entre medio). Es idempotente. Lecturas: 1 por gestión + el Maestro.
//
// Credenciales: Application Default Credentials del proyecto
// (`gcloud auth application-default login`, o GOOGLE_APPLICATION_CREDENTIALS).
// Con FIRESTORE_EMULATOR_HOST definido corre contra el emulador. Proyecto:
// GCLOUD_PROJECT o workcraft-491b7.

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { recontar } = require('../bodymap/servicio');
const { zonaPorId } = require('../bodymap/nucleo.mjs');

const PROYECTO = process.env.GCLOUD_PROJECT || 'workcraft-491b7';
const aplicar = process.argv.includes('--aplicar');

(async () => {
  const db = getFirestore(initializeApp({ projectId: PROYECTO }));
  console.log(`${aplicar ? 'APLICANDO' : 'SIMULACIÓN (sin escribir)'} — proyecto ${PROYECTO}`);
  const { totalGestiones, excluidas, filas } = await recontar(db, { aplicar });
  const zonas = (ids) => (ids || []).map((z) => zonaPorId(z)?.nombre || z).join(', ') || '—';
  console.log(`Gestiones: ${totalGestiones} (excluidas sin descripción o "P": ${excluidas}) · descripciones: ${filas.length}\n`);
  filas.sort((a, b) => b.gestiones - a.gestiones || a.descripcion.localeCompare(b.descripcion))
    .forEach((f) => console.log(`${String(f.gestiones).padStart(4)}  ${f.nueva ? 'NUEVA ' : 'existe'}  ${(f.nueva ? (f.zonas.length ? 'Sugerida   ' : 'Sin asignar') : (f.estado || '').padEnd(11))}  ${zonas(f.zonas).padEnd(26)}  ${f.descripcion}`));
  const nuevas = filas.filter((f) => f.nueva);
  console.log(`\n${nuevas.length} nueva(s): ${nuevas.filter((f) => f.zonas.length).length} sugerida(s), ${nuevas.filter((f) => !f.zonas.length).length} sin asignar.${aplicar ? '' : ' Para aplicar: --aplicar'}`);
})().catch((err) => { console.error(err); process.exit(1); });
