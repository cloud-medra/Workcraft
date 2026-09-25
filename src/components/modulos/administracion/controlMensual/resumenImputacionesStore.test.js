import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetDocs = vi.fn();
const mockAggregate = vi.fn();
const mockSnapshotLazy = vi.fn();

vi.mock('../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('./snapshotMensual', () => ({ obtenerSnapshotMensual: (...a) => mockSnapshotLazy(...a) }));
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...p) => ({ path: p.join('/') }),
  query: (ref, ...r) => ({ ref, r }),
  where: (campo, op, valor) => ({ campo, op, valor }),
  getDocs: (...a) => mockGetDocs(...a),
  getAggregateFromServer: (...a) => mockAggregate(...a),
  count: () => 'count',
  sum: (campo) => `sum:${campo}`
}));

const { obtenerCelda, invalidarResumenAnio } = await import('./resumenImputacionesStore');

beforeEach(() => {
  vi.clearAllMocks();
  invalidarResumenAnio('2026');
  mockGetDocs.mockResolvedValue({
    docs: [{ id: '2026_agosto_implantes', data: () => ({ cantidad: 10, montoTotal: 1000 }) },
      { id: '2026_julio_implantes', data: () => ({ cantidad: 5, montoTotal: 500 }) }]
  });
  mockAggregate.mockResolvedValue({ data: () => ({ cantidad: 342, montoTotal: 74075605 }) });
  mockSnapshotLazy.mockResolvedValue({ cantidad: 1, montoTotal: 2 });
});
afterEach(() => vi.useRealTimers());

describe('resumenImputacionesStore', () => {
  it('mes nunca abierto: 0 sin leer', async () => {
    expect(await obtenerCelda('2026', 'implantes', 'marzo', undefined)).toEqual({ cantidad: 0, montoTotal: 0 });
    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(mockAggregate).not.toHaveBeenCalled();
  });

  it('meses cerrados: una sola consulta de snapshots por año', async () => {
    const [a, b] = await Promise.all([
      obtenerCelda('2026', 'implantes', 'agosto', 'CERRADO'),
      obtenerCelda('2026', 'implantes', 'julio', 'CERRADO')
    ]);
    expect(a).toEqual({ cantidad: 10, montoTotal: 1000 });
    expect(b).toEqual({ cantidad: 5, montoTotal: 500 });
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(mockGetDocs.mock.calls[0][0].r[0]).toEqual({ campo: 'anio', op: '==', valor: '2026' });
  });

  it('mes cerrado sin snapshot: se calcula una vez con el fallback existente', async () => {
    expect(await obtenerCelda('2026', 'laboratorio', 'agosto', 'CERRADO')).toEqual({ cantidad: 1, montoTotal: 2 });
    expect(mockSnapshotLazy).toHaveBeenCalledWith('laboratorio', '2026', 'agosto');
  });

  it('mes abierto: count()/sum(total) y se reutiliza durante 5 minutos', async () => {
    vi.useFakeTimers();
    expect(await obtenerCelda('2026', 'implantes', 'septiembre', 'ABIERTO')).toEqual({ cantidad: 342, montoTotal: 74075605 });
    expect(mockAggregate.mock.calls[0][0].path).toBe('implantes_imputadas/2026/meses/septiembre/documentos');
    expect(mockAggregate.mock.calls[0][1]).toEqual({ cantidad: 'count', montoTotal: 'sum:total' });

    await obtenerCelda('2026', 'implantes', 'septiembre', 'ABIERTO');
    expect(mockAggregate).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5 * 60 * 1000 + 1);
    await obtenerCelda('2026', 'implantes', 'septiembre', 'ABIERTO');
    expect(mockAggregate).toHaveBeenCalledTimes(2);
  });

  it('si cambia el estado del mes (cerrado -> reabierto) se recalcula', async () => {
    await obtenerCelda('2026', 'implantes', 'agosto', 'CERRADO');
    await obtenerCelda('2026', 'implantes', 'agosto', 'REABIERTO');
    expect(mockAggregate).toHaveBeenCalledTimes(1);
  });

  it('invalidarResumenAnio fuerza nuevas lecturas', async () => {
    await obtenerCelda('2026', 'implantes', 'agosto', 'CERRADO');
    invalidarResumenAnio('2026');
    await obtenerCelda('2026', 'implantes', 'agosto', 'CERRADO');
    expect(mockGetDocs).toHaveBeenCalledTimes(2);
  });
});
