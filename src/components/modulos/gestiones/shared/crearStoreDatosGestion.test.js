import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDocs = vi.fn();

vi.mock('../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...segmentos) => ({ path: segmentos.join('/') })),
  getDocs: (...args) => mockGetDocs(...args)
}));

const { crearStoreDatosGestion } = await import('./crearStoreDatosGestion');

const docsDeIds = (ids) => ({ docs: ids.map((id) => ({ id })) });

describe('crearStoreDatosGestion.getMeses', () => {
  beforeEach(() => mockGetDocs.mockReset());

  it('devuelve los meses en orden cronológico, no alfabético', async () => {
    // Firestore devuelve los ids ordenados como texto.
    mockGetDocs.mockResolvedValueOnce(docsDeIds(['agosto', 'noviembre', 'octubre', 'septiembre']));
    const store = crearStoreDatosGestion('codigos');

    await expect(store.getMeses('laboratorio_docs', '2026')).resolves
      .toEqual(['agosto', 'septiembre', 'octubre', 'noviembre']);
    expect(mockGetDocs.mock.calls[0][0].path).toBe('laboratorio_docs/2026/meses');
  });
});
