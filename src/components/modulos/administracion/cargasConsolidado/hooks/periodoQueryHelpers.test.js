import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDocs = vi.fn();
vi.mock('../../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  collectionGroup: () => ({}),
  query: (_base, ...restricciones) => ({ restricciones }),
  where: (campo, op, valor) => ({ op, valor }),
  orderBy: () => ({}),
  limit: (n) => ({ limit: n }),
  documentId: () => '__name__',
  getDocs: (...a) => mockGetDocs(...a),
}));

const { mesesDisponiblesPorSondeoImputadas } = await import('./periodoQueryHelpers');

// Rutas ordenadas como el índice de __name__; cada consulta devuelve el
// primer documento >= desde y < hasta (limit 1).
const RUTAS = [
  'implantes_imputadas/2026/meses/agosto/documentos/a1',
  'implantes_imputadas/2026/meses/agosto/documentos/a2',
  'implantes_imputadas/2026/meses/septiembre/documentos/s1',
  'implantes_imputadas/2027/meses/enero/documentos/e1',
];

beforeEach(() => {
  mockGetDocs.mockReset();
  mockGetDocs.mockImplementation(async ({ restricciones }) => {
    const desde = restricciones.find(r => r.op === '>=').valor;
    const hasta = restricciones.find(r => r.op === '<').valor;
    const ruta = RUTAS.find(r => r >= desde && r < hasta);
    return ruta ? { empty: false, docs: [{ ref: { path: ruta } }] } : { empty: true, docs: [] };
  });
});

describe('mesesDisponiblesPorSondeoImputadas', () => {
  it('devuelve los meses del año con 1 consulta por mes + 1', async () => {
    const meses = await mesesDisponiblesPorSondeoImputadas('implantes_imputadas', '2026');
    expect(meses).toEqual(['agosto', 'septiembre']);
    expect(mockGetDocs).toHaveBeenCalledTimes(3);
    expect(mockGetDocs.mock.calls.every(([q]) => q.restricciones.some(r => r.limit === 1))).toBe(true);
  });

  it('año sin datos: una sola consulta', async () => {
    expect(await mesesDisponiblesPorSondeoImputadas('implantes_imputadas', '2025')).toEqual([]);
    expect(mockGetDocs).toHaveBeenCalledTimes(1);
  });
});
