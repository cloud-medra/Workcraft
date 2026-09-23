// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useControlMensualData, MENSAJE_ERROR_CIERRE_GENERICO } from './useControlMensualData';

const mockCerrarPeriodo = vi.fn();
const mockHttpsCallable = vi.fn(() => mockCerrarPeriodo);
let estadosCierres = [];

vi.mock('../../../../firebaseConfig', () => ({ db: {}, functions: { _tipo: 'functions' } }));
vi.mock('firebase/functions', () => ({ httpsCallable: (...args) => mockHttpsCallable(...args) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(),
  getDocs: vi.fn(async () => ({ size: 0, docs: [] })),
  query: vi.fn(() => ({})),
  where: vi.fn(),
  onSnapshot: vi.fn((_q, cb) => { cb({ docs: estadosCierres.map(d => ({ id: d.id, data: () => d })) }); return () => {}; }),
  arrayUnion: vi.fn(),
  serverTimestamp: vi.fn(),
  writeBatch: vi.fn()
}));

const mockGuardarSnapshot = vi.fn();
vi.mock('./snapshotMensual', () => ({
  calcularTotalMesDesdeDocumentos: vi.fn(async () => 1000),
  guardarSnapshotMensual: (...args) => mockGuardarSnapshot(...args),
  invalidarSnapshotMensual: vi.fn()
}));

const showToast = vi.fn();
const confirmAction = vi.fn();

const montar = async () => {
  const { result } = renderHook(() => useControlMensualData('2026', { uid: 'u1' }, showToast, confirmAction));
  await act(async () => {});
  return result;
};

describe('useControlMensualData — cierre de mes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCerrarPeriodo.mockResolvedValue({ data: {} });
    estadosCierres = [
      { id: '2026_septiembre_implantes', anio: '2026', mes: 'septiembre', modulo: 'implantes', estado: 'ABIERTO' },
      { id: '2026_septiembre_consignacion', anio: '2026', mes: 'septiembre', modulo: 'consignacion', estado: 'REABIERTO' },
      { id: '2026_septiembre_laboratorio', anio: '2026', mes: 'septiembre', modulo: 'laboratorio', estado: 'CERRADO' }
    ];
  });

  it('presionar "Cerrar" solo abre el modal: no cierra nada ni usa la confirmación simple', async () => {
    const result = await montar();
    act(() => { result.current.handleCerrarMes('septiembre', 'implantes'); });
    expect(result.current.solicitudCierre).toEqual({ mesId: 'septiembre', modulos: ['implantes'] });
    expect(mockCerrarPeriodo).not.toHaveBeenCalled();
    expect(confirmAction).not.toHaveBeenCalled();
  });

  it('"Cerrar Todos" abre el modal solo con los módulos abiertos/reabiertos del mes', async () => {
    const result = await montar();
    act(() => { result.current.handleCerrarTodos('septiembre'); });
    expect(result.current.solicitudCierre).toEqual({ mesId: 'septiembre', modulos: ['implantes', 'consignacion'] });
  });

  it('al confirmar, envía a la Cloud Function el período y lo escrito por el usuario, y luego guarda el snapshot', async () => {
    const result = await montar();
    act(() => { result.current.handleCerrarTodos('septiembre'); });

    let resultado;
    await act(async () => { resultado = await result.current.ejecutarCierre({ anioIngresado: '2026', mesIngresado: '9' }); });

    expect(mockHttpsCallable).toHaveBeenCalledWith({ _tipo: 'functions' }, 'cerrarPeriodoImputacion');
    expect(mockCerrarPeriodo).toHaveBeenCalledWith({
      anio: '2026', mes: 'septiembre', modulos: ['implantes', 'consignacion'], anioIngresado: '2026', mesIngresado: '9'
    });
    expect(mockGuardarSnapshot).toHaveBeenCalledTimes(2);
    expect(resultado).toEqual({ ok: true, mensaje: 'Mes Septiembre 2026 cerrado correctamente.' });
    expect(result.current.procesandoAccion).toBe(false);
  });

  it('si el servidor rechaza, devuelve su mensaje y no guarda snapshot', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCerrarPeriodo.mockRejectedValue(Object.assign(
      new Error('El mes ingresado no coincide con el mes a cerrar. Verifica e intenta nuevamente.'),
      { code: 'functions/invalid-argument' }
    ));
    const result = await montar();
    act(() => { result.current.handleCerrarMes('septiembre', 'implantes'); });

    let resultado;
    await act(async () => { resultado = await result.current.ejecutarCierre({ anioIngresado: '2026', mesIngresado: '09' }); });

    expect(resultado).toEqual({ ok: false, mensaje: 'El mes ingresado no coincide con el mes a cerrar. Verifica e intenta nuevamente.' });
    expect(mockGuardarSnapshot).not.toHaveBeenCalled();
    expect(result.current.procesandoAccion).toBe(false);
    console.error.mockRestore();
  });

  it.each([
    ['falla de red', Object.assign(new Error('internal'), { code: 'functions/internal' })],
    ['timeout', Object.assign(new Error('deadline-exceeded'), { code: 'functions/deadline-exceeded' })],
    ['error sin código', new Error('Failed to fetch')]
  ])('si el error no es un HttpsError del cierre (%s), muestra el mensaje genérico', async (_caso, error) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCerrarPeriodo.mockRejectedValue(error);
    const result = await montar();
    act(() => { result.current.handleCerrarMes('septiembre', 'implantes'); });

    let resultado;
    await act(async () => { resultado = await result.current.ejecutarCierre({ anioIngresado: '2026', mesIngresado: '09' }); });

    expect(resultado).toEqual({ ok: false, mensaje: MENSAJE_ERROR_CIERRE_GENERICO });
    expect(MENSAJE_ERROR_CIERRE_GENERICO).toBe('No se pudo cerrar el mes. Revisa tu conexión e intenta nuevamente.');
    console.error.mockRestore();
  });

  it('la apertura cierra automáticamente el período abierto anterior indicando cuál se abre (firestore.rules)', async () => {
    const firestore = await import('firebase/firestore');
    const batch = { update: vi.fn(), set: vi.fn(), commit: vi.fn(async () => {}) };
    firestore.writeBatch.mockReturnValue(batch);
    firestore.doc.mockImplementation((_db, col, id) => `${col}/${id}`);
    const result = await montar();
    // Después de montar: la carga inicial del resumen también usa getDocs.
    firestore.getDocs.mockResolvedValueOnce({ docs: [{ id: '2026_agosto_implantes' }] });
    act(() => { result.current.handleAbrirMes('septiembre', 'implantes'); });
    await act(async () => { await confirmAction.mock.calls[0][2](); });

    expect(batch.update).toHaveBeenCalledWith('cierres_periodos/2026_agosto_implantes', expect.objectContaining({
      estado: 'CERRADO', cierreAutomatico: true, cerradoPorApertura: '2026_septiembre_implantes'
    }));
    expect(batch.set).toHaveBeenCalledWith('cierres_periodos/2026_septiembre_implantes', expect.objectContaining({ estado: 'ABIERTO' }), { merge: true });
    expect(batch.commit).toHaveBeenCalled();
  });

  it('cancelar descarta la solicitud de cierre', async () => {
    const result = await montar();
    act(() => { result.current.handleCerrarMes('septiembre', 'implantes'); });
    act(() => { result.current.cancelarCierre(); });
    expect(result.current.solicitudCierre).toBeNull();
  });
});
