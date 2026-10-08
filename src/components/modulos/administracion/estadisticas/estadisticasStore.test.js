import { describe, it, expect, vi, beforeEach } from 'vitest';

const getDoc = vi.fn();
vi.mock('firebase/firestore', () => ({ doc: (_db, col, id) => `${col}/${id}`, getDoc: (ref) => getDoc(ref) }));
vi.mock('../../../../firebaseConfig', () => ({ db: {} }));
const snap = (data) => ({ exists: () => Boolean(data), data: () => data });

import { obtenerPeriodo, obtenerIndice, invalidarPeriodo, limpiarCacheEstadisticas } from './estadisticasStore';

beforeEach(() => { limpiarCacheEstadisticas(); getDoc.mockReset(); });

describe('estadisticasStore', () => {
  it('cada documento se lee una sola vez por sesión (getDoc, sin listeners)', async () => {
    getDoc.mockImplementation(async (ref) => snap(ref === 'estadisticas/implantes_2026-10' ? { partes: 1, t: {} } : null));
    await obtenerPeriodo('implantes', '2026-10');
    await obtenerPeriodo('implantes', '2026-10');
    await Promise.all([obtenerIndice(), obtenerIndice()]);
    expect(getDoc.mock.calls.map((c) => c[0])).toEqual(['estadisticas/implantes_2026-10', 'estadisticas/_indice']);
    expect(await obtenerPeriodo('consignacion', '2026-10')).toBeNull();
  });

  it('lee las partes de un período dividido y las devuelve juntas', async () => {
    getDoc.mockImplementation(async (ref) => snap({ 'estadisticas/implantes_2026-10': { partes: 3, t: { a: 1 } }, 'estadisticas/implantes_2026-10__p1': { t: { b: 1 } }, 'estadisticas/implantes_2026-10__p2': { t: { c: 1 } } }[ref]));
    const d = await obtenerPeriodo('implantes', '2026-10');
    expect(d.piezas.map((p) => Object.keys(p.t)[0])).toEqual(['a', 'b', 'c']);
  });

  it('tras recalcular se vuelve a leer ese período y el índice', async () => {
    getDoc.mockImplementation(async () => snap({ partes: 1, t: {} }));
    await obtenerPeriodo('implantes', '2026-09');
    await obtenerIndice();
    invalidarPeriodo('implantes', '2026-09');
    await obtenerPeriodo('implantes', '2026-09');
    await obtenerIndice();
    expect(getDoc).toHaveBeenCalledTimes(4);
  });

  it('un error no queda en caché', async () => {
    getDoc.mockRejectedValueOnce(new Error('red')).mockResolvedValue(snap({ partes: 1, t: {} }));
    await expect(obtenerPeriodo('implantes', '2026-08')).rejects.toThrow('red');
    expect(await obtenerPeriodo('implantes', '2026-08')).not.toBeNull();
  });
});
