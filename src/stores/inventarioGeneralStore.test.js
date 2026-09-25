import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockOnSnapshot = vi.fn();
const mockUnsubscribe = vi.fn();
let emitir = null;

vi.mock('../firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db, ruta) => ({ path: ruta }),
  onSnapshot: (...a) => mockOnSnapshot(...a),
}));

const store = await import('./inventarioGeneralStore');

beforeEach(() => {
  vi.clearAllMocks();
  mockOnSnapshot.mockImplementation((_ref, onNext) => { emitir = onNext; return mockUnsubscribe; });
});

describe('inventarioGeneralStore', () => {
  it('varias pantallas comparten un solo listener y se cierra con la última', () => {
    const soltarA = store.retenerInventarioGeneral();
    const soltarB = store.retenerInventarioGeneral();
    expect(mockOnSnapshot).toHaveBeenCalledTimes(1);

    emitir({ docs: [{ id: 'c1', data: () => ({ nombreCaja: 'A' }) }] });
    expect(store.obtenerEstadoInventarioGeneral().datos).toEqual([{ id: 'c1', nombreCaja: 'A' }]);

    soltarA();
    soltarA(); // soltar dos veces no descuenta de más
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    soltarB();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    expect(store.obtenerEstadoInventarioGeneral().datos).toBeNull();
  });
});
