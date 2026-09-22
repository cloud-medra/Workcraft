// @vitest-environment jsdom
import { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDetallesOCData } from './useDetallesOCData';

const mockGetCountFromServer = vi.fn();
const mockGetDocs = vi.fn();

vi.mock('../../../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collectionGroup: vi.fn(() => ({})),
  query: vi.fn((...args) => args),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  startAfter: vi.fn(),
  documentId: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  getCountFromServer: (...args) => mockGetCountFromServer(...args)
}));

const crearDocFake = (id) => ({
  id,
  ref: { path: `documentos_sistema/2026/meses/09/admisiones/1/empresas/x/detalles/${id}` },
  data: () => ({ paciente: 'Test' })
});

describe('useDetallesOCData', () => {
  beforeEach(() => {
    mockGetCountFromServer.mockReset();
    mockGetDocs.mockReset();
    mockGetCountFromServer.mockResolvedValue({ data: () => ({ count: 3 }) });
    mockGetDocs.mockResolvedValue({ docs: [crearDocFake('1'), crearDocFake('2')] });
  });

  it('irAPrimeraPagina consulta Firestore una sola vez (conteo + página) por llamada', async () => {
    const { result } = renderHook(() => useDetallesOCData());

    await act(async () => {
      await result.current.irAPrimeraPagina();
    });

    expect(mockGetCountFromServer).toHaveBeenCalledTimes(1);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(result.current.totalFilas).toBe(3);
    expect(result.current.filas).toHaveLength(2);
  });

  it('irAPrimeraPagina mantiene la misma identidad de función entre renders (no se recrea)', async () => {
    const { result, rerender } = renderHook(() => useDetallesOCData());
    const referenciaInicial = result.current.irAPrimeraPagina;

    await act(async () => {
      await result.current.irAPrimeraPagina();
    });

    rerender();
    expect(result.current.irAPrimeraPagina).toBe(referenciaInicial);
  });

  // Reproduce exactamente el patrón de ImportarDetallesOC.jsx
  // (useEffect(() => { irAPrimeraPagina(); }, [irAPrimeraPagina])). Con el bug
  // original, irAPrimeraPagina cambiaba de identidad cada vez que cargarPagina
  // actualizaba el estado "cursores", lo que retroalimentaba el efecto en un
  // loop infinito ("Maximum update depth exceeded"). Si el bug reaparece, este
  // test cuelga o falla porque las consultas a Firestore se disparan muchas
  // más veces de las esperadas.
  it('no entra en loop cuando se usa dentro de un useEffect con [irAPrimeraPagina] como dependencia', async () => {
    const { result } = renderHook(() => {
      const data = useDetallesOCData();
      const { irAPrimeraPagina } = data;
      useEffect(() => { irAPrimeraPagina(); }, [irAPrimeraPagina]);
      return data;
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetCountFromServer).toHaveBeenCalledTimes(1);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
    expect(result.current.totalFilas).toBe(3);
  });
});
