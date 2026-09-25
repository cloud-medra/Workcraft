// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const mockGetDocs = vi.fn();
const mockOnSnapshot = vi.fn();
vi.mock('firebase/firestore', () => ({
  query: (base, ...r) => ({ base, restricciones: r }),
  limit: (n) => ({ limit: n }),
  getDocs: (...a) => mockGetDocs(...a),
  onSnapshot: (...a) => mockOnSnapshot(...a),
}));

const { useFirestoreQuery } = await import('./useFirestoreQuery');
const snap = (ids) => ({ docs: ids.map((id) => ({ id, ref: { path: `c/${id}` }, data: () => ({ n: id }) })) });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDocs.mockResolvedValue(snap(['a', 'b']));
});

describe('useFirestoreQuery', () => {
  it('exige limite (o sinLimite con motivo)', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useFirestoreQuery({ clave: 'x', crearConsulta: () => ({}) }))).toThrow(/limite/);
    expect(() => renderHook(() => useFirestoreQuery({ clave: 'x', crearConsulta: () => ({}), sinLimite: 'catálogo chico' }))).not.toThrow();
  });

  it('modo unica: agrega limit, lee una vez y recargar vuelve a leer', async () => {
    const { result } = renderHook(() => useFirestoreQuery({ clave: 'x', crearConsulta: () => 'base', limite: 2 }));
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(mockGetDocs.mock.calls[0][0]).toEqual({ base: 'base', restricciones: [{ limit: 2 }] });
    expect(result.current.docs).toEqual([{ id: 'a', refPath: 'c/a', n: 'a' }, { id: 'b', refPath: 'c/b', n: 'b' }]);
    expect(result.current.posiblementeHayMas).toBe(true);

    act(() => result.current.recargar());
    expect(result.current.cargando).toBe(true);
    await waitFor(() => expect(result.current.cargando).toBe(false));
    expect(mockGetDocs).toHaveBeenCalledTimes(2);
  });

  it('sin clave no lee', () => {
    const { result } = renderHook(() => useFirestoreQuery({ clave: null, crearConsulta: () => 'base', limite: 5 }));
    expect(mockGetDocs).not.toHaveBeenCalled();
    expect(result.current.cargando).toBe(false);
  });

  it('modo vivo usa onSnapshot y cierra al desmontar', () => {
    const cancelar = vi.fn();
    mockOnSnapshot.mockImplementation((_q, cb) => { cb(snap(['z'])); return cancelar; });
    const { result, unmount } = renderHook(() => useFirestoreQuery({ clave: 'v', crearConsulta: () => 'base', limite: 10, modo: 'vivo' }));
    expect(result.current.docs.map((d) => d.id)).toEqual(['z']);
    expect(result.current.cargando).toBe(false);
    unmount();
    expect(cancelar).toHaveBeenCalled();
  });
});
