import { describe, it, expect, vi, beforeEach } from 'vitest';

// Firestore simulado: documentos en memoria y transacción que aplica las
// escrituras solo si la función termina sin error.
const datos = new Map();
let autoId = 0;
const ref = (path) => ({ path, id: path.split('/').pop() });

vi.mock('../../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...seg) => ({ path: seg.map((s) => (typeof s === 'string' ? s : s.path)).join('/') }),
  doc: (base, ...seg) => {
    if (base && base.path !== undefined && seg.length === 0) return ref(`${base.path}/auto${++autoId}`);
    if (base && base.path !== undefined) return ref([base.path, ...seg].join('/'));
    return ref(seg.join('/'));
  },
  getDoc: async (r) => ({ id: r.id, exists: () => datos.has(r.path), data: () => datos.get(r.path) }),
  serverTimestamp: () => 'TS',
  runTransaction: async (_db, fn) => {
    const escrituras = [];
    const tx = {
      get: async (r) => ({ id: r.id, exists: () => datos.has(r.path), data: () => datos.get(r.path) }),
      set: (r, v) => escrituras.push(() => datos.set(r.path, v)),
      update: (r, v) => escrituras.push(() => datos.set(r.path, { ...datos.get(r.path), ...v }))
    };
    const res = await fn(tx);
    escrituras.forEach((w) => w());
    return res;
  }
}));

const { guardarIngresoEscaneo, leerVinculo } = await import('./escaneoInventarioService');

const PRODUCTO = { id: 'P1', codigo: 'C-1', referencia: 'REF-1', descriptorAuto: 'TORNILLO', precioNeto: 100 };
const ITEM = { codigoId: 'P1', codigo: 'C-1', referencia: 'REF-1', tipo: 'TORNILLO', precio: 100, cantidad: 2, lote: 'L1', vencimiento: '2026-12-31' };
const USUARIO = { nombreCompleto: 'Ana', email: 'ana@x.cl' };
const logs = (cajaId) => [...datos.entries()].filter(([k]) => k.startsWith(`inventario_general/${cajaId}/logs/`)).map(([, v]) => v);

beforeEach(() => {
  datos.clear();
  datos.set('inventario_general/CAJA1', { nombreCaja: 'Caja 1', ubicacion: 'A-1', items: [{ ...ITEM, cantidad: 5 }] });
});

describe('guardarIngresoEscaneo', () => {
  it('caja existente: suma al mismo lote, deja log INGRESO_ESCANEO y vincula varios códigos al producto', async () => {
    const res = await guardarIngresoEscaneo({
      cajaId: 'CAJA1', producto: PRODUCTO, item: ITEM, usuario: USUARIO,
      codigos: [{ clave: 'A', codigo: 'A' }, { clave: 'B', codigo: 'B' }]
    });
    expect(res).toMatchObject({ cajaId: 'CAJA1', sumado: true, vinculosEscritos: 2 });
    expect(datos.get('inventario_general/CAJA1').items).toHaveLength(1);
    expect(datos.get('inventario_general/CAJA1').items[0].cantidad).toBe(7);
    expect(logs('CAJA1')[0]).toMatchObject({ accion: 'INGRESO_ESCANEO', detalles: { origen: 'Inventario por escaneo', codigosBarra: ['A', 'B'] } });
    expect(await leerVinculo('A')).toMatchObject({ productoId: 'P1', referencia: 'REF-1' });
    expect(await leerVinculo('B')).toMatchObject({ productoId: 'P1' });
  });

  it('caja nueva: la crea con la estructura de Stock General y su log CREACION', async () => {
    const res = await guardarIngresoEscaneo({
      nuevaCaja: { nombreCaja: ' Caja Nueva ', ubicacion: 'B-2' }, producto: PRODUCTO, item: ITEM, usuario: USUARIO, codigos: []
    });
    const caja = datos.get(`inventario_general/${res.cajaId}`);
    expect(caja).toMatchObject({ nombreCaja: 'Caja Nueva', ubicacion: 'B-2', descripcion: '', items: [ITEM], registradoPor: 'Ana' });
    expect(logs(res.cajaId).map((l) => l.accion)).toEqual(['CREACION', 'INGRESO_ESCANEO']);
  });

  it('código vinculado a otro producto sin confirmar: no guarda nada', async () => {
    datos.set('inventario_codigos_barra/A', { productoId: 'P2', referencia: 'REF-2' });
    await expect(guardarIngresoEscaneo({
      cajaId: 'CAJA1', producto: PRODUCTO, item: ITEM, usuario: USUARIO, codigos: [{ clave: 'A', codigo: 'A' }]
    })).rejects.toThrow(/otro producto/);
    expect(datos.get('inventario_general/CAJA1').items[0].cantidad).toBe(5);
    expect(datos.get('inventario_codigos_barra/A').productoId).toBe('P2');
    expect(logs('CAJA1')).toHaveLength(0);
  });

  it('código vinculado a otro producto con confirmación: se reasigna', async () => {
    datos.set('inventario_codigos_barra/A', { productoId: 'P2' });
    await guardarIngresoEscaneo({
      cajaId: 'CAJA1', producto: PRODUCTO, item: ITEM, usuario: USUARIO,
      codigos: [{ clave: 'A', codigo: 'A', vinculoProductoId: 'P2', reasignar: true }]
    });
    expect(datos.get('inventario_codigos_barra/A')).toMatchObject({ productoId: 'P1', reasignadoDe: 'P2' });
  });

  it('valida cantidad y caja antes de escribir', async () => {
    await expect(guardarIngresoEscaneo({ cajaId: 'CAJA1', producto: PRODUCTO, item: { ...ITEM, cantidad: 0 }, codigos: [] })).rejects.toThrow(/cantidad/);
    await expect(guardarIngresoEscaneo({ nuevaCaja: { nombreCaja: ' ' }, producto: PRODUCTO, item: ITEM, codigos: [] })).rejects.toThrow(/caja/);
    await expect(guardarIngresoEscaneo({ cajaId: 'NO', producto: PRODUCTO, item: ITEM, codigos: [] })).rejects.toThrow(/ya no existe/);
  });
});
