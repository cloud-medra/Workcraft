import { describe, it, expect, vi, beforeEach } from 'vitest';

const getDocs = vi.fn();
vi.mock('firebase/firestore', () => ({
  collectionGroup: vi.fn(), query: vi.fn(), where: vi.fn(), documentId: vi.fn(), getDocs: (...a) => getDocs(...a),
  getDoc: vi.fn(), doc: vi.fn(), writeBatch: vi.fn()
}));
vi.mock('../../../../../firebaseConfig', () => ({ db: {} }));
const { resumirGestionOC, filasOCSinPdfDesdeGestiones, leerGestionesConOCDelMes } = await import('./ocSinPdfPeriodo');

const gestion = (extra) => ({
  gestionId: '100001', nombre: 'PACIENTE UNO', empresa: 'PROVEEDOR UNO', fecha: '2026-09-15',
  cotizaciones: [{ items: [{ id: 'a', codigo: '1' }, { id: 'b', codigo: '2' }] }],
  ocPorItem: { a: '4500001', b: '4500001' },
  ...extra
});

describe('filasOCSinPdfDesdeGestiones', () => {
  it('una fila por OC, juntando gestiones; omite las que tienen PDF y las gestiones sin OC', () => {
    const gestiones = [
      resumirGestionOC(gestion()),
      resumirGestionOC(gestion({ gestionId: '100002', nombre: 'PACIENTE DOS', empresa: 'PROVEEDOR DOS', fecha: '2026-09-02' })),
      resumirGestionOC(gestion({ gestionId: '100003', ocPorItem: { a: '0004500009' } }))
    ];
    expect(resumirGestionOC(gestion({ ocPorItem: {} }))).toBeNull();
    expect(filasOCSinPdfDesdeGestiones(gestiones, { 4500009: {} })).toEqual([{
      oc: '4500001',
      admisiones: ['100001', '100002'],
      pacientes: ['PACIENTE DOS', 'PACIENTE UNO'],
      empresas: ['PROVEEDOR DOS', 'PROVEEDOR UNO'],
      fechas: ['2026-09-02', '2026-09-15'],
      fecha: '2026-09-02'
    }]);
  });
});

describe('leerGestionesConOCDelMes', () => {
  beforeEach(() => getDocs.mockReset());

  it('un mes ya visto sale de la caché sin leer; forzar vuelve a leer', async () => {
    getDocs.mockResolvedValue({ size: 3, docs: [{ data: () => gestion() }, { data: () => gestion({ ocPorItem: {} }) }, { data: () => gestion() }] });
    const primero = await leerGestionesConOCDelMes('2026', '09');
    expect(primero).toMatchObject({ lecturas: 3, desdeCache: false });
    expect(primero.gestiones).toHaveLength(2);

    const segundo = await leerGestionesConOCDelMes('2026', '09');
    expect(segundo).toMatchObject({ lecturas: 0, desdeCache: true });
    expect(getDocs).toHaveBeenCalledTimes(1);

    getDocs.mockResolvedValue({ size: 0, docs: [] });
    expect(await leerGestionesConOCDelMes('2026', '09', { forzar: true })).toMatchObject({ lecturas: 1, gestiones: [] });
    expect(getDocs).toHaveBeenCalledTimes(2);
  });
});
