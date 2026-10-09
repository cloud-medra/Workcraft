// Marca "Gestión implante" de Reporte Info contra el emulador
// (functions/admisiones): trigger (crear, cambiar admisión, eliminar, varias
// gestiones por admisión, estados), recuento del script y reglas.
import process from 'node:process';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { aplicarCambioGestion, recontar } = require('./admisiones/servicio.js');

const PROYECTO = 'demo-workcraft';
const FIRESTORE = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
const COL = 'admisiones_gestionadas_implantes';
let db;

const ruta = (adm, empresa = 'A', id = 'g1') => `implantes_gestiones/2026/mes/10/dia/01/admision/${adm}/empresa/${empresa}/detalles/${id}`;
const item = (estadoCarga = 'PENDIENTE', extra = {}) => ({ id: Math.random().toString(36).slice(2), estadoCarga, ...extra });
const gestion = (gestionId, items = [item()], extra = {}) => ({ gestionId, fecha: '2026-10-01', cotizaciones: [{ items }], ...extra });
const marca = async (adm) => (await db.collection(COL).doc(adm).get()).data();

beforeAll(() => { db = getFirestore(initializeApp({ projectId: PROYECTO }, 'pruebas-admisiones')); });
beforeEach(() => fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROYECTO}/databases/(default)/documents`, { method: 'DELETE' }));

describe('trigger: marca de admisiones gestionadas', () => {
  it('crear una gestión con admisión la marca como Gestionada, con ítems pendientes y fecha', async () => {
    await aplicarCambioGestion(db, ruta('1001'), null, gestion('1001', [item(), item('CARGADO')]));
    expect(await marca('1001')).toMatchObject({
      admision: 1001, estado: 'gestionada', cantidad: 1, totalItems: 2, itemsPendientes: 1, todosCargados: false, imputada: false, primeraFechaGestion: '2026-10-01',
    });
    expect((await marca('1001')).primeraGestionEl).toBeTruthy();
  });

  it('estados: todos los ítems Cargados → Cargada; bloque solicitado → Imputada; el contenido del PAD no cuenta', async () => {
    const r = ruta('1002');
    await aplicarCambioGestion(db, r, null, gestion('1002', [item('CARGADO'), item('PAD', { padPadreId: 'x' })]));
    expect(await marca('1002')).toMatchObject({ estado: 'cargada', todosCargados: true, itemsPendientes: 0, totalItems: 1 });
    await aplicarCambioGestion(db, r, gestion('1002'), gestion('1002', [item('CARGADO')], { solicitud: 'SOLICITADO' }));
    expect(await marca('1002')).toMatchObject({ estado: 'imputada', imputada: true });
  });

  it('varias gestiones por admisión (una por empresa): cuenta y suma; quitar una conserva la marca', async () => {
    await aplicarCambioGestion(db, ruta('1003', 'A'), null, gestion('1003', [item()]));
    await aplicarCambioGestion(db, ruta('1003', 'B', 'g2'), null, gestion('1003', [item(), item()]));
    expect(await marca('1003')).toMatchObject({ cantidad: 2, itemsPendientes: 3 });
    await aplicarCambioGestion(db, ruta('1003', 'A'), gestion('1003'), null);
    expect(await marca('1003')).toMatchObject({ cantidad: 1, itemsPendientes: 2 });
  });

  it('cambiar el número de admisión desmarca la anterior (si no le quedan gestiones) y marca la nueva', async () => {
    const r = ruta('1004');
    await aplicarCambioGestion(db, r, null, gestion('1004'));
    await aplicarCambioGestion(db, r, gestion('1004'), gestion('1005'));
    expect(await marca('1004')).toBeUndefined();
    expect(await marca('1005')).toMatchObject({ estado: 'gestionada', cantidad: 1 });
  });

  it('eliminar la última gestión desmarca la admisión; sin número de admisión no marca nada', async () => {
    const r = ruta('1006');
    await aplicarCambioGestion(db, r, null, gestion('1006'));
    await aplicarCambioGestion(db, r, gestion('1006'), null);
    expect(await marca('1006')).toBeUndefined();
    await aplicarCambioGestion(db, ruta('P'), null, gestion('P'));
    await aplicarCambioGestion(db, ruta('X'), null, gestion('SIN_ADMISION'));
    expect((await db.collection(COL).get()).size).toBe(0);
  });

  it('un cambio que no altera el resumen no reescribe', async () => {
    const r = ruta('1007');
    await aplicarCambioGestion(db, r, null, gestion('1007'));
    const res = await aplicarCambioGestion(db, r, gestion('1007'), { ...gestion('1007'), observacion: 'OTRA NOTA' });
    expect(res).toEqual({ 1007: 'sin cambios' });
  });
});

describe('script inicial (recontar)', () => {
  it('simula sin escribir; al aplicar marca las admisiones y desmarca las que ya no tienen gestiones', async () => {
    await db.doc(ruta('2001')).set(gestion('2001', [item('CARGADO')]));
    await db.doc(ruta('2001', 'B', 'g2')).set(gestion('2001', [item('CARGADO')]));
    await db.doc(ruta('2002')).set(gestion('2002'));
    await db.doc(ruta('P')).set(gestion('P'));
    await db.collection(COL).doc('9999').set({ admision: 9999, gestiones: {}, estado: 'gestionada' }); // sobrante
    const sim = await recontar(db);
    expect(sim).toMatchObject({ totalGestiones: 4, sinAdmision: 1, sobrantes: ['9999'] });
    expect(await marca('2001')).toBeUndefined();
    await recontar(db, { aplicar: true });
    expect(await marca('2001')).toMatchObject({ estado: 'cargada', cantidad: 2 });
    expect(await marca('2002')).toMatchObject({ estado: 'gestionada' });
    expect(await marca('9999')).toBeUndefined();
  });
});
