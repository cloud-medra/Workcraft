import { describe, it, expect, vi, beforeEach } from 'vitest';

// Firestore simulado: documentos en memoria, consulta `in` por un campo y
// transacción que aplica las escrituras solo si la función termina sin error.
const datos = new Map();
let autoId = 0;
const ref = (path) => ({ path, id: path.split('/').pop() });
const snapDe = (r) => ({ id: r.id, exists: () => datos.has(r.path), data: () => datos.get(r.path) });

vi.mock('../../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...seg) => ({ path: seg.map((s) => (typeof s === 'string' ? s : s.path)).join('/') }),
  doc: (base, ...seg) => {
    if (base && base.path !== undefined && seg.length === 0) return ref(`${base.path}/auto${++autoId}`);
    if (base && base.path !== undefined) return ref([base.path, ...seg].join('/'));
    return ref(seg.join('/'));
  },
  where: (campo, op, valor) => ({ campo, op, valor }),
  query: (col, filtro) => ({ col, filtro }),
  getDoc: async (r) => snapDe(r),
  getDocs: async ({ col, filtro }) => ({
    docs: [...datos.entries()]
      .filter(([k]) => k.startsWith(`${col.path}/`) && k.split('/').length === col.path.split('/').length + 1)
      .filter(([, v]) => filtro.valor.includes(v[filtro.campo]))
      .map(([k, v]) => ({ id: k.split('/').pop(), data: () => v }))
  }),
  serverTimestamp: () => 'TS',
  runTransaction: async (_db, fn) => {
    const escrituras = [];
    const tx = { get: async (r) => snapDe(r), set: (r, v) => escrituras.push(() => datos.set(r.path, v)) };
    const res = await fn(tx);
    escrituras.forEach((w) => w());
    return res;
  }
}));

const { guardarIngresoStock, buscarIngresoDuplicado, IngresoDuplicadoError } = await import('./ingresoStockService');
const { idDocumentoIngreso } = await import('./ingresoStock');

const CAB = { numeroGuiaFactura: 'F-100', numeroOrden: 'OC-1', empresa: 'Acme', empresaId: 'E1', nombreCaja: 'Caja 1', ubicacion: 'A-1', observaciones: '' };
const ITEM = { codigoId: 'P1', codigo: 'C-1', referencia: 'REF', descripcion: 'TORNILLO', precio: 10, cantidad: 2, lote: 'L1', vencimiento: '' };
const USUARIO = { nombreCompleto: 'Ana', email: 'ana@x.cl' };
const ingresos = () => [...datos.entries()].filter(([k, v]) => k.split('/').length === 2 && k.startsWith('inventario_general/') && v.tipoRegistro);

beforeEach(() => { datos.clear(); });

describe('guardarIngresoStock', () => {
  it('crea el documento de Ingresos (con tipo), su log y el registro del documento ingresado', async () => {
    const { id } = await guardarIngresoStock({ cabecera: CAB, items: [ITEM], usuario: USUARIO });
    const reg = datos.get(`inventario_general/${id}`);
    expect(reg).toMatchObject({ tipoRegistro: 'INGRESO_STOCK', numeroGuiaFactura: 'F-100', registradoPor: 'Ana', fechaRegistro: 'TS' });
    expect(reg.items[0]).toMatchObject({ descripcion: 'TORNILLO', tipo: 'TORNILLO', cantidad: 2 });
    const log = [...datos.entries()].find(([k]) => k.startsWith(`inventario_general/${id}/logs/`))[1];
    expect(log).toMatchObject({ accion: 'INGRESO_CON_DOCUMENTO', usuario: 'Ana', detalles: { numeroGuiaFactura: 'F-100', cantidadItems: 1 } });
    expect(datos.get(`inventario_ingresos_documentos/${idDocumentoIngreso(CAB)}`)).toMatchObject({ ingresoId: id, registradoPor: 'Ana' });
  });

  it('rechaza misma empresa + guía + OC con fecha y usuario del ingreso anterior', async () => {
    await guardarIngresoStock({ cabecera: CAB, items: [ITEM], usuario: USUARIO });
    const err = await guardarIngresoStock({ cabecera: { ...CAB, numeroGuiaFactura: ' f-100' }, items: [ITEM], usuario: { nombreCompleto: 'Beto' } }).catch((e) => e);
    expect(err).toBeInstanceOf(IngresoDuplicadoError);
    expect(err.message).toMatch(/ya fue ingresada el .* por Ana\./);
    expect(ingresos()).toHaveLength(1);
  });

  it('permite misma guía con otra OC y otra guía con la misma OC', async () => {
    await guardarIngresoStock({ cabecera: CAB, items: [ITEM], usuario: USUARIO });
    await guardarIngresoStock({ cabecera: { ...CAB, numeroOrden: 'OC-2' }, items: [ITEM], usuario: USUARIO });
    await guardarIngresoStock({ cabecera: { ...CAB, numeroGuiaFactura: 'F-101' }, items: [ITEM], usuario: USUARIO });
    expect(ingresos()).toHaveLength(3);
  });

  it('detecta ingresos anteriores al registro de documentos (solo en inventario_general)', async () => {
    datos.set('inventario_general/VIEJO', { tipoRegistro: 'INGRESO_STOCK', numeroGuiaFactura: 'F-100', numeroOrden: 'OC-1', empresa: 'Acme', empresaId: 'E1', registradoPor: 'Carla', fechaRegistro: new Date(2026, 0, 5, 8, 0) });
    expect(await buscarIngresoDuplicado(CAB)).toMatchObject({ usuario: 'Carla', ingresoId: 'VIEJO' });
    await expect(guardarIngresoStock({ cabecera: CAB, items: [ITEM], usuario: USUARIO })).rejects.toThrow('ya fue ingresada el 05-01-2026 08:00 por Carla.');
  });

  it('si el ingreso anterior se eliminó, el documento se puede volver a ingresar', async () => {
    const { id } = await guardarIngresoStock({ cabecera: CAB, items: [ITEM], usuario: USUARIO });
    datos.delete(`inventario_general/${id}`);
    const nuevo = await guardarIngresoStock({ cabecera: CAB, items: [ITEM], usuario: USUARIO });
    expect(datos.get(`inventario_ingresos_documentos/${idDocumentoIngreso(CAB)}`).ingresoId).toBe(nuevo.id);
  });

  it('valida igual que Ingresos antes de escribir', async () => {
    await expect(guardarIngresoStock({ cabecera: { ...CAB, nombreCaja: '' }, items: [ITEM], usuario: USUARIO })).rejects.toThrow('El nombre de la caja destino es obligatorio');
    expect(datos.size).toBe(0);
  });

  it('desde Escaneo guarda el origen y los vínculos de los códigos escaneados', async () => {
    const producto = { id: 'P1', codigo: 'C-1', referencia: 'REF', descriptorAuto: 'TORNILLO' };
    const { id } = await guardarIngresoStock({
      cabecera: CAB, items: [ITEM], usuario: USUARIO, origen: 'Ingreso con guía o factura por escaneo',
      vinculos: [{ producto, codigos: [{ clave: '779', codigo: '779' }] }]
    });
    expect(datos.get(`inventario_general/${id}`).origen).toBe('Ingreso con guía o factura por escaneo');
    expect(datos.get('inventario_codigos_barra/779')).toMatchObject({ productoId: 'P1', referencia: 'REF' });
  });

  it('no escribe nada si un código quedó vinculado a otro producto', async () => {
    datos.set('inventario_codigos_barra/779', { productoId: 'OTRO' });
    const producto = { id: 'P1' };
    await expect(guardarIngresoStock({
      cabecera: CAB, items: [ITEM], usuario: USUARIO, vinculos: [{ producto, codigos: [{ clave: '779', codigo: '779' }] }]
    })).rejects.toThrow(/vinculado a otro producto/);
    expect(ingresos()).toHaveLength(0);
  });
});
