// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Firestore en memoria: ruta -> datos ---
const almacen = new Map();

vi.mock('../firebaseConfig.js', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
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
        data: () => structuredClone(almacen.get(ref.path))
      }),
      update: (ref, datos) => escrituras.push([ref.path, datos])
    };
    await fn(tx);
    escrituras.forEach(([r, datos]) => almacen.set(r, { ...almacen.get(r), ...datos }));
  }
}));

const { aplicarTotalesTexto, revertirTotalesTexto } = await import('./migracionNumeros.js');

const LAB = 'laboratorio_imputadas/2026/meses/agosto/documentos';
const DOCS_LAB = 'laboratorio_documentos/2026/meses/agosto/documentos';

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
});

describe('aplicarTotalesTexto (paso 1: total de imputadas)', () => {
  it('sin confirmar no escribe; lista NO seguros; con el código convierte solo los seguros', async () => {
    const plan = await aplicarTotalesTexto(2026);
    expect(plan.cambios).toBe(1);
    expect(plan.noSeguros.map((n) => n.clave)).toEqual([`${LAB}/c|total`]);
    expect(almacen.get(`${LAB}/a`).total).toBe('762909');

    const r = await aplicarTotalesTexto(2026, { confirmar: plan.codigo });
    expect(r.actualizados).toBe(1);
    expect(almacen.get(`${LAB}/a`)).toEqual({ total: 762909, folio: '1' });
    expect(almacen.get(`${LAB}/c`).total).toBe('1.234.567');
    // El paso 1 no toca *_documentos.
    expect(almacen.get(`${DOCS_LAB}/x`).total).toBe('100');
  });

  it('un NO seguro solo se escribe si se aprueba explícitamente', async () => {
    const plan = await aplicarTotalesTexto(2026, { aprobados: { [`${LAB}/c|total`]: 1234567 } });
    await aplicarTotalesTexto(2026, { confirmar: plan.codigo });
    expect(almacen.get(`${LAB}/c`).total).toBe(1234567);
  });

  it('omite los documentos que cambiaron entre el plan y la confirmación', async () => {
    const plan = await aplicarTotalesTexto(2026);
    almacen.set(`${LAB}/a`, { total: '999' });
    const r = await aplicarTotalesTexto(2026, { confirmar: plan.codigo });
    expect(r.omitidos).toEqual([`${LAB}/a`]);
    expect(almacen.get(`${LAB}/a`).total).toBe('999');
  });

  it('el código se usa una sola vez', async () => {
    const plan = await aplicarTotalesTexto(2026);
    await aplicarTotalesTexto(2026, { confirmar: plan.codigo });
    await expect(aplicarTotalesTexto(2026, { confirmar: plan.codigo })).rejects.toThrow(/desconocido/);
  });

  it('revertir restaura el valor original solo si no fue modificado después', async () => {
    const plan = await aplicarTotalesTexto(2026, { aprobados: { [`${LAB}/c|total`]: 1234567 } });
    await aplicarTotalesTexto(2026, { confirmar: plan.codigo });
    almacen.set(`${LAB}/c`, { total: 5 }); // editado después por otra persona

    const rev = await revertirTotalesTexto();
    const r = await revertirTotalesTexto(undefined, { confirmar: rev.codigo });
    expect(almacen.get(`${LAB}/a`).total).toBe('762909');
    expect(almacen.get(`${LAB}/c`).total).toBe(5);
    expect(r.omitidos).toEqual([`${LAB}/c`]);
  });
});

describe('aplicarTotalesTexto (paso 2: documentos de origen y detalles)', () => {
  it('convierte total y detalles de *_documentos sin tocar otros campos', async () => {
    const plan = await aplicarTotalesTexto(2026, { paso: 2 });
    await aplicarTotalesTexto(2026, { confirmar: plan.codigo });
    expect(almacen.get(`${DOCS_LAB}/x`)).toEqual({
      total: 100,
      detalles: [{ cantidad: 2, precio: 50, monto: 100, codigo: '001' }]
    });
  });
});
