// functions/scripts/rellenarDescripcionesReporte.js
//
// Relleno inicial (y reparación) de "Descripciones ocultas" de Reporte Info:
// completa en TODAS las filas (documentos_reportesInfo/.../registros) los
// campos descripcionNorm, admisionClave, ocultaImplantes, ocultaDocumentos y
// descripcionOcultaImplantes, y deja el Maestro maestros_descripciones_reporte
// con el conteo de filas de cada descripción (las nuevas, visibles).
//
//   cd functions
//   node scripts/rellenarDescripcionesReporte.js            # simulación (no escribe)
//   node scripts/rellenarDescripcionesReporte.js --aplicar  # escribe
//
// Correrlo DESPUÉS de desplegar índices y functions y ANTES del hosting:
// Reporte Info consulta ocultaX == false, y una fila sin el campo no se ve.
// Idempotente. Lecturas: 1 por fila + 1 por descripción + 1 por admisión
// marcada. Escrituras: 1 por fila sin los campos al día + 1 por descripción.
//
// Credenciales: Application Default Credentials. Con FIRESTORE_EMULATOR_HOST
// corre contra el emulador. Proyecto: GCLOUD_PROJECT o workcraft-491b7.

const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { rellenar } = require('../descripcionesReporte/servicio');
const { descripcionNormDe } = require('../descripcionesReporte/nucleo.mjs');

const PROYECTO = process.env.GCLOUD_PROJECT || 'workcraft-491b7';
const aplicar = process.argv.includes('--aplicar');
const CESAREA = descripcionNormDe('CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMÍA');

(async () => {
  const db = getFirestore(initializeApp({ projectId: PROYECTO }));
  console.log(`${aplicar ? 'APLICANDO' : 'SIMULACIÓN (sin escribir)'} — proyecto ${PROYECTO}`);
  const r = await rellenar(db, { aplicar });
  console.log(`Filas de Reporte Info: ${r.totalFilas} · a actualizar: ${r.aActualizar}`);
  console.log(`Quedarían ocultas: Implantes ${r.ocultasImplantes} · Documentos ${r.ocultasDocumentos}`);
  console.log(`Descripciones distintas: ${r.descripciones.filter((d) => d.filas > 0).length} (nuevas en el Maestro: ${r.descripciones.filter((d) => d.nueva).length})`);
  const cesarea = r.descripciones.find((d) => d.descripcion === CESAREA);
  console.log(`"${CESAREA}": ${cesarea ? cesarea.filas : 0} filas`);
  console.log('\n20 descripciones más frecuentes:');
  r.descripciones.slice(0, 20).forEach((d, i) => console.log(`${String(i + 1).padStart(3)}. ${String(d.filas).padStart(5)}  ${d.descripcion}`));
  if (!aplicar) console.log('\nPara aplicar: --aplicar');
})().catch((err) => { console.error(err); process.exit(1); });
