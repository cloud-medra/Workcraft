import { describe, it, expect, vi, beforeEach } from 'vitest';

// Firestore en memoria: la transacción aplica las escrituras solo si la
// función termina sin error.
const datos = new Map();
let autoId = 0;
const ref = (path) => ({ path, id: path.split('/').pop() });

vi.mock('../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...seg) => ({ path: seg.join('/') }),
  doc: (base, ...seg) => (base && base.path !== undefined && seg.length === 0 ? ref(`${base.path}/auto${++autoId}`) : ref(seg.join('/'))),
  query: vi.fn(), orderBy: vi.fn(), limit: vi.fn(), getDocs: vi.fn(),
  serverTimestamp: () => 'TS',
  runTransaction: async (_db, fn) => {
    const escrituras = [];
    const tx = {
      get: async (r) => ({ exists: () => datos.has(r.path), data: () => datos.get(r.path) }),
      set: (r, v) => escrituras.push(() => datos.set(r.path, v)),
      update: (r, v) => escrituras.push(() => datos.set(r.path, { ...datos.get(r.path), ...v }))
    };
    const res = await fn(tx);
    escrituras.forEach((w) => w());
    return res;
  }
}));

const { ejecutarTraspasoTransito } = await import('./traspasoTransitoService');
const { mismosItemsTransito } = await import('./traspasoTransito');

const ITEM = { codigoId: 'P1', codigo: 'C-1', referencia: 'REF-1', tipo: 'TORNILLO', lote: 'L1', vencimiento: '2026-12-31', cantidad: 5 };
const linea = (cajaId, cantidadRetirar, nombreCaja = `Caja ${cajaId}`) => ({ idTemp: `${cajaId}#0`, cajaId, nombreCaja, ubicacionOrigen: 'E-1', itemIndex: 0, cantidadRetirar, itemOriginal: { ...ITEM } });
const params = (lineas) => ({ lineas, numeroDocumento: '260007', motivo: 'Traspaso a Tránsito', tipoDestino: 'stock', solicitante: '', observaciones: 'obs', usuario: { nombreCompleto: 'Ana', email: 'a@x.cl' }, origen: 'Egreso por escaneo' });
const transitos = () => [...datos.entries()].filter(([k]) => k.startsWith('inventario_transito/')).map(([, v]) => v);
const logs = (cajaId) => [...datos.entries()].filter(([k]) => k.startsWith(`inventario_general/${cajaId}/logs/`)).map(([, v]) => v);

beforeEach(() => {
  datos.clear();
  datos.set('inventario_general/A', { nombreCaja: 'Caja A', items: [{ ...ITEM }] });
  datos.set('inventario_general/B', { nombreCaja: 'Caja B', items: [{ ...ITEM, cantidad: 3 }] });
});

describe('ejecutarTraspasoTransito', () => {
  it('descuenta de cada caja, deja el log TRASPASO_TRANSITO y crea el registro en tránsito con el origen', async () => {
    await ejecutarTraspasoTransito(params([linea('A', 2), linea('B', 3)]));
    expect(datos.get('inventario_general/A').items[0].cantidad).toBe(3);
    expect(datos.get('inventario_general/B').items[0].cantidad).toBe(0);
    expect(logs('A')[0]).toMatchObject({
      accion: 'TRASPASO_TRANSITO', numeroDocumento: '260007',
      detalles: { tipoDestino: 'Stock General', solicitante: 'No especificado', origen: 'Egreso por escaneo', itemsTrasladados: [{ lote: 'L1', cantidadTraspasada: 2 }] }
    });
    expect(transitos()).toHaveLength(1);
    expect(transitos()[0]).toMatchObject({ estado: 'EN_TRANSITO', origen: 'Egreso por escaneo', totalUnidades: 5, items: [{ nombreCajaOrigen: 'Caja A', cantidadTraspasada: 2 }, { nombreCajaOrigen: 'Caja B', cantidadTraspasada: 3 }] });
  });

  it('stock cambiado durante la transacción: cancela todo y dice qué ítem falló', async () => {
    datos.set('inventario_general/B', { nombreCaja: 'Caja B', items: [{ ...ITEM, cantidad: 1 }] });
    await expect(ejecutarTraspasoTransito(params([linea('A', 2), linea('B', 3)])))
      .rejects.toThrow('Stock insuficiente en Caja B (REF-1): quedan 1.');
    expect(datos.get('inventario_general/A').items[0].cantidad).toBe(5);
    expect(logs('A')).toHaveLength(0);
    expect(transitos()).toHaveLength(0);
  });

  it('sin origen (pantalla Egresos) no agrega el campo', async () => {
    const sinOrigen = params([linea('A', 1)]);
    delete sinOrigen.origen;
    await ejecutarTraspasoTransito(sinOrigen);
    expect(transitos()[0]).not.toHaveProperty('origen');
    expect(logs('A')[0].detalles).not.toHaveProperty('origen');
  });
});

// Lectura "desde el servidor": las claves pueden llegar en otro orden y las
// fechas como Timestamp (no Date), aunque el documento no haya cambiado.
const comoTimestamp = (fecha) => ({ toMillis: () => fecha.getTime(), seconds: Math.floor(fecha.getTime() / 1000) });
const releerDelServidor = (items) => items.map((item) => Object.fromEntries(
  Object.entries(item).reverse().map(([k, v]) => [k, v instanceof Date ? comoTimestamp(v) : v])
));

describe('egreso -> devolución desde Tránsito (verificación de concurrencia)', () => {
  it.each([
    ['Egreso por escaneo', 'Egreso por escaneo'],
    ['Egresos (sin origen)', undefined]
  ])('%s: el documento recién creado se puede devolver sin error', async (_nombre, origen) => {
    const p = params([linea('A', 2)]);
    if (!origen) delete p.origen;
    await ejecutarTraspasoTransito(p);
    const [docTransito] = transitos();
    const vistosEnPantalla = docTransito.items;              // listener de Tránsito
    const leidosEnTransaccion = releerDelServidor(docTransito.items); // tx.get al devolver
    expect(JSON.stringify(leidosEnTransaccion)).not.toBe(JSON.stringify(vistosEnPantalla)); // lo que antes fallaba
    expect(mismosItemsTransito(leidosEnTransaccion, vistosEnPantalla)).toBe(true);
  });

  it('si otro usuario cambió los ítems, la verificación sigue detectándolo', async () => {
    await ejecutarTraspasoTransito(params([linea('A', 2)]));
    const [docTransito] = transitos();
    const modificados = releerDelServidor(docTransito.items).map((it) => ({ ...it, cantidadTraspasada: 1 }));
    expect(mismosItemsTransito(modificados, docTransito.items)).toBe(false);
    expect(mismosItemsTransito([], docTransito.items)).toBe(false);
  });
});
