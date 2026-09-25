// =====================================================================
// MIGRACIÓN DE CAMPOS NUMÉRICOS GUARDADOS COMO TEXTO — SOLO DESARROLLO
// =====================================================================
// Se usa desde la consola del navegador (npm run dev) a través del medidor:
//
//   Paso 1 — `total` de *_imputadas:
//     await __FS_METER__.aplicarTotalesTexto(2026)
//       → muestra el plan, descarga el respaldo JSON y entrega un código.
//     await __FS_METER__.aplicarTotalesTexto(2026, { confirmar: 'CODIGO' })
//       → escribe.
//
//   Paso 2 — `total` de *_documentos + `detalles` (cantidad/precio/monto) de
//   *_documentos y *_imputadas (correr después de validar el paso 1):
//     await __FS_METER__.aplicarTotalesTexto(2026, { paso: 2 })
//
//   Revertir (con el respaldo en memoria o el JSON descargado):
//     await __FS_METER__.revertirTotalesTexto()                 // último respaldo
//     await __FS_METER__.revertirTotalesTexto(respaldoJson)     // objeto del archivo
//       → muestra el plan y entrega un código; se repite con { confirmar }.
//
// Reglas:
//   - Usa la sesión del navegador: las reglas de seguridad de Firestore
//     aplican igual que en la app.
//   - Solo convierte valores "seguros" (convertirNumeroSeguro). Los NO
//     seguros se listan y solo se escriben si se aprueban explícitamente:
//       { aprobados: { '<ruta>|<campo>': 1234 } }
//     con <campo> = 'total' o 'detalles[3].monto'.
//   - Escribe en transacciones que vuelven a leer cada documento y abortan
//     ese lote si el valor cambió desde que se armó el plan.
//   - Al revertir, solo restaura los documentos cuyo valor actual sigue
//     siendo el que escribió la migración.
// =====================================================================

import { collection, doc, getDocs, runTransaction } from 'firebase/firestore';
import { convertirNumeroSeguro } from '../components/modulos/gestiones/shared/numerosDocumento.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MODULOS = ['laboratorio', 'vacunatorio'];
const CAMPOS_DETALLE = ['cantidad', 'precio', 'monto'];
const DOCS_POR_TRANSACCION = 100;

const planesPendientes = new Map(); // código -> plan
let ultimoRespaldo = null;

const codigo = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const iguales = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const descargarJson = (nombre, datos) => {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const obtenerDb = async () => (await import('../firebaseConfig.js')).db;

const leerDocsDelAnio = async (db, raiz, anio) => {
  const docs = [];
  for (const mes of MESES) {
    const snap = await getDocs(collection(db, raiz, String(anio), 'meses', mes, 'documentos'));
    docs.push(...snap.docs);
  }
  return docs;
};

// Revisa un valor y lo agrega a `cambios` (seguro o aprobado) o a `noSeguros`.
const evaluar = ({ ruta, campo, valor, aprobados, cambios, noSeguros, alAplicar }) => {
  if (typeof valor === 'number') return;
  const { valor: convertido, seguro } = convertirNumeroSeguro(valor);
  const clave = `${ruta}|${campo}`;
  if (seguro) {
    cambios.push({ ruta, campo, original: valor, nuevo: convertido });
    alAplicar(convertido);
  } else if (Object.prototype.hasOwnProperty.call(aprobados, clave)) {
    const aprobado = aprobados[clave];
    if (typeof aprobado !== 'number' || !Number.isFinite(aprobado)) throw new Error(`Valor aprobado inválido para ${clave}`);
    cambios.push({ ruta, campo, original: valor, nuevo: aprobado, aprobadoManual: true });
    alAplicar(aprobado);
  } else {
    noSeguros.push({ clave, actual: JSON.stringify(valor), detalle: 'NO seguro: apruébelo con { aprobados: { [clave]: numero } }' });
  }
};

const armarPlan = async (anio, { paso = 1, aprobados = {} } = {}) => {
  const db = await obtenerDb();
  const raices = paso === 1
    ? MODULOS.map((m) => ({ raiz: `${m}_imputadas`, total: true, detalles: false }))
    : MODULOS.flatMap((m) => [
      { raiz: `${m}_documentos`, total: true, detalles: true },
      { raiz: `${m}_imputadas`, total: false, detalles: true }
    ]);

  const documentos = []; // { ruta, antes: {campos}, despues: {campos} }
  const cambios = [];
  const noSeguros = [];

  for (const { raiz, total, detalles } of raices) {
    for (const d of await leerDocsDelAnio(db, raiz, anio)) {
      const datos = d.data();
      const ruta = d.ref.path;
      const antes = {};
      const despues = {};

      if (total && 'total' in datos) {
        evaluar({ ruta, campo: 'total', valor: datos.total, aprobados, cambios, noSeguros, alAplicar: (v) => { despues.total = v; } });
        if ('total' in despues) antes.total = datos.total;
      }

      if (detalles && Array.isArray(datos.detalles)) {
        const nuevos = datos.detalles.map((det) => (det && typeof det === 'object' ? { ...det } : det));
        let hubo = false;
        nuevos.forEach((det, i) => {
          if (!det || typeof det !== 'object') return;
          CAMPOS_DETALLE.forEach((c) => {
            if (!(c in det)) return;
            evaluar({ ruta, campo: `detalles[${i}].${c}`, valor: det[c], aprobados, cambios, noSeguros, alAplicar: (v) => { det[c] = v; hubo = true; } });
          });
        });
        if (hubo) {
          antes.detalles = datos.detalles;
          despues.detalles = nuevos;
        }
      }

      if (Object.keys(despues).length) documentos.push({ ruta, antes, despues });
    }
  }
  return { anio, paso, documentos, cambios, noSeguros };
};

// Escribe `despues` en cada documento si su valor actual sigue siendo `esperado`.
const escribirEnTransacciones = async (items, { esperado, escribir }) => {
  const db = await obtenerDb();
  let escritos = 0;
  const omitidos = [];
  for (let i = 0; i < items.length; i += DOCS_POR_TRANSACCION) {
    const lote = items.slice(i, i + DOCS_POR_TRANSACCION);
    await runTransaction(db, async (tx) => {
      const snaps = await Promise.all(lote.map((it) => tx.get(doc(db, it.ruta))));
      snaps.forEach((snap, j) => {
        const it = lote[j];
        const actual = snap.exists() ? snap.data() : null;
        const coincide = actual && Object.keys(esperado(it)).every((campo) => iguales(actual[campo], esperado(it)[campo]));
        if (!coincide) { omitidos.push(it.ruta); return; }
        tx.update(snap.ref, escribir(it));
      });
    });
    escritos += lote.length;
  }
  return { procesados: escritos, omitidos };
};

export async function aplicarTotalesTexto(anio = new Date().getFullYear(), opciones = {}) {
  const { confirmar, paso = 1 } = opciones;

  if (confirmar) {
    const plan = planesPendientes.get(confirmar);
    if (!plan) throw new Error(`Código "${confirmar}" desconocido o ya usado. Vuelva a generar el plan.`);
    planesPendientes.delete(confirmar);
    const { procesados, omitidos } = await escribirEnTransacciones(plan.documentos, {
      esperado: (it) => it.antes,
      escribir: (it) => it.despues
    });
    ultimoRespaldo = plan.respaldo;
    console.log(`[aplicarTotalesTexto] ${procesados - omitidos.length} documento(s) actualizado(s).`);
    if (omitidos.length) console.warn('Omitidos porque cambiaron desde el plan (vuelva a generarlo):', omitidos);
    console.log('Para revertir: await __FS_METER__.revertirTotalesTexto()  (o pase el JSON de respaldo descargado)');
    return { actualizados: procesados - omitidos.length, omitidos };
  }

  const plan = await armarPlan(anio, opciones);
  console.log(`[aplicarTotalesTexto ${anio} · paso ${paso}] ${plan.cambios.length} valor(es) a convertir en ${plan.documentos.length} documento(s).`);
  if (plan.cambios.length) console.table(plan.cambios.map(({ ruta, campo, original, nuevo, aprobadoManual }) => ({ ruta, campo, original: JSON.stringify(original), nuevo, aprobadoManual: !!aprobadoManual })));
  if (plan.noSeguros.length) {
    console.warn(`${plan.noSeguros.length} valor(es) NO seguros (no se escribirán salvo aprobación):`);
    console.table(plan.noSeguros);
  }
  if (!plan.documentos.length) return plan;

  plan.respaldo = {
    tipo: 'respaldo-numeros-texto',
    creado: new Date().toISOString(),
    anio, paso,
    documentos: plan.documentos
  };
  const nombre = `respaldo-numeros-${anio}-paso${paso}-${plan.respaldo.creado.replace(/[:.]/g, '-')}.json`;
  descargarJson(nombre, plan.respaldo);

  const cod = codigo();
  planesPendientes.set(cod, plan);
  console.log(`Respaldo descargado: ${nombre}. Revíselo y, para escribir, ejecute:\n  await __FS_METER__.aplicarTotalesTexto(${anio}, { confirmar: '${cod}' })`);
  return { documentos: plan.documentos.length, cambios: plan.cambios.length, noSeguros: plan.noSeguros, codigo: cod };
}

export async function revertirTotalesTexto(respaldo = ultimoRespaldo, { confirmar } = {}) {
  if (confirmar) {
    const plan = planesPendientes.get(confirmar);
    if (!plan) throw new Error(`Código "${confirmar}" desconocido o ya usado.`);
    planesPendientes.delete(confirmar);
    const { procesados, omitidos } = await escribirEnTransacciones(plan.documentos, {
      esperado: (it) => it.despues,
      escribir: (it) => it.antes
    });
    console.log(`[revertirTotalesTexto] ${procesados - omitidos.length} documento(s) restaurado(s).`);
    if (omitidos.length) console.warn('No restaurados porque su valor ya no es el que escribió la migración:', omitidos);
    return { restaurados: procesados - omitidos.length, omitidos };
  }

  if (!respaldo || respaldo.tipo !== 'respaldo-numeros-texto' || !Array.isArray(respaldo.documentos)) {
    throw new Error('Pase el objeto del JSON de respaldo (o use primero aplicarTotalesTexto en esta pestaña).');
  }
  const cod = codigo();
  planesPendientes.set(cod, { documentos: respaldo.documentos });
  console.log(`[revertirTotalesTexto] ${respaldo.documentos.length} documento(s) del respaldo ${respaldo.creado} (año ${respaldo.anio}, paso ${respaldo.paso}).`);
  console.table(respaldo.documentos.map((d) => ({ ruta: d.ruta, campos: Object.keys(d.antes).join(', ') })));
  console.log(`Para restaurar, ejecute:\n  await __FS_METER__.revertirTotalesTexto(undefined, { confirmar: '${cod}' })`);
  return { documentos: respaldo.documentos.length, codigo: cod };
}
