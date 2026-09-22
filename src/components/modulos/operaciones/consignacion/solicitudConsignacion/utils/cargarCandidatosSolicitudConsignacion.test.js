import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mockea todo firebase/firestore: getDocs se resuelve en orden según qué
// consulta se está armando (CARGADO -> guía por delivery -> maestros por
// referencia), sin necesidad de un emulador real.
const estadoMock = { llamadas: [] };

vi.mock('firebase/firestore', () => ({
  collectionGroup: (_db, nombre) => ({ tipo: 'collectionGroup', nombre }),
  collection: (_db, nombre) => ({ tipo: 'collection', nombre }),
  query: (base, ...restricciones) => ({ base, restricciones }),
  where: (campo, op, valor) => ({ campo, op, valor }),
  orderBy: (campo, direccion) => ({ campo, direccion }),
  getDocs: vi.fn()
}));

vi.mock('../../../../../../firebaseConfig', () => ({ db: {} }));

const docFake = (id, data, path) => ({
  id,
  ref: { path: path || `consignacion_registros/2026/mes/09/dia/22/admision/X/empresa/Y/detalles/${id}` },
  data: () => data
});

describe('cargarCandidatosSolicitudConsignacion', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    estadoMock.llamadas = [];
  });

  it('trae TODOS los ítems CARGADO de consignacion_registros, sin límite ni recorte', async () => {
    const { getDocs } = await import('firebase/firestore');
    const { cargarCandidatosSolicitudConsignacion } = await import('./cargarCandidatosSolicitudConsignacion');

    // 50 ítems CARGADO sin delivery vinculado — sin llamadas extra de guía.
    const itemsFake = Array.from({ length: 50 }, (_, i) =>
      docFake(`item-${i}`, { estado: 'CARGADO', gestionId: `10${i}`, nombre: `Paciente ${i}`, costo: 100, cantidad: 1 })
    );

    getDocs.mockResolvedValueOnce({ docs: itemsFake });

    const resultado = await cargarCandidatosSolicitudConsignacion();

    expect(resultado).toHaveLength(50);
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('excluye documentos de otros módulos que comparten la subcolección "detalles"', async () => {
    const { getDocs } = await import('firebase/firestore');
    const { cargarCandidatosSolicitudConsignacion } = await import('./cargarCandidatosSolicitudConsignacion');

    const docsMezclados = [
      docFake('c1', { estado: 'CARGADO', gestionId: '1', costo: 10, cantidad: 1 }, 'consignacion_registros/.../detalles/c1'),
      docFake('i1', { estado: 'CARGADO', gestionId: '2' }, 'implantes_gestiones/.../detalles/i1'),
      docFake('h1', { estado: 'CARGADO', gestionId: '3' }, 'hemodinamia_gestiones/.../detalles/h1')
    ];
    getDocs.mockResolvedValueOnce({ docs: docsMezclados });

    const resultado = await cargarCandidatosSolicitudConsignacion();

    expect(resultado).toHaveLength(1);
    expect(resultado[0].id).toBe('c1');
  });

  it('agrega filas de desglose de guía para ítems con delivery vinculado (antes faltaban en Cargas Consolidado)', async () => {
    const { getDocs } = await import('firebase/firestore');
    const { cargarCandidatosSolicitudConsignacion } = await import('./cargarCandidatosSolicitudConsignacion');

    const itemConDelivery = docFake('item-1', {
      estado: 'CARGADO', gestionId: '500', nombre: 'Ana Ríos', costo: 1000, cantidad: 1, delivery: 'GUIA-001'
    }, 'consignacion_registros/.../detalles/item-1');

    // 1) query de CARGADO
    getDocs.mockResolvedValueOnce({ docs: [itemConDelivery] });
    // 2) query de la guía (numeroDocumento == delivery)
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        { data: () => ({ numeroGuia: '999', codigo: 'PROD-A', cantidad: 3, lote: 'L1', vencimiento: '2027-01-01' }) }
      ]
    });
    // 3) query de maestros_codigos (referencia in [...])
    getDocs.mockResolvedValueOnce({ docs: [] });

    const resultado = await cargarCandidatosSolicitudConsignacion();

    // El ítem real + 1 fila de desglose de guía = 2 filas totales.
    expect(resultado).toHaveLength(2);
    const filaDesglose = resultado.find(f => f.esFilaGuia);
    expect(filaDesglose).toBeTruthy();
    expect(filaDesglose.codigo).toBe('No lleva OC');
    expect(filaDesglose.cantidad).toBe(3);
    expect(filaDesglose.ref).toBeNull();
  });
});
