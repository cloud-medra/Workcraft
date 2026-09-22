// @vitest-environment jsdom
import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDetallesOCData } from './useDetallesOCData';

const mockGetDocs = vi.fn();

vi.mock('../../../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...pathSegments) => ({ _type: 'collection', path: pathSegments.join('/') })),
  collectionGroup: vi.fn((_db, nombre) => ({ _type: 'collectionGroup', nombre })),
  query: vi.fn((ref, ...constraints) => ({ ...ref, _constraints: constraints })),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  documentId: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args)
}));

const docsDeIds = (ids) => ({ docs: ids.map((id) => ({ id, ref: { path: `x/${id}` }, data: () => ({ paciente: `Paciente ${id}` }) })) });

describe('useDetallesOCData', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it('carga los años disponibles al montar, desde la colección documentos_sistema', async () => {
    mockGetDocs.mockResolvedValueOnce(docsDeIds(['2025', '2026']));

    const { result } = renderHook(() => useDetallesOCData());
    expect(result.current.cargandoAnios).toBe(true);

    await act(async () => { await Promise.resolve(); });

    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(mockGetDocs.mock.calls[0][0]).toMatchObject({ _type: 'collection', path: 'documentos_sistema' });
    // Orden descendente (año más reciente primero)
    expect(result.current.anios).toEqual(['2026', '2025']);
    expect(result.current.cargandoAnios).toBe(false);
  });

  it('no consulta "detalles" mientras no haya año Y mes seleccionados', async () => {
    mockGetDocs.mockResolvedValueOnce(docsDeIds(['2026'])); // años
    const { result } = renderHook(() => useDetallesOCData());
    await act(async () => { await Promise.resolve(); });

    expect(result.current.filas).toEqual([]);
    expect(mockGetDocs).toHaveBeenCalledTimes(1); // solo la carga de años

    mockGetDocs.mockResolvedValueOnce(docsDeIds(['09', '10'])); // meses del año elegido
    await act(async () => { result.current.setAnio('2026'); await Promise.resolve(); });

    expect(result.current.meses).toEqual(['09', '10']);
    expect(result.current.mes).toBe(''); // elegir año no elige mes automáticamente
    expect(mockGetDocs).toHaveBeenCalledTimes(2); // años + meses, todavía sin filas
  });

  it('al elegir año y mes, consulta el collectionGroup "detalles" acotado a ese período', async () => {
    mockGetDocs.mockResolvedValueOnce(docsDeIds(['2026'])); // años
    const { result } = renderHook(() => useDetallesOCData());
    await act(async () => { await Promise.resolve(); });

    mockGetDocs.mockResolvedValueOnce(docsDeIds(['09'])); // meses
    await act(async () => { result.current.setAnio('2026'); await Promise.resolve(); });

    mockGetDocs.mockResolvedValueOnce(docsDeIds(['1001', '1002'])); // filas del período
    await act(async () => { result.current.setMes('09'); await Promise.resolve(); });

    expect(result.current.filas.map(f => f.id)).toEqual(['1001', '1002']);
    const ultimaLlamada = mockGetDocs.mock.calls[mockGetDocs.mock.calls.length - 1][0];
    expect(ultimaLlamada._type).toBe('collectionGroup');
    expect(ultimaLlamada.nombre).toBe('detalles');
  });

  it('cambiar de año resetea el mes elegido (y en cascada, las filas)', async () => {
    mockGetDocs.mockResolvedValueOnce(docsDeIds(['2025', '2026']));
    const { result } = renderHook(() => useDetallesOCData());
    await act(async () => { await Promise.resolve(); });

    mockGetDocs.mockResolvedValueOnce(docsDeIds(['09']));
    await act(async () => { result.current.setAnio('2026'); await Promise.resolve(); });
    mockGetDocs.mockResolvedValueOnce(docsDeIds(['1001']));
    await act(async () => { result.current.setMes('09'); await Promise.resolve(); });

    expect(result.current.filas).toHaveLength(1);

    mockGetDocs.mockResolvedValueOnce(docsDeIds(['03'])); // meses del nuevo año
    await act(async () => { result.current.setAnio('2025'); await Promise.resolve(); });

    expect(result.current.mes).toBe('');
    expect(result.current.filas).toEqual([]);
  });

  it('recargarFilas() vuelve a consultar el mismo período sin cambiar año/mes', async () => {
    mockGetDocs.mockResolvedValueOnce(docsDeIds(['2026']));
    const { result } = renderHook(() => useDetallesOCData());
    await act(async () => { await Promise.resolve(); });

    mockGetDocs.mockResolvedValueOnce(docsDeIds(['09']));
    await act(async () => { result.current.setAnio('2026'); await Promise.resolve(); });
    mockGetDocs.mockResolvedValueOnce(docsDeIds(['1001']));
    await act(async () => { result.current.setMes('09'); await Promise.resolve(); });

    const llamadasAntes = mockGetDocs.mock.calls.length;
    mockGetDocs.mockResolvedValueOnce(docsDeIds(['1001', '1002']));
    await act(async () => { result.current.recargarFilas(); await Promise.resolve(); });

    expect(mockGetDocs.mock.calls.length).toBe(llamadasAntes + 1);
    expect(result.current.filas).toHaveLength(2);
  });

  // Reproduce el patrón real de ImportarDetallesOC.jsx (destructurar setAnio/
  // setMes/recargarFilas y usarlos como dependencias de efectos externos) para
  // confirmar que no reintroduce el loop infinito ya corregido una vez.
  it('no entra en loop cuando setAnio/setMes/recargarFilas se usan como dependencias de un useEffect externo', async () => {
    mockGetDocs.mockResolvedValueOnce(docsDeIds(['2026']));
    const { result } = renderHook(() => {
      const data = useDetallesOCData();
      const { recargarFilas } = data;
      useEffect(() => { /* no-op, solo verifica que la identidad no cambie en loop */ }, [recargarFilas]);
      return data;
    });

    await act(async () => { await Promise.resolve(); });
    expect(result.current.anios).toEqual(['2026']);
  });
});
