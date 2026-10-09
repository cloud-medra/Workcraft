// "Descripciones ocultas" de Reporte Info contra el emulador
// (functions/descripcionesReporte): trigger de fila (campos y contador,
// normalización, cambio de descripción, eliminación), switches del Maestro
// (ocultar / volver a mostrar), excepción de admisiones con gestión en
// Implantes y relleno del script.
import process from 'node:process';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const {
  aplicarCambioFila, aplicarCambioDescripcion, recalcularAdmision, rellenar,
} = require('./descripcionesReporte/servicio.js');

const PROYECTO = 'demo-workcraft';
const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const MAESTRO = 'maestros_descripciones_reporte';
const CESAREA = 'CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMIA';
let db;

const filaRef = (id, mes = 'octubre') => db.doc(`documentos_reportesInfo/2026/meses/${mes}/registros/${id}`);
const fila = (adm, descripcion, extra = {}) => ({ 'Admisión': adm, 'Descripción': descripcion, Fecha: '2026-10-01', ...extra });
const leer = async (ref) => (await ref.get()).data();
const entrada = async (norm) => (await db.collection(MAESTRO).doc(encodeURIComponent(norm)).get()).data();

// Simula el trigger de fila: escribe y aplica el cambio.
const crear = async (id, datos, mes) => {
  const ref = filaRef(id, mes);
  await ref.set(datos);
  await aplicarCambioFila(db, ref, null, datos);
  return ref;
};
// Simula el trigger del Maestro.
const cambiarSwitch = async (norm, cambios) => {
  const ref = db.collection(MAESTRO).doc(encodeURIComponent(norm));
  const antes = (await ref.get()).data();
  await ref.update(cambios);
  return aplicarCambioDescripcion(db, antes, (await ref.get()).data());
};
const visibles = async (campo) => (await db.collection('documentos_reportesInfo/2026/meses/octubre/registros').where(campo, '==', false).get()).docs.map((d) => d.id).sort();

beforeAll(() => { db = getFirestore(initializeApp({ projectId: PROYECTO }, 'pruebas-descripciones')); });
beforeEach(() => fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROYECTO}/databases/(default)/documents`, { method: 'DELETE' }));

describe('trigger de fila', () => {
  it('una fila sin los campos se completa, aparece en Reporte Info y crea su descripción visible', async () => {
    const ref = await crear('r1', fila(1001, '  Cesárea c/s  salpingoligadura o salpingectomía '));
    expect(await leer(ref)).toMatchObject({
      descripcionNorm: CESAREA, admisionClave: '1001', ocultaImplantes: false, ocultaDocumentos: false, descripcionOcultaImplantes: false,
    });
    expect(await visibles('ocultaImplantes')).toEqual(['r1']);
    expect(await visibles('ocultaDocumentos')).toEqual(['r1']);
    expect(await entrada(CESAREA)).toMatchObject({ descripcion: CESAREA, filas: 1 });
  });

  it('normaliza: variaciones de formato cuentan como la misma descripción; sin descripción → SIN DESCRIPCION', async () => {
    await crear('r1', fila(1, 'CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMÍA'));
    await crear('r2', fila(2, 'cesarea  c/s salpingoligadura o salpingectomia'));
    await crear('r3', fila(3, ''));
    expect((await entrada(CESAREA)).filas).toBe(2);
    expect((await entrada('SIN DESCRIPCION')).filas).toBe(1);
  });

  it('cambio de descripción: mueve el contador y recalcula los campos; eliminar resta', async () => {
    await crear('r0', fila(5, 'OTRA'));
    await cambiarSwitch('OTRA', { ocultaDocumentos: true });
    const ref = await crear('r1', fila(1, CESAREA));
    const antes = await leer(ref);
    await ref.update({ 'Descripción': 'Otra' });
    await aplicarCambioFila(db, ref, antes, await leer(ref));
    expect(await leer(ref)).toMatchObject({ descripcionNorm: 'OTRA', ocultaDocumentos: true });
    expect((await entrada(CESAREA)).filas).toBe(0);
    expect((await entrada('OTRA')).filas).toBe(2);
    await aplicarCambioFila(db, ref, await leer(ref), null);
    expect((await entrada('OTRA')).filas).toBe(1);
  });

  it('editar "Revisado" no lee ni reescribe nada', async () => {
    const ref = await crear('r1', fila(1, CESAREA));
    const antes = await leer(ref);
    const despues = { ...antes, revisado: 'Revisado' };
    expect(await aplicarCambioFila(db, ref, antes, despues)).toEqual({});
  });
});

describe('Maestro: ocultar y volver a mostrar', () => {
  it('ocultar en Implantes saca las filas solo de Implantes; desmarcar las vuelve a mostrar', async () => {
    await crear('r1', fila(1, CESAREA));
    await crear('r2', fila(2, CESAREA), 'septiembre');
    await crear('r3', fila(3, 'ARTROSCOPIA'));
    expect(await cambiarSwitch(CESAREA, { ocultaImplantes: true })).toEqual({ filas: 2, actualizadas: 2 });
    expect(await visibles('ocultaImplantes')).toEqual(['r3']);
    expect(await visibles('ocultaDocumentos')).toEqual(['r1', 'r3']);
    expect(await leer(filaRef('r2', 'septiembre'))).toMatchObject({ ocultaImplantes: true, descripcionOcultaImplantes: true });
    await cambiarSwitch(CESAREA, { ocultaImplantes: false });
    expect(await visibles('ocultaImplantes')).toEqual(['r1', 'r3']);
  });

  it('una fila nueva de una descripción oculta llega ya oculta', async () => {
    await crear('r1', fila(1, CESAREA));
    await cambiarSwitch(CESAREA, { ocultaDocumentos: true });
    const ref = await crear('r2', fila(2, CESAREA));
    expect(await leer(ref)).toMatchObject({ ocultaDocumentos: true, ocultaImplantes: false });
  });
});

describe('excepción: admisión con gestión en Implantes', () => {
  it('no se oculta en Implantes (queda con aviso) y sí en Documentos; sigue a la gestión', async () => {
    await db.doc('admisiones_gestionadas_implantes/2002').set({ admision: 2002, estado: 'gestionada' });
    await crear('conGestion', fila(2002, CESAREA));
    await crear('sinGestion', fila(3003, CESAREA));
    await cambiarSwitch(CESAREA, { ocultaImplantes: true, ocultaDocumentos: true });
    expect(await leer(filaRef('conGestion'))).toMatchObject({ ocultaImplantes: false, descripcionOcultaImplantes: true, ocultaDocumentos: true });
    expect(await visibles('ocultaImplantes')).toEqual(['conGestion']);
    // La admisión 3003 recibe una gestión → se muestra; la 2002 la pierde → se oculta.
    await recalcularAdmision(db, '3003', true);
    await recalcularAdmision(db, '2002', false);
    expect(await visibles('ocultaImplantes')).toEqual(['sinGestion']);
  });
});

describe('script de relleno', () => {
  it('simula sin escribir, aplica los campos y el conteo, y es idempotente', async () => {
    await filaRef('r1').set(fila(1, CESAREA));
    await filaRef('r2').set(fila(2, 'Cesárea c/s salpingoligadura o salpingectomía'));
    await filaRef('r3', 'septiembre').set(fila(3, 'ARTROSCOPIA'));
    await db.doc('consignacion_ingresos/2026/meses/octubre/registros/x').set(fila(9, 'NO ES DE REPORTE'));
    const sim = await rellenar(db, { aplicar: false });
    expect(sim).toMatchObject({ totalFilas: 3, aActualizar: 3, ocultasImplantes: 0, ocultasDocumentos: 0 });
    expect(sim.descripciones.map((d) => [d.descripcion, d.filas])).toEqual([[CESAREA, 2], ['ARTROSCOPIA', 1]]);
    expect(await leer(filaRef('r1'))).not.toHaveProperty('ocultaImplantes');
    await rellenar(db, { aplicar: true });
    expect(await leer(filaRef('r1'))).toMatchObject({ descripcionNorm: CESAREA, ocultaImplantes: false, ocultaDocumentos: false });
    expect(await entrada(CESAREA)).toMatchObject({ filas: 2, ocultaImplantes: false, ocultaDocumentos: false });
    expect((await rellenar(db, { aplicar: false })).aActualizar).toBe(0);
  });
});
