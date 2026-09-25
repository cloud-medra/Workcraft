// functions/scripts/convertirTotalesImputadas.js
//
// Migración única: convierte a número el campo `total` de los documentos
// imputados de Laboratorio y Vacunatorio que lo tienen guardado como texto
// (la importación XML guardaba MntNeto como string). count()/sum('total')
// de Firestore ignoran los strings, así que ControlMensual no puede usar
// agregaciones mientras existan.
//
//   laboratorio_imputadas/{anio}/meses/{mes}/documentos/{id}.total
//   vacunatorio_imputadas/{anio}/meses/{mes}/documentos/{id}.total
//
// Solo toca `total`, y solo si la conversión es segura: dígitos con signo y
// decimales con punto opcionales ("14582947", "12.5"). Los valores vacíos o
// con separadores de miles/coma decimal ("1.234.567", "1,5") se listan como
// NO SEGUROS y no se modifican. Usa la misma función que la app
// (src/.../gestiones/shared/numerosDocumento.js).
//
// Por defecto solo lista lo que cambiaría (simulación). Para aplicar:
//   cd functions
//   node scripts/convertirTotalesImputadas.js            # simulación
//   node scripts/convertirTotalesImputadas.js --aplicar  # escribe
//
// Credenciales: Application Default Credentials del proyecto
// (`gcloud auth application-default login`, o GOOGLE_APPLICATION_CREDENTIALS
// apuntando a una cuenta de servicio). Con FIRESTORE_EMULATOR_HOST definido
// corre contra el emulador.

/* global require, process, __dirname */
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const PROYECTO = 'workspace-cloud-15d85';
const RAICES = ['laboratorio_imputadas', 'vacunatorio_imputadas'];
const APLICAR = process.argv.includes('--aplicar');
const TAMANO_LOTE = 400;

const RUTA_HELPER = path.resolve(__dirname, '../../src/components/modulos/gestiones/shared/numerosDocumento.js');

const main = async () => {
  const { convertirNumeroSeguro } = await import(pathToFileURL(RUTA_HELPER).href);

  initializeApp({ projectId: process.env.GCLOUD_PROJECT || PROYECTO });
  const db = getFirestore();

  const convertibles = [];
  const noSeguros = [];
  let revisados = 0;

  for (const raiz of RAICES) {
    // listDocuments() incluye años/meses que solo existen como ruta padre.
    for (const refAnio of await db.collection(raiz).listDocuments()) {
      for (const refMes of await refAnio.collection('meses').listDocuments()) {
        const snap = await refMes.collection('documentos').get();
        for (const docSnap of snap.docs) {
          revisados++;
          const total = docSnap.get('total');
          if (typeof total === 'number') continue;
          const { valor, seguro } = convertirNumeroSeguro(total);
          const fila = { ruta: docSnap.ref.path, actual: JSON.stringify(total), convertido: seguro ? valor : '-' };
          if (seguro) convertibles.push({ fila, ref: docSnap.ref, valor });
          else noSeguros.push(fila);
        }
      }
    }
  }

  console.log(`\nDocumentos revisados: ${revisados}`);
  console.log(`\nConvertibles con seguridad (${convertibles.length}):`);
  if (convertibles.length) console.table(convertibles.map((c) => c.fila));
  console.log(`\nNO seguros — no se modifican (${noSeguros.length}):`);
  if (noSeguros.length) console.table(noSeguros);

  if (!APLICAR) {
    console.log('\nSimulación: no se escribió nada. Use --aplicar para convertir los documentos "convertibles".');
    return;
  }

  for (let i = 0; i < convertibles.length; i += TAMANO_LOTE) {
    const batch = db.batch();
    convertibles.slice(i, i + TAMANO_LOTE).forEach(({ ref, valor }) => batch.update(ref, { total: valor }));
    await batch.commit();
  }
  console.log(`\n${convertibles.length} documento(s) actualizado(s).`);
};

main().catch((error) => {
  console.error('Error en la migración:', error);
  process.exit(1);
});
