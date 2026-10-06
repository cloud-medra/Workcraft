// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useControlMensualData, MENSAJE_ERROR_CIERRE_RED } from './useControlMensualData';

const mockCerrarPeriodo = vi.fn();
const mockHttpsCallable = vi.fn(() => mockCerrarPeriodo);
let estadosCierres = [];

vi.mock('../../../../firebaseConfig', () => ({ db: {}, functions: { _tipo: 'functions' } }));
vi.mock('../../../../hooks/useVisibleSnapshot', async () => {
  const fs = await import('firebase/firestore');
  return { onSnapshotVisible: (...a) => fs.onSnapshot(...a) };
});
vi.mock('firebase/functions', () => ({ httpsCallable: (...args) => mockHttpsCallable(...args) }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(),
  getDocs: vi.fn(async () => ({ size: 0, docs: [] })),
  query: vi.fn(() => ({})),
  where: vi.fn(),
  onSnapshot: vi.fn((_q, cb) => { cb({ docs: estadosCierres.map(d => ({ id: d.id, data: () => d })) }); return () => {}; }),
  getAggregateFromServer: vi.fn(async (ref) => ({ data: () => ({ cantidad: 3, montoTotal: 300, _ref: ref }) })),
  count: vi.fn(),
  sum: vi.fn(),
  arrayUnion: vi.fn(),
  serverTimestamp: vi.fn(),
  writeBatch: vi.fn()
}));

const mockGuardarSnapshot = vi.fn();
const mockObtenerCelda = vi.fn(async (_anio, _mod, _mes, estado) => (
  estado === 'CERRADO' ? { cantidad: 10, montoTotal: 1000 } : { cantidad: 3, montoTotal: 300 }
));
vi.mock('./resumenImputacionesStore', () => ({
  ESTADOS_ABIERTOS: ['ABIERTO', 'REABIERTO'],
  obtenerCelda: (...a) => mockObtenerCelda(...a),
  invalidarResumenAnio: vi.fn()
}));
vi.mock('./snapshotMensual', () => ({
  calcularTotalMesDesdeDocumentos: vi.fn(async () => 1000),
  guardarSnapshotMensual: (...args) => mockGuardarSnapshot(...args),
  invalidarSnapshotMensual: vi.fn()
}));

// El listener de cierres es compartido por año: desmontar entre tests.
afterEach(cleanup);

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
    ['servicio no disponible', Object.assign(new Error('unavailable'), { code: 'functions/unavailable' })],
    ['timeout', Object.assign(new Error('deadline-exceeded'), { code: 'functions/deadline-exceeded' })]
  ])('si el error es de red (%s), sugiere revisar la conexión', async (_caso, error) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCerrarPeriodo.mockRejectedValue(error);
    const result = await montar();
    act(() => { result.current.handleCerrarMes('septiembre', 'implantes'); });

    let resultado;
    await act(async () => { resultado = await result.current.ejecutarCierre({ anioIngresado: '2026', mesIngresado: '09' }); });

    expect(resultado).toEqual({ ok: false, mensaje: MENSAJE_ERROR_CIERRE_RED });
    expect(MENSAJE_ERROR_CIERRE_RED).toBe('No se pudo cerrar el mes. Revisa tu conexión e intenta nuevamente.');
    console.error.mockRestore();
  });

  it.each([
    ['permission-denied',
      Object.assign(new Error('No tienes permiso para cerrar períodos en Control Mensual'), { code: 'functions/permission-denied' }),
      'No tienes permiso para cerrar períodos en Control Mensual'],
    ['failed-precondition',
      Object.assign(new Error('El período no está abierto para: implantes (CERRADO).'), { code: 'functions/failed-precondition' }),
      'El período no está abierto para: implantes (CERRADO).'],
    ['internal con mensaje', Object.assign(new Error('Falló la transacción'), { code: 'functions/internal' }), 'Falló la transacción'],
    ['internal sin mensaje', Object.assign(new Error('internal'), { code: 'functions/internal' }), 'No se pudo cerrar el mes (error: internal).']
  ])('si el error no es de red (%s), muestra el mensaje real', async (_caso, error, esperado) => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockCerrarPeriodo.mockRejectedValue(error);
    const result = await montar();
    act(() => { result.current.handleCerrarMes('septiembre', 'implantes'); });

    let resultado;
    await act(async () => { resultado = await result.current.ejecutarCierre({ anioIngresado: '2026', mesIngresado: '09' }); });

    expect(resultado).toEqual({ ok: false, mensaje: esperado });
    console.error.mockRestore();
  });

  const prepararApertura = async () => {
    const firestore = await import('firebase/firestore');
    const batch = { update: vi.fn(), set: vi.fn(), commit: vi.fn(async () => {}) };
    firestore.writeBatch.mockReturnValue(batch);
    firestore.doc.mockImplementation((_db, col, id) => `${col}/${id}`);
    const result = await montar();
    return { firestore, batch, result };
  };
  const abiertos = (...periodos) => ({
    docs: periodos.map(([id, anio, mes]) => ({ id, data: () => ({ anio, mes, modulo: 'implantes', estado: 'ABIERTO' }) }))
  });

  it('la confirmación de apertura lista los períodos que se cerrarán automáticamente, y solo cierra esos', async () => {
    const { firestore, batch, result } = await prepararApertura();
    // Después de montar: la carga inicial del resumen también usa getDocs.
    firestore.getDocs.mockResolvedValue(abiertos(['2025_diciembre_implantes', '2025', 'diciembre']));
    await act(async () => { await result.current.handleAbrirMes('enero', 'implantes', '2026'); });

    expect(confirmAction.mock.calls[0][1]).toBe(
      '¿Deseas abrir ENERO 2026 para: [Implantes]? Atención: esto cerrará automáticamente Implantes Diciembre 2025.'
    );
    await act(async () => { await confirmAction.mock.calls[0][2](); });

    expect(batch.update).toHaveBeenCalledTimes(1);
    expect(batch.update).toHaveBeenCalledWith('cierres_periodos/2025_diciembre_implantes', expect.objectContaining({
      estado: 'CERRADO', cierreAutomatico: true, cerradoPorApertura: '2026_enero_implantes'
    }));
    expect(batch.set).toHaveBeenCalledWith('cierres_periodos/2026_enero_implantes', expect.objectContaining({ estado: 'ABIERTO' }), { merge: true });
    expect(batch.commit).toHaveBeenCalled();
    firestore.getDocs.mockReset();
    firestore.getDocs.mockResolvedValue({ size: 0, docs: [] });
  });

  it('sin períodos abiertos, la confirmación no menciona cierres y no cierra nada', async () => {
    const { firestore, batch, result } = await prepararApertura();
    firestore.getDocs.mockResolvedValue({ docs: [] });
    await act(async () => { await result.current.handleAbrirMes('octubre', 'implantes'); });

    expect(confirmAction.mock.calls[0][1]).toBe('¿Deseas abrir OCTUBRE 2026 para: [Implantes]?');
    await act(async () => { await confirmAction.mock.calls[0][2](); });
    expect(batch.update).not.toHaveBeenCalled();
    expect(batch.commit).toHaveBeenCalled();
  });

  it('si al confirmar aparece un período abierto que no se mostró, no abre ni cierra nada', async () => {
    const { firestore, batch, result } = await prepararApertura();
    firestore.getDocs.mockResolvedValueOnce({ docs: [] });
    await act(async () => { await result.current.handleAbrirMes('octubre', 'implantes'); });
    expect(confirmAction.mock.calls[0][1]).not.toContain('cerrará');

    firestore.getDocs.mockResolvedValueOnce(abiertos(['2026_septiembre_implantes', '2026', 'septiembre']));
    await act(async () => { await confirmAction.mock.calls[0][2](); });

    expect(batch.update).not.toHaveBeenCalled();
    expect(batch.set).not.toHaveBeenCalled();
    expect(batch.commit).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Cambiaron los períodos abiertos'), 'warning');
    expect(result.current.procesandoAccion).toBe(false);
    firestore.getDocs.mockResolvedValue({ size: 0, docs: [] });
  });

  it('cancelar descarta la solicitud de cierre', async () => {
    const result = await montar();
    act(() => { result.current.handleCerrarMes('septiembre', 'implantes'); });
    act(() => { result.current.cancelarCierre(); });
    expect(result.current.solicitudCierre).toBeNull();
  });
});


describe('useControlMensualData — resumen de imputaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    estadosCierres = [
      { id: '2026_septiembre_implantes', anio: '2026', mes: 'septiembre', modulo: 'implantes', estado: 'ABIERTO' },
      { id: '2026_agosto_implantes', anio: '2026', mes: 'agosto', modulo: 'implantes', estado: 'CERRADO' }
    ];
  });

  it('Control Mensual pide solo los meses con estado (cerrados y abiertos), nunca los no abiertos', async () => {
    const { result } = renderHook(() => useControlMensualData('2026', { uid: 'u1' }, showToast, confirmAction));
    await act(async () => {});
    expect(mockObtenerCelda).toHaveBeenCalledTimes(2);
    expect(result.current.resumenImputaciones.implantes).toEqual({
      septiembre: { cantidad: 3, montoTotal: 300 },
      agosto: { cantidad: 10, montoTotal: 1000 }
    });
    expect(result.current.cargandoResumen).toBe(false);
  });

  it('Resumen Periodo Abierto (soloPeriodoAbierto) pide solo el mes abierto', async () => {
    renderHook(() => useControlMensualData('2026', { uid: 'u1' }, showToast, confirmAction, { soloPeriodoAbierto: true }));
    await act(async () => {});
    expect(mockObtenerCelda).toHaveBeenCalledTimes(1);
    expect(mockObtenerCelda).toHaveBeenCalledWith('2026', 'implantes', 'septiembre', 'ABIERTO');
  });
});
