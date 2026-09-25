// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Firestore en memoria: ruta -> datos ---
const almacen = new Map();

vi.mock('../firebaseConfig.js', () => ({ db: {} }));
// Firestore no garantiza el orden de las claves de un mapa entre lecturas:
// la lectura de la transacción devuelve las claves invertidas para
// reproducirlo (el bug del paso 2 omitía todos los docs con `detalles`).
const invertirClaves = (v) => {
  if (Array.isArray(v)) return v.map(invertirClaves);
  if (v && typeof v === 'object' && v.constructor === Object) {
    return Object.fromEntries(Object.keys(v).reverse().map((k) => [k, invertirClaves(v[k])]));
  }
  return v;
};

vi.mock('firebase/firestore', () => {
  class Timestamp {
    constructor(seconds, nanoseconds) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
    toMillis() { return this.seconds * 1000 + this.nanoseconds / 1e6; }
    toJSON() { return { seconds: this.seconds, nanoseconds: this.nanoseconds, type: 'firestore/timestamp/1.1.0' }; }
  }
  return {
    Timestamp,
    collection: (_db, ...segs) => ({ path: segs.join('/') }),
    doc: (_db, ruta) => ({ path: ruta }),
    getDocs: async ({ path }) => ({
      docs: [...almacen.keys()]
        .filter((r) => r.startsWith(`${path}/`) && r.split('/').length === path.split('/').length + 1)
        .map((r) => ({ ref: { path: r }, data: () => structuredClone(almacen.get(r)) }))
    }),
    runTransaction: async (_db, fn) => {
      const escrituras = [];
      const tx = {
        get: async (ref) => ({
          ref,
          exists: () => almacen.has(ref.path),
          data: () => invertirClaves(almacen.get(ref.path))
        }),
        update: (ref, datos) => escrituras.push([ref.path, datos])
      };
      await fn(tx);
      escrituras.forEach(([r, datos]) => almacen.set(r, { ...almacen.get(r), ...datos }));
    }
  };
});

const { migrarTotales, revertirMigracion, iguales } = await import('./migracionNumeros.js');
const { Timestamp } = await import('firebase/firestore');

const LAB = 'laboratorio_imputadas/2026/meses/agosto/documentos';
const DOCS_LAB = 'laboratorio_documentos/2026/meses/agosto/documentos';
let confirmar;

beforeEach(() => {
  almacen.clear();
  almacen.set(`${LAB}/a`, { total: '762909', folio: '1' });
  almacen.set(`${LAB}/b`, { total: 300000 });
  almacen.set(`${LAB}/c`, { total: '1.234.567' });
  almacen.set(`${DOCS_LAB}/x`, { total: '100', detalles: [{ cantidad: '2', precio: '50', monto: '100', codigo: '001' }] });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'table').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:x');
  globalThis.URL.revokeObjectURL = vi.fn();
  confirmar = vi.fn(() => true);
  window.confirm = confirmar;
});

describe('iguales', () => {
  it('ignora el orden de las claves y compara Timestamp con su forma JSON', () => {
    expect(iguales([{ a: 1, b: '2' }], [{ b: '2', a: 1 }])).toBe(true);
    expect(iguales({ f: new Timestamp(5, 1) }, { f: { seconds: 5, nanoseconds: 1, type: 'x' } })).toBe(true);
    expect(iguales([{ a: 1 }], [{ a: '1' }])).toBe(false);
    expect(iguales([{ a: 1 }, { a: 2 }], [{ a: 2 }, { a: 1 }])).toBe(false);
  });
});

describe('migrarTotales (paso 1: total de imputadas)', () => {
  it('descarga respaldo, pide confirmación y convierte solo los seguros', async () => {
    const r = await migrarTotales(2026);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(confirmar).toHaveBeenCalledWith(expect.stringMatching(/^¿Aplicar 1 cambios en 1 documentos\? Se descargó un respaldo/));
    expect(r.actualizados).toBe(1);
    expect(r.noSeguros.map((n) => n.clave)).toEqual([`${LAB}/c|total`]);
    expect(almacen.get(`${LAB}/a`)).toEqual({ total: 762909, folio: '1' });
    expect(almacen.get(`${LAB}/c`).total).toBe('1.234.567');
    // El paso 1 no toca *_documentos.
    expect(almacen.get(`${DOCS_LAB}/x`).total).toBe('100');
  });

  it('Cancelar no escribe nada', async () => {
    confirmar.mockReturnValue(false);
    const r = await migrarTotales(2026);
    expect(r).toEqual({ cancelado: true });
    expect(almacen.get(`${LAB}/a`).total).toBe('762909');
  });

  it('un NO seguro solo se escribe si se aprueba explícitamente', async () => {
    await migrarTotales(2026, { aprobados: { [`${LAB}/c|total`]: 1234567 } });
    expect(almacen.get(`${LAB}/c`).total).toBe(1234567);
  });

  it('omite los documentos que cambiaron mientras la ventana estaba abierta', async () => {
    confirmar.mockImplementation(() => { almacen.set(`${LAB}/a`, { total: '999' }); return true; });
    const r = await migrarTotales(2026);
    expect(r.omitidos).toEqual([`${LAB}/a`]);
    expect(almacen.get(`${LAB}/a`).total).toBe('999');
  });

  it('revertirMigracion restaura solo lo que no fue modificado después', async () => {
    await migrarTotales(2026, { aprobados: { [`${LAB}/c|total`]: 1234567 } });
    almacen.set(`${LAB}/c`, { total: 5 }); // editado después por otra persona

    const r = await revertirMigracion();
    expect(confirmar).toHaveBeenLastCalledWith('¿Revertir 2 documentos a sus valores originales?');
    expect(almacen.get(`${LAB}/a`).total).toBe('762909');
    expect(almacen.get(`${LAB}/c`).total).toBe(5);
    expect(r.omitidos).toEqual([`${LAB}/c`]);
  });

  it('revertirMigracion con Cancelar no escribe', async () => {
    await migrarTotales(2026);
    confirmar.mockReturnValue(false);
    await revertirMigracion();
    expect(almacen.get(`${LAB}/a`).total).toBe(762909);
  });
});

describe('migrarTotales (paso 2: documentos de origen y detalles)', () => {
  it('NO omite un documento con detalles que no cambió (aunque las claves vengan en otro orden)', async () => {
    const IMP = 'laboratorio_imputadas/2026/meses/agosto/documentos';
    almacen.set(`${IMP}/y`, {
      total: 500,
      detalles: [
        { nroLin: '1', codigo: 'A', cantidad: '3', precio: '100', monto: '300', fecha: new Timestamp(10, 0) },
        { nroLin: '2', codigo: 'B', cantidad: 2, precio: 100, monto: 200 }
      ]
    });
    const r = await migrarTotales(2026, { paso: 2 });
    expect(r.omitidos).toEqual([]);
    expect(almacen.get(`${IMP}/y`).detalles[0]).toMatchObject({ cantidad: 3, precio: 100, monto: 300, codigo: 'A' });
    expect(almacen.get(`${IMP}/y`).detalles[1]).toMatchObject({ cantidad: 2, codigo: 'B' });
  });

  it('revertir desde el JSON descargado restaura detalles y rehidrata los Timestamp', async () => {
    const IMP = 'laboratorio_imputadas/2026/meses/agosto/documentos';
    almacen.set(`${IMP}/y`, { detalles: [{ cantidad: '3', fecha: new Timestamp(10, 0) }] });
    await migrarTotales(2026, { paso: 2 });
    const blob = URL.createObjectURL.mock.calls.at(-1)[0];
    const respaldo = JSON.parse(await blob.text());
    expect(respaldo.documentos.find((d) => d.ruta === `${IMP}/y`).antes.detalles[0].fecha).toMatchObject({ seconds: 10 });

    const r = await revertirMigracion(respaldo);
    expect(r.omitidos).toEqual([]);
    const restaurado = almacen.get(`${IMP}/y`).detalles[0];
    expect(restaurado.cantidad).toBe('3');
    expect(restaurado.fecha).toBeInstanceOf(Timestamp);
  });

  it('convierte total y detalles de *_documentos sin tocar otros campos', async () => {
    await migrarTotales(2026, { paso: 2 });
    expect(almacen.get(`${DOCS_LAB}/x`)).toEqual({
      total: 100,
      detalles: [{ cantidad: 2, precio: 50, monto: 100, codigo: '001' }]
    });
  });
});
