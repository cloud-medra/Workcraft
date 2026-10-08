// functions/scripts/migrarPermisosGranulares.js
//
// Migración de la tanda "permisos granulares faltantes" (Laboratorio,
// Vacunatorio, Maestros → Códigos y PAD, Reportes Info). Nadie pierde ni
// gana acceso respecto de lo que el admin ya le había asignado en el menú:
//
// 1) Vistas que entraron al mapa de permisos (componentMaps): Laboratorio
//    Códigos / Órdenes / XML y Reportes Info (Documentos e Implantes). Sus
//    pantallas ya consultaban permisos con esa ruta, pero sin entrada en el
//    mapa quedaban bloqueadas para todo usuario que no fuera admin/dev. A
//    quien tiene la ruta en su menú (permisos[modulo]) y no tiene entrada en
//    permisosGranulares se le crea con acceso total — lo mismo que hace el
//    formulario de usuarios al marcar el ítem.
//
// 2) Control Procesos (Laboratorio y Vacunatorio): el contenido de las 8
//    pestañas usaba secciones compartidas en la ruta del orquestador; ahora
//    cada pestaña tiene las suyas. Las restricciones que el usuario tenía en
//    el orquestador se copian a cada pestaña que ya tiene incluida, solo
//    para las claves que esa pestaña consultaba antes (CLAVES_HEREDADAS en
//    src/config/componentMaps/controlProcesos.js). No pisa valores que la
//    pestaña ya tenga. Sin esto, una restricción como "no eliminar" en el
//    orquestador dejaría de aplicarse.
//
// Admin/dev se omiten (ven todo). No toca ningún otro campo ni colección.
// Es idempotente: correrlo dos veces no cambia nada la segunda vez.
//
// Por defecto solo lista lo que cambiaría (simulación). Para aplicar:
//   cd functions
//   node scripts/migrarPermisosGranulares.js            # simulación
//   node scripts/migrarPermisosGranulares.js --aplicar  # escribe
//
// Credenciales: Application Default Credentials del proyecto
// (`gcloud auth application-default login`, o GOOGLE_APPLICATION_CREDENTIALS
// apuntando a una cuenta de servicio). Con FIRESTORE_EMULATOR_HOST definido
// corre contra el emulador. Proyecto: GCLOUD_PROJECT o workcraft-491b7.

const path = require('path');
const { pathToFileURL } = require('url');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldPath } = require('firebase-admin/firestore');

const PROYECTO = 'workcraft-491b7';
const APLICAR = process.argv.includes('--aplicar');
const MAPAS = path.resolve(__dirname, '../../src/config/componentMaps');

const VISTAS_NUEVAS = [
  '/laboratorio/codigoLaboratorio',
  '/laboratorio/ordenLaboratorio',
  '/laboratorio/xmlDocLaboratorio',
  '/documentos/reportesInfo',
  '/implantes/reportesInfo',
];
const ORQUESTADORES = ['/laboratorio/archivosControlLaboratorio', '/vacunatorio/archivosControlVacunatorio'];

const accesoTotal = (config) => Object.fromEntries(
  Object.entries(config.sections || {}).map(([k, s]) => [
    k, { visible: true, elements: Object.fromEntries(Object.keys(s.elements || {}).map((e) => [e, true])) },
  ])
);

// Copia a `pestana` las restricciones (valores en false) que el orquestador
// tiene en las claves heredadas y la pestaña no define. Un true no se copia:
// sin configurar ya es "permitido". Devuelve { nueva, copiadas }.
const heredarDelOrquestador = (orquestador, pestana, claves) => {
  const nueva = JSON.parse(JSON.stringify(pestana || {}));
  const copiadas = [];
  claves.forEach((clave) => {
    const [seccion, elemento] = clave.split('.');
    const origen = orquestador?.[seccion];
    if (!origen) return;
    if (!elemento) {
      if (origen.visible !== false) return;
      nueva[seccion] = nueva[seccion] || { visible: true, elements: {} };
      if (typeof pestana?.[seccion]?.visible === 'boolean') return;
      nueva[seccion].visible = origen.visible;
      copiadas.push(`${seccion}.visible=${origen.visible}`);
      return;
    }
    const valor = origen.elements?.[elemento];
    if (valor !== false) return;
    if (typeof pestana?.[seccion]?.elements?.[elemento] === 'boolean') return;
    nueva[seccion] = nueva[seccion] || { visible: true, elements: {} };
    nueva[seccion].elements = { ...(nueva[seccion].elements || {}), [elemento]: valor };
    copiadas.push(`${clave}=${valor}`);
  });
  return { nueva, copiadas };
};

const main = async () => {
  const { COMPONENT_MAPS } = await import(pathToFileURL(path.join(MAPAS, 'index.js')).href);
  const { CLAVES_HEREDADAS } = await import(pathToFileURL(path.join(MAPAS, 'controlProcesos.js')).href);
  VISTAS_NUEVAS.forEach((ruta) => {
    if (!COMPONENT_MAPS[ruta]) throw new Error(`La vista ${ruta} no está en componentMaps`);
  });

  initializeApp({ projectId: process.env.GCLOUD_PROJECT || PROYECTO });
  const db = getFirestore();
  const snap = await db.collection('usuarios').get();

  let afectados = 0;
  for (const docSnap of snap.docs) {
    const u = docSnap.data();
    if (u.rol === 'admin' || u.rol === 'dev') continue;
    const granulares = u.permisosGranulares || {};
    const rutasMenu = new Set(Object.values(u.permisos || {}).flat());
    const cambios = [];
    const detalle = [];

    // 1) Vistas nuevas en el mapa
    VISTAS_NUEVAS.forEach((ruta) => {
      if (!rutasMenu.has(ruta) || granulares[ruta]) return;
      cambios.push(new FieldPath('permisosGranulares', ruta), accesoTotal(COMPONENT_MAPS[ruta]));
      detalle.push(`+ ${ruta} (acceso total, ya la tenía en el menú)`);
    });

    // 2) Control Procesos: restricciones del orquestador → cada pestaña
    ORQUESTADORES.forEach((orq) => {
      if (!granulares[orq]) return;
      Object.entries(CLAVES_HEREDADAS).forEach(([clavePestana, claves]) => {
        const rutaPestana = `${orq}/${clavePestana}`;
        if (!granulares[rutaPestana]) return; // pestaña no incluida: nada que copiar
        const { nueva, copiadas } = heredarDelOrquestador(granulares[orq], granulares[rutaPestana], claves);
        if (copiadas.length === 0) return;
        cambios.push(new FieldPath('permisosGranulares', rutaPestana), nueva);
        detalle.push(`~ ${rutaPestana}: ${copiadas.join(', ')}`);
      });
    });

    if (cambios.length === 0) continue;
    afectados++;
    console.log(`\n${docSnap.id} (${u.email || u.nombreCompleto || 'sin email'}):`);
    detalle.forEach((d) => console.log(`   ${d}`));
    if (APLICAR) await docSnap.ref.update(...cambios);
  }

  console.log(`\n${afectados} de ${snap.size} usuarios con cambios.`);
  console.log(APLICAR ? 'Cambios aplicados.' : 'Simulación: no se escribió nada. Use --aplicar para migrar.');
};

if (require.main === module) {
  main().catch((error) => {
    console.error('Error en la migración:', error);
    process.exit(1);
  });
}

module.exports = { heredarDelOrquestador, accesoTotal };
