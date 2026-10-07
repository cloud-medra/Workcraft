import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collectionGroup: (_db, nombre) => ({ tipo: 'collectionGroup', nombre }),
  collection: (_db, nombre) => ({ tipo: 'collection', nombre }),
  query: (base, ...restricciones) => ({ base, restricciones }),
  where: (campo, op, valor) => ({ campo, op, valor }),
  getDocs: vi.fn()
}));

vi.mock('../../../../../../stores/catalogosStore', () => ({
  codigosPorReferenciaSiDisponible: vi.fn(async () => null)
}));

const docFake = (id, data, path) => ({ id, ref: { path }, data: () => data });

describe('resolverGuiaCacheada', () => {
  beforeEach(() => vi.clearAllMocks());

  it('trae todos los productos de la guía guardada por Ingresar Guía (consignacion_guias), con su N° de guía', async () => {
    const { getDocs } = await import('firebase/firestore');
    const { resolverGuiaCacheada } = await import('./cacheDelivery');

    const base = 'consignacion_guias/2026/mes/Octubre/documento/1481687012/detalles';
    getDocs.mockResolvedValueOnce({
      docs: [
        docFake('a', { numeroGuia: '55501', numeroDocumento: '1481687012', codigo: 'PROD-A' }, `${base}/a`),
        docFake('b', { numeroGuia: '55501', numeroDocumento: '1481687012', codigo: 'PROD-B' }, `${base}/b`),
        docFake('k', { numeroGuia: '55501', numeroDocumento: '1481687012', codigo: 'KIT-MANGACRL' }, `${base}/k`),
        // Detalle de otro módulo con el mismo numeroDocumento: se ignora.
        docFake('x', { numeroGuia: '999', numeroDocumento: '1481687012', codigo: 'OTRO' }, 'implantes_gestiones/x/detalles/x')
      ]
    });

    const guia = await resolverGuiaCacheada({}, ' 1481687012 ');

    expect(guia).not.toBeNull();
    expect(guia.numeroGuia).toBe('55501');
    expect(guia.productos.map((p) => p.codigo)).toEqual(['PROD-A', 'PROD-B']);
    expect(getDocs.mock.calls[0][0].restricciones[0]).toEqual({ campo: 'numeroDocumento', op: '==', valor: '1481687012' });
  });
});
