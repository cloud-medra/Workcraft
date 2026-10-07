// functions/scripts/simularFilasGuiaImputadas.js
//
// SOLO SIMULACIÓN: no escribe nada en Firestore (no tiene modo --aplicar).
//
// Desde que Solicitud guarda las filas "No lleva OC" dentro del doc imputado
// (campo filasGuia, cada una con el N° de guía de su producto) y deja la
// fila principal con numeroGuia 0, los documentos imputados antes de ese
// cambio quedan con el N° de guía en la fila principal y sin filasGuia:
//
//   consignacion_imputadas/{anio}/meses/{mes}/documentos/{id}
//
// Este script lista esos documentos y muestra cómo quedarían si se
// corrigieran con el mismo criterio que la app
// (src/.../solicitudConsignacion/utils/cargarCandidatosSolicitudConsignacion.js):
// busca la guía por el `delivery` del documento en consignacion_guias
// (numeroDocumento == delivery), descarta los kits excluidos y arma
// filasGuia con descripción/empresa/tipo desde maestros_codigos.
//
//   - Corregibles: la guía se encontró → numeroGuia 0 + filasGuia.
//   - Sin delivery / guía no encontrada / guía solo con kits excluidos: se
//     dejarían como están (el N° de guía no tendría dónde quedar).
//
//   cd functions
//   node scripts/simularFilasGuiaImputadas.js
//   node scripts/simularFilasGuiaImputadas.js --ejemplos 3   # más ejemplos antes/después
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
const RAIZ = 'consignacion_imputadas';
const COL_GUIAS = 'consignacion_guias';
const COL_MAESTROS = 'maestros_codigos';

const indiceEjemplos = process.argv.indexOf('--ejemplos');
const N_EJEMPLOS = indiceEjemplos > -1 ? Math.max(1, Number(process.argv[indiceEjemplos + 1]) || 1) : 1;

const RUTA_EXCLUSION = path.resolve(
  __dirname, '../../src/components/modulos/operaciones/consignacion/utils/exclusionKitsGuia.js'
);

// Igual que descripcionDesdeMaestro (registroConsignacionService.js), que no
// se importa porque ese archivo carga el SDK cliente de Firebase.
const descripcionDesdeMaestro = (item) => item?.descriptorAuto || item?.descriptorEmpresa || '';

const tieneNumeroGuia = (v) => v !== undefined && v !== null && v !== '' && v !== 0 && v !== '0';

const main = async () => {
  const { estaExcluidoDeGuia } = await import(pathToFileURL(RUTA_EXCLUSION).href);

  initializeApp({ projectId: process.env.GCLOUD_PROJECT || PROYECTO });
  const db = getFirestore();

  const cacheGuias = new Map();
  const buscarGuia = async (delivery) => {
    if (!cacheGuias.has(delivery)) {
      const snap = await db.collectionGroup('detalles').where('numeroDocumento', '==', delivery).get();
      cacheGuias.set(delivery, snap.docs.filter((d) => d.ref.path.startsWith(`${COL_GUIAS}/`)).map((d) => d.data()));
    }
    return cacheGuias.get(delivery);
  };

  const cacheMaestros = new Map();
  const buscarMaestro = async (referencia) => {
    if (!referencia) return null;
    if (!cacheMaestros.has(referencia)) {
      const snap = await db.collection(COL_MAESTROS).where('referencia', '==', referencia).limit(1).get();
      cacheMaestros.set(referencia, snap.docs[0]?.data() || null);
    }
    return cacheMaestros.get(referencia);
  };

  const categorias = {
    corregibles: [],
    sinDelivery: [],
    guiaNoEncontrada: [],
    soloKitsExcluidos: []
  };
  let revisados = 0;
  let yaCorrectos = 0;

  // listDocuments() incluye años/meses que solo existen como ruta padre.
  for (const refAnio of await db.collection(RAIZ).listDocuments()) {
    for (const refMes of await refAnio.collection('meses').listDocuments()) {
      const snap = await refMes.collection('documentos').get();
      for (const docSnap of snap.docs) {
        revisados++;
        const data = docSnap.data();
        const filasGuiaActuales = Array.isArray(data.filasGuia) ? data.filasGuia : [];
        if (!tieneNumeroGuia(data.numeroGuia) || filasGuiaActuales.length > 0) {
          yaCorrectos++;
          continue;
        }

        const delivery = String(data.delivery || '').trim();
        const base = {
          ruta: docSnap.ref.path,
          gestionId: data.gestionId || '',
          delivery,
          numeroGuiaActual: data.numeroGuia
        };

        if (!delivery) { categorias.sinDelivery.push(base); continue; }

        const productosGuia = await buscarGuia(delivery);
        if (productosGuia.length === 0) { categorias.guiaNoEncontrada.push(base); continue; }

        const productos = productosGuia.filter((p) => !estaExcluidoDeGuia(p.codigo));
        if (productos.length === 0) { categorias.soloKitsExcluidos.push(base); continue; }

        const filasGuia = [];
        for (const p of productos) {
          const maestro = await buscarMaestro(String(p.codigo || '').trim());
          filasGuia.push({
            codigoGuia: p.codigo || '',
            descripcion: descripcionDesdeMaestro(maestro) || '-',
            empresa: maestro?.empresa || '-',
            atributo: maestro?.tipo || '-',
            cantidad: p.cantidad ?? 0,
            lote: p.lote || 'N/A',
            vencimiento: p.vencimiento || 'N/A',
            numeroGuia: p.numeroGuia || 0
          });
        }

        const numerosEnGuia = [...new Set(filasGuia.map((f) => String(f.numeroGuia)))];
        categorias.corregibles.push({
          ...base,
          filasGuia: filasGuia.length,
          numerosGuiaEnFilas: numerosEnGuia.join(', '),
          coincide: numerosEnGuia.includes(String(data.numeroGuia)) ? 'sí' : 'NO',
          _antes: { numeroGuia: data.numeroGuia, filasGuia: data.filasGuia ?? '(no existe)' },
          _despues: { numeroGuia: 0, filasGuia }
        });
      }
    }
  }

  // eslint-disable-next-line no-unused-vars
  const sinDetalle = (filas) => filas.map(({ _antes, _despues, ...resto }) => resto);

  console.log(`\nDocumentos revisados en ${RAIZ}: ${revisados}`);
  console.log(`Ya correctos (numeroGuia 0/vacío o con filasGuia): ${yaCorrectos}`);
  console.log(`\nAfectados (N° de guía en la fila principal y sin filasGuia): ${
    revisados - yaCorrectos}`);
  console.log(`  - Corregibles (guía encontrada):          ${categorias.corregibles.length}`);
  console.log(`  - Sin delivery (quedarían igual):          ${categorias.sinDelivery.length}`);
  console.log(`  - Guía no encontrada (quedarían igual):    ${categorias.guiaNoEncontrada.length}`);
  console.log(`  - Guía solo con kits excluidos (igual):    ${categorias.soloKitsExcluidos.length}`);

  const discrepancias = categorias.corregibles.filter((c) => c.coincide === 'NO').length;
  if (discrepancias) {
    console.log(`\n  Atención: en ${discrepancias} corregible(s) el N° de guía actual no está entre los de la guía (columna "coincide").`);
  }

  if (categorias.corregibles.length) {
    console.log('\nCorregibles:');
    console.table(sinDetalle(categorias.corregibles));
    categorias.corregibles.slice(0, N_EJEMPLOS).forEach((c) => {
      console.log(`\nEjemplo — ${c.ruta}`);
      console.log('ANTES:  ', JSON.stringify(c._antes, null, 2));
      console.log('DESPUÉS:', JSON.stringify(c._despues, null, 2));
    });
  }
  for (const [nombre, filas] of Object.entries(categorias)) {
    if (nombre === 'corregibles' || filas.length === 0) continue;
    console.log(`\n${nombre}:`);
    console.table(filas);
  }

  console.log('\nSimulación: no se escribió nada en Firestore.');
};

main().catch((error) => {
  console.error('Error en la simulación:', error);
  process.exit(1);
});
