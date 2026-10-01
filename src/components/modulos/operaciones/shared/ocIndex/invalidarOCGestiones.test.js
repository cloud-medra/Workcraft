import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../../firebaseConfig', () => ({ db: {} }));
const { planificarInvalidacion } = await import('./invalidarOCGestiones');

const gestion = (extra = {}) => ({
  refPath: 'implantes_gestiones/2026/mes/09/dia/15/admision/114584/empresa/MEDTRONIC/detalles/g1',
  gestionId: '114584', fecha: '2026-09-15', empresa: 'MEDTRONIC CHILE SPA',
  cotizaciones: [{ items: [{ id: 'a', codigo: '510012' }, { id: 'b', codigo: '510012' }, { id: 'c', codigo: '999' }] }],
  ocPorItem: { a: '4500001', b: '4500001', c: '4500001' },
  ...extra
});
const cambio = { admision: '114584', fecha: '2026-09-15', proveedor: 'Medtronic', codigo: '510012', ocAntes: '4500001', ocDespues: '4500002' };

describe('planificarInvalidacion', () => {
  it('libera la OC antigua solo en los ítems de ese código (misma admisión, fecha y empresa)', () => {
    expect(planificarInvalidacion([gestion()], [cambio])).toEqual([
      { refPath: gestion().refPath, itemIds: ['a', 'b'], cambios: [cambio] }
    ]);
  });

  it('no toca otra fecha, otra empresa, otra OC ni ítems que ya tienen otra OC', () => {
    expect(planificarInvalidacion([
      gestion({ fecha: '2026-09-16' }),
      gestion({ empresa: 'ABBOTT' }),
      gestion({ ocPorItem: { a: '4500009' } })
    ], [cambio])).toEqual([]);
  });
});
