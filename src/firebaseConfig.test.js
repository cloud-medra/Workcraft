// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- SDK simulado: cada initializeFirestore devuelve una instancia nueva ---
const mockInitialize = vi.fn();
const mockTerminate = vi.fn();
const mockClear = vi.fn();

vi.mock('firebase/app', () => ({ initializeApp: () => ({}) }));
vi.mock('firebase/auth', () => ({ getAuth: () => ({}), setPersistence: () => {}, browserSessionPersistence: {} }));
vi.mock('firebase/storage', () => ({ getStorage: () => ({}) }));
vi.mock('firebase/functions', () => ({ getFunctions: () => ({}) }));
vi.mock('firebase/firestore', () => ({
  initializeFirestore: (...a) => mockInitialize(...a),
  persistentLocalCache: () => ({ tipo: 'persistente' }),
  persistentMultipleTabManager: () => ({}),
  memoryLocalCache: () => ({ tipo: 'memoria' }),
  terminate: (...a) => mockTerminate(...a),
  clearIndexedDbPersistence: (...a) => mockClear(...a),
}));

let contador = 0;
const cargarModulo = async () => {
  vi.resetModules();
  return import('./firebaseConfig');
};
const tipoCache = (llamada) => mockInitialize.mock.calls[llamada][1].localCache.tipo;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  contador = 0;
  globalThis.indexedDB = {};
  mockInitialize.mockImplementation(() => ({ instancia: ++contador }));
  mockTerminate.mockResolvedValue();
  mockClear.mockResolvedValue();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('caché persistente de Firestore', () => {
  it('usa caché persistente si hay IndexedDB', async () => {
    const mod = await cargarModulo();
    expect(tipoCache(0)).toBe('persistente');
    expect(mod.db.instancia).toBe(1);
  });

  it('usa caché en memoria si no hay IndexedDB', async () => {
    delete globalThis.indexedDB;
    await cargarModulo();
    expect(tipoCache(0)).toBe('memoria');
  });

  it('si la inicialización persistente falla, cae a memoria', async () => {
    mockInitialize.mockImplementationOnce(() => { throw new Error('boom'); });
    await cargarModulo();
    expect(tipoCache(1)).toBe('memoria');
  });

  it('mismo usuario sin limpieza pendiente: no toca la caché', async () => {
    localStorage.setItem('__fs_cache_uid__', 'A');
    const mod = await cargarModulo();
    await mod.prepararCacheParaUsuario('A');
    expect(mockTerminate).not.toHaveBeenCalled();
    expect(mod.db.instancia).toBe(1);
  });

  it('otro usuario: borra la caché antes de leer y reinicializa (binding vivo)', async () => {
    localStorage.setItem('__fs_cache_uid__', 'A');
    const mod = await cargarModulo();
    await mod.prepararCacheParaUsuario('B');
    expect(mockTerminate).toHaveBeenCalledTimes(1);
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(mod.db.instancia).toBe(2);
    expect(tipoCache(1)).toBe('persistente');
    expect(localStorage.getItem('__fs_cache_uid__')).toBe('B');
  });

  it('otro usuario con la caché abierta en otra pestaña: esta pestaña queda en memoria', async () => {
    localStorage.setItem('__fs_cache_uid__', 'A');
    mockClear.mockRejectedValueOnce({ code: 'failed-precondition' });
    const mod = await cargarModulo();
    await mod.prepararCacheParaUsuario('B');
    expect(tipoCache(1)).toBe('memoria');
    expect(localStorage.getItem('__fs_cache_limpiar__')).toBe('1');
    expect(localStorage.getItem('__fs_cache_uid__')).toBe('A');
  });

  it('limpieza pendiente del mismo usuario que no se puede completar: sigue persistente', async () => {
    localStorage.setItem('__fs_cache_uid__', 'A');
    localStorage.setItem('__fs_cache_limpiar__', '1');
    mockClear.mockRejectedValueOnce({ code: 'failed-precondition' });
    const mod = await cargarModulo();
    await mod.prepararCacheParaUsuario('A');
    expect(tipoCache(1)).toBe('persistente');
  });

  it('llamadas simultáneas (StrictMode) limpian una sola vez', async () => {
    const mod = await cargarModulo();
    await Promise.all([mod.prepararCacheParaUsuario('A'), mod.prepararCacheParaUsuario('A')]);
    expect(mockClear).toHaveBeenCalledTimes(1);
  });

  it('al cerrar sesión borra la caché y olvida el usuario', async () => {
    localStorage.setItem('__fs_cache_uid__', 'A');
    const mod = await cargarModulo();
    await mod.limpiarCacheAlCerrarSesion();
    expect(mockTerminate).toHaveBeenCalledTimes(1);
    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('__fs_cache_uid__')).toBeNull();
    expect(localStorage.getItem('__fs_cache_limpiar__')).toBeNull();
  });

  it('al cerrar sesión con otra pestaña abierta deja la limpieza pendiente', async () => {
    mockClear.mockRejectedValueOnce({ code: 'failed-precondition' });
    const mod = await cargarModulo();
    await mod.limpiarCacheAlCerrarSesion();
    expect(localStorage.getItem('__fs_cache_limpiar__')).toBe('1');
  });
});
