// functions/scripts/generarEstadisticas.js
//
// Genera, una sola vez, las estadísticas de los períodos que ya existían
// antes del módulo Estadísticas (Administración → Estadísticas). Después de
// esto las mantienen las Cloud Functions (triggers, cierre y recálculo
// nocturno).
//
// Recorre los períodos de cierres_periodos de Implantes, Consignación y
// Hemodinamia y, para cada uno, lee sus documentos imputados
// ({modulo}_imputadas/{anio}/meses/{mes}/documentos) y escribe
// estadisticas/{modulo}_{AAAA-MM}. Los períodos CERRADO quedan definitivos.
// Es idempotente: correrlo dos veces deja lo mismo.
//
// Por defecto solo simula: muestra por período cuántos ítems, admisiones,
// tuplas y líneas de código hay, los ítems sin precio, el tamaño estimado de
// cada documento (principal, códigos, montos) y los nombres que parecen el
// mismo escrito distinto (para revisarlos; no se unen solos).
//
//   cd functions
//   node scripts/generarEstadisticas.js                    # simulación
//   node scripts/generarEstadisticas.js --aplicar          # escribe
//   node scripts/generarEstadisticas.js --modulo implantes # un módulo
//   node scripts/generarEstadisticas.js --desde 2026-01    # desde un período
//   node scripts/generarEstadisticas.js --version-antigua  # solo los períodos
//       calculados con un formato anterior (p. ej. sin montos ni códigos);
//       conserva el estado de cierre (CERRADO queda definitivo)
//   node scripts/generarEstadisticas.js --contar-sin-periodo
//       (además lee las gestiones para contar las que aún no se han
//        solicitado, es decir, sin período; cuesta 1 lectura por gestión)
//
// Lecturas: 1 por cada ítem imputado del histórico + 1 por período + los
// cierres. Escrituras: 1 por período (más partes si alguno no cabe).
//
// Credenciales: Application Default Credentials del proyecto
// (`gcloud auth application-default login`, o GOOGLE_APPLICATION_CREDENTIALS
// apuntando a una cuenta de servicio). Con FIRESTORE_EMULATOR_HOST definido
// corre contra el emulador. Proyecto: GCLOUD_PROJECT o workcraft-491b7.

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldPath } = require('firebase-admin/firestore');
const {
  FUENTES, VERSION, COLECCION_ESTADISTICAS, claveMes, idEstadistica, calcularPeriodo, repartir, repartirMapa, repartirMontos,
  GRUPO, tamanoAprox, nombresDudosos, normalizar,
} = require('../estadisticas/nucleo');
const { recalcularPeriodo, leerDocumentosPeriodo } = require('../estadisticas/servicio');

const PROYECTO = process.env.GCLOUD_PROJECT || 'workcraft-491b7';
const args = process.argv.slice(2);
const APLICAR = args.includes('--aplicar');
const CONTAR_SIN_PERIODO = args.includes('--contar-sin-periodo');
const VERSION_ANTIGUA = args.includes('--version-antigua');
const valor = (nombre) => {
  const i = args.indexOf(nombre);
  return i >= 0 ? args[i + 1] : null;
};
const SOLO_MODULO = valor('--modulo');
const DESDE = valor('--desde');

if (SOLO_MODULO && !FUENTES[SOLO_MODULO]) {
  console.error(`Módulo desconocido: ${SOLO_MODULO}. Opciones: ${Object.keys(FUENTES).join(', ')}`);
  process.exit(1);
}

initializeApp({ projectId: PROYECTO });
const db = getFirestore();

// Gestiones aún no solicitadas (sin período). Implantes y Hemodinamia: el
// bloque no tiene solicitud 'SOLICITADO'. Consignación: el registro no tiene
// periodoAnio/periodoMes.
const detallesDe = async (raiz) => (await db.collectionGroup('detalles')
  .where(FieldPath.documentId(), '>=', `${raiz}/0000`)
  .where(FieldPath.documentId(), '<', `${raiz}/9999`)
  .get()).docs.map((d) => d.data());

const contarSinPeriodo = async (modulo) => {
  if (modulo === 'consignacion') {
    return (await detallesDe('consignacion_registros')).filter((d) => !d.periodoAnio || !d.periodoMes).length;
  }
  return (await detallesDe(`${modulo}_gestiones`))
    .filter((d) => String(d.solicitud || '').toUpperCase() !== 'SOLICITADO').length;
};

const main = async () => {
  console.log(`Proyecto: ${PROYECTO}${process.env.FIRESTORE_EMULATOR_HOST ? ' (emulador)' : ''}`);
  console.log(APLICAR ? 'MODO: APLICAR (escribe)\n' : 'MODO: SIMULACIÓN (no escribe; usa --aplicar para escribir)\n');

  const cierres = (await db.collection('cierres_periodos').get()).docs.map((d) => d.data());
  const modulos = SOLO_MODULO ? [SOLO_MODULO] : Object.keys(FUENTES);
  let totalItems = 0;
  let totalPeriodos = 0;

  for (const modulo of modulos) {
    const periodos = cierres
      .filter((c) => c.modulo === modulo && claveMes(c.anio, c.mes))
      .filter((c) => !DESDE || claveMes(c.anio, c.mes) >= DESDE)
      .sort((a, b) => claveMes(a.anio, a.mes).localeCompare(claveMes(b.anio, b.mes)));
    console.log(`=== ${modulo} (${periodos.length} períodos)`);
    const nombres = { m: [], c: [], e: [] };

    for (const c of periodos) {
      const clave = claveMes(c.anio, c.mes);
      if (VERSION_ANTIGUA) {
        const actual = await db.collection(COLECCION_ESTADISTICAS).doc(idEstadistica(modulo, c.anio, c.mes)).get();
        if (actual.exists && (actual.data().version || 1) >= VERSION) {
          console.log(`  ${clave} [${c.estado}]  ya está en la versión ${VERSION}: se omite`);
          continue;
        }
      }
      const docs = await leerDocumentosPeriodo(db, modulo, c.anio, c.mes);
      const calculo = calcularPeriodo(modulo, docs);
      const tuplas = Object.values(calculo.t);
      const admisiones = new Set(tuplas.map((t) => t.a)).size;
      const sinId = new Set(tuplas.filter((t) => t.s).map((t) => t.a)).size;
      const partes = repartir(calculo.t, calculo.nombres).length;
      const partesCodigos = repartirMapa(calculo.l, calculo.codigos, GRUPO.codigos).length;
      const partesMontos = repartirMontos(calculo.montos).length;
      const kb = (o) => Math.round(tamanoAprox(o) / 1024);
      ['m', 'c', 'e'].forEach((dim) => nombres[dim].push(...Object.values(calculo.nombres[dim])));
      totalItems += docs.length;
      totalPeriodos += 1;

      const extra = (n) => (n > 1 ? ` (${n} partes)` : '');
      console.log(`  ${clave} [${c.estado}]  ítems ${docs.length}  admisiones ${admisiones} (sin ID ${sinId})  sin precio ${calculo.sinPrecio}  códigos ${Object.keys(calculo.codigos).length}`);
      console.log(`      tamaño: principal ~${kb({ t: calculo.t, nombres: calculo.nombres })} KB${extra(partes)} · códigos ~${kb({ l: calculo.l, codigos: calculo.codigos })} KB${extra(partesCodigos)} · montos ~${kb(calculo.montos)} KB${extra(partesMontos)}  (máximo por documento: 1024 KB)`);
      if (APLICAR) {
        await recalcularPeriodo(db, modulo, c.anio, c.mes, {
          definitivo: c.estado === 'CERRADO', origen: 'script', reiniciarCambios: true,
        });
      }
    }

    const etiquetas = { m: 'Médicos', c: 'Cirugías', e: 'Empresas' };
    ['m', 'c', 'e'].forEach((dim) => {
      const dudosos = nombresDudosos(nombres[dim].filter((n) => normalizar(n)));
      if (dudosos.length) {
        console.log(`  ${etiquetas[dim]} con escritura parecida (revisar; se cuentan por separado):`);
        dudosos.slice(0, 50).forEach(([a, b]) => console.log(`    - "${a}"  /  "${b}"`));
        if (dudosos.length > 50) console.log(`    … y ${dudosos.length - 50} más`);
      }
    });

    if (CONTAR_SIN_PERIODO) {
      console.log(`  Gestiones aún sin período (no solicitadas): ${await contarSinPeriodo(modulo)}`);
    }
    console.log('');
  }

  console.log(`Total: ${totalPeriodos} períodos, ${totalItems} ítems leídos.`);
  console.log(APLICAR ? 'Listo: estadísticas escritas.' : 'Simulación terminada: no se escribió nada.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
