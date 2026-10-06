import { describe, it, expect, vi, beforeEach } from 'vitest';

// Firestore en memoria: rutas -> datos; la transacción aplica las
// escrituras solo si la función termina sin error.
const datos = new Map();
let autoId = 0;
const ref = (path) => ({ path, id: path.split('/').pop() });
const snap = (r) => ({ id: r.id, exists: () => datos.has(r.path), data: () => datos.get(r.path) });
const hijosDirectos = (col) => [...datos.keys()].filter((k) => k.startsWith(`${col}/`) && k.split('/').length === col.split('/').length + 1);

vi.mock('../../../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...seg) => ({ path: seg.join('/') }),
  doc: (base, ...seg) => (base && base.path !== undefined && seg.length === 0 ? ref(`${base.path}/auto${++autoId}`) : ref(seg.join('/'))),
  getDoc: async (r) => snap(r),
  getDocs: async (q) => ({ docs: hijosDirectos(q.path).map((k) => snap(ref(k))) }),
  query: (c) => c, orderBy: vi.fn(), limit: vi.fn(), onSnapshot: vi.fn(),
  serverTimestamp: () => 'TS',
  updateDoc: async (r, v) => datos.set(r.path, { ...datos.get(r.path), ...v }),
  runTransaction: async (_db, fn) => {
    const escrituras = [];
    const tx = {
      get: async (r) => snap(r),
      set: (r, v) => escrituras.push(() => datos.set(r.path, v)),
      update: (r, v) => escrituras.push(() => datos.set(r.path, { ...datos.get(r.path), ...v }))
    };
    const res = await fn(tx);
    escrituras.forEach((w) => w());
    return res;
  }
}));

const svc = await import('./inventarioFisicoService');
const { esperadoDeItems, lineaDeConteo, sumarAlConteo, ESTADOS_AJUSTE } = await import('../utils/inventarioFisico');

const USUARIO = { nombreCompleto: 'Ana', email: 'ana@x.cl' };
const P1 = { id: 'P1', codigo: 'C-1', referencia: 'REF-1', descriptorAuto: 'TORNILLO' };
const ITEM = { codigoId: 'P1', codigo: 'C-1', referencia: 'REF-1', tipo: 'TORNILLO', precio: 100, cantidad: 5, lote: 'L1', vencimiento: '2026-12-31' };
const logs = (cajaId) => [...datos.entries()].filter(([k]) => k.startsWith(`inventario_general/${cajaId}/logs/`)).map(([, v]) => v);

const contarCaja = async (inventarioId, cajaId, n, sesion = 'S1') => {
  const caja = await svc.iniciarOTomarCaja({ inventarioId, cajaId, usuario: USUARIO, sesion });
  const conteo = sumarAlConteo([], lineaDeConteo(caja.esperado, P1, { lote: 'L1', vencimiento: '2026-12-31' }), n);
  await svc.guardarConteoCaja(inventarioId, cajaId, conteo, sesion);
  await svc.finalizarCaja({ inventarioId, cajaId, esperado: caja.esperado, conteo, usuario: USUARIO, sesion });
};

beforeEach(() => {
  datos.clear();
  datos.set('inventario_general/A', { nombreCaja: 'Caja A', ubicacion: 'E-1', items: [{ ...ITEM }] });
  datos.set('inventario_general/B', { nombreCaja: 'Caja B', ubicacion: 'E-2', items: [{ ...ITEM, cantidad: 2 }] });
  datos.set('inventario_general/C', { nombreCaja: 'Caja C', items: [{ ...ITEM, cantidad: 1 }] });
});

describe('inventario por cajas (servicio)', () => {
  it('solo un inventario en curso a la vez', async () => {
    const id = await svc.iniciarInventario({ nombre: 'Oct', fecha: '2026-10-06', usuario: USUARIO });
    expect(datos.get('inventarios_fisicos/_control').inventarioEnCurso).toBe(id);
    expect(datos.get(`inventarios_fisicos/${id}`)).toMatchObject({ estado: 'EN_CURSO', conteoCiego: true, iniciadoPor: { nombre: 'Ana' } });
    await expect(svc.iniciarInventario({ nombre: 'Otro', fecha: '2026-10-07', usuario: USUARIO })).rejects.toThrow(/Ya hay un inventario en curso/);
  });

  it('al iniciar la caja guarda la foto del stock esperado; otro equipo que la retoma impide guardar al primero', async () => {
    const id = await svc.iniciarInventario({ nombre: 'Oct', fecha: '2026-10-06', usuario: USUARIO });
    const caja = await svc.iniciarOTomarCaja({ inventarioId: id, cajaId: 'A', usuario: USUARIO, sesion: 'S1' });
    expect(caja).toMatchObject({ estado: 'EN_CONTEO', esperado: esperadoDeItems([ITEM]), fotoItems: [ITEM] });
    await svc.iniciarOTomarCaja({ inventarioId: id, cajaId: 'A', usuario: { nombreCompleto: 'Beto' }, sesion: 'S2' });
    await expect(svc.guardarConteoCaja(id, 'A', [], 'S1')).rejects.toThrow(svc.ERROR_OTRA_SESION);
    await expect(svc.guardarConteoCaja(id, 'A', [], 'S2')).resolves.toBeUndefined();
  });

  it('caja con movimientos durante el conteo: se detecta, no se ajusta y queda para revisar', async () => {
    const id = await svc.iniciarInventario({ nombre: 'Oct', fecha: '2026-10-06', usuario: USUARIO });
    await contarCaja(id, 'A', 4);
    const docCaja = datos.get(`inventarios_fisicos/${id}/cajas/A`);
    expect((await svc.revisarMovimientosCaja(docCaja)).cambio).toBe(false);

    // Un egreso descuenta de la caja mientras tanto.
    datos.set('inventario_general/A', { ...datos.get('inventario_general/A'), items: [{ ...ITEM, cantidad: 3 }] });
    expect((await svc.revisarMovimientosCaja(docCaja)).cambio).toBe(true);

    const res = await svc.finalizarInventario({ inventarioId: id, cajasStock: [{ id: 'A', nombreCaja: 'Caja A' }], usuario: USUARIO });
    expect(res.resultados[0].estadoAjuste).toBe(ESTADOS_AJUSTE.CON_MOVIMIENTOS);
    expect(datos.get('inventario_general/A').items[0].cantidad).toBe(3);
    expect(logs('A')).toHaveLength(0);
    expect(res.resumen.cajasConMovimientos).toEqual(['Caja A']);
  });

  it('finalizar inventario: ajusta cada caja a lo contado, deja AJUSTE_INVENTARIO y cierra el inventario', async () => {
    const id = await svc.iniciarInventario({ nombre: 'Oct', fecha: '2026-10-06', usuario: USUARIO });
    await contarCaja(id, 'A', 4); // faltan 1
    await contarCaja(id, 'B', 2); // cuadrada
    // C queda pendiente: no se ajusta
    const cajasStock = [{ id: 'A', nombreCaja: 'Caja A' }, { id: 'B', nombreCaja: 'Caja B' }, { id: 'C', nombreCaja: 'Caja C' }];
    const res = await svc.finalizarInventario({ inventarioId: id, cajasStock, usuario: USUARIO });

    expect(res.finalizado).toBe(true);
    expect(datos.get('inventario_general/A').items[0].cantidad).toBe(4);
    expect(datos.get('inventario_general/B').items[0].cantidad).toBe(2);
    expect(datos.get('inventario_general/C').items[0].cantidad).toBe(1);
    expect(res.resultados.map((r) => r.estadoAjuste)).toEqual([ESTADOS_AJUSTE.AJUSTADA, ESTADOS_AJUSTE.SIN_DIFERENCIAS]);
    expect(logs('A')).toEqual([expect.objectContaining({
      accion: 'AJUSTE_INVENTARIO', inventarioId: id, usuario: 'Ana',
      detalles: expect.objectContaining({ inventarioId: id, lote: 'L1', cantidadAnterior: 5, cantidadNueva: 4, diferencia: -1 })
    })]);
    expect(logs('B')).toHaveLength(0);
    expect(res.sinFinalizar).toEqual([{ cajaId: 'C', nombreCaja: 'Caja C', ubicacion: '', estado: 'PENDIENTE' }]);
    expect(datos.get(`inventarios_fisicos/${id}`)).toMatchObject({ estado: 'FINALIZADO', finalizadoPor: { nombre: 'Ana' }, resumenFinal: { cajasContadas: 2, cajasAjustadas: 1 } });
    expect(datos.get('inventarios_fisicos/_control').inventarioEnCurso).toBeNull();
  });

  it('reintento: una caja ya ajustada no se vuelve a ajustar', async () => {
    const id = await svc.iniciarInventario({ nombre: 'Oct', fecha: '2026-10-06', usuario: USUARIO });
    await contarCaja(id, 'A', 4);
    const docCaja = datos.get(`inventarios_fisicos/${id}/cajas/A`);
    await svc.ajustarCajaEnTransaccion({ inventarioId: id, cajaInventario: docCaja, usuario: USUARIO });
    await svc.ajustarCajaEnTransaccion({ inventarioId: id, cajaInventario: docCaja, usuario: USUARIO });
    expect(logs('A')).toHaveLength(1);
    expect(datos.get('inventario_general/A').items[0].cantidad).toBe(4);
  });
});
