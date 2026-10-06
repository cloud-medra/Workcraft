import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  writeBatch: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS')
}));

import {
  ESTADOS_FILA,
  esEstadoGuardable,
  parsearFechaExcel,
  parsearCantidad,
  validarFormatoFila,
  evaluarFila,
  resolverFilas,
  resumirFilas,
  mensajeConfirmacionGuardado
} from './validacionesCargaMasiva';
import { crearFilaVacia } from './grillaPortapapeles';
import { planificarBloques, construirDatosDoc } from '../../utils/registroConsignacionService';

const ITEM = {
  codigo: 'C-100',
  referencia: 'REF-100',
  precioNeto: 15000,
  descriptorEmpresa: 'TORNILLO 3.5',
  empresa: 'ACME MEDICAL',
  tipo: 'CONSIGNACION'
};

const REPORTE = { 'Admisión': 555, Isapre: 'FONASA', Convenio: 'CONV-1', 'Descripción': 'ARTROSCOPIA', Paciente: 'JUAN PEREZ', Cirujano: 'DR. SOTO' };

const valores = (extra = {}) => ({
  admision: '555',
  paciente: '',
  medico: '',
  fecha: '06-10-2026',
  proveedor: '',
  codigo: 'c-100',
  cantidad: '2',
  delivery: '',
  ...extra
});

describe('parsearFechaExcel', () => {
  it.each([
    ['06-10-2026', '2026-10-06'],
    ['6/1/2026', '2026-01-06'],
    ['06/10/2026', '2026-10-06'],
    ['06.10.2026', '2026-10-06'],
    ['06-10-26', '2026-10-06'],
    ['06/10/2026 0:00', '2026-10-06'],
    ['2026-10-06', '2026-10-06'],
    ['46301', '2026-10-06'],
    ['46301.5', '2026-10-06'],
    ['45658', '2025-01-01']
  ])('%s -> %s', (entrada, esperado) => {
    expect(parsearFechaExcel(entrada)).toBe(esperado);
  });

  it.each(['', '31-02-2026', '15', 'ayer', '13/13/2026', '06-10-1999', '2026/13/01'])('rechaza "%s"', (entrada) => {
    expect(parsearFechaExcel(entrada)).toBeNull();
  });
});

describe('parsearCantidad', () => {
  it('acepta enteros mayores a 0', () => {
    expect(parsearCantidad('1')).toBe(1);
    expect(parsearCantidad(' 12 ')).toBe(12);
  });

  it.each(['0', '-1', '1.5', '2,0', 'abc', ''])('rechaza "%s"', (entrada) => {
    expect(parsearCantidad(entrada)).toBeNull();
  });
});

describe('validarFormatoFila', () => {
  it('fila válida no tiene errores y normaliza fecha y cantidad', () => {
    expect(validarFormatoFila(valores())).toEqual({ errores: {}, fecha: '2026-10-06', cantidad: 2 });
  });

  it('marca cada campo con problema', () => {
    const { errores } = validarFormatoFila(valores({ admision: '55A', fecha: '99-99-2026', codigo: '', cantidad: '0' }));
    expect(Object.keys(errores).sort()).toEqual(['admision', 'cantidad', 'codigo', 'fecha']);
  });

  it('fecha y cantidad son obligatorias; Admisión vacía se permite (igual que Registro)', () => {
    const { errores } = validarFormatoFila(valores({ admision: '', fecha: '', cantidad: '' }));
    expect(errores.admision).toBeUndefined();
    expect(errores.fecha).toMatch(/obligatoria/);
    expect(errores.cantidad).toMatch(/obligatoria/);
  });
});

describe('evaluarFila', () => {
  it('OK: arma el payload con los datos del maestro y los Datos Vinculados, igual que Registro', () => {
    const r = evaluarFila(valores({ medico: 'DRA. ROJAS', delivery: '24h' }), { reporte: REPORTE, item: ITEM, tipo: 'CONSIGNACION' });

    expect(r.estado).toBe(ESTADOS_FILA.OK);
    expect(r.payload).toEqual({
      gestionId: '555',
      nombre: 'JUAN PEREZ',
      medico: 'DRA. ROJAS',
      fecha: '2026-10-06',
      cantidad: '2',
      delivery: '24h',
      referencia: 'REF-100',
      codigo: 'C-100',
      costo: 15000,
      descripcion: 'TORNILLO 3.5',
      empresa: 'ACME MEDICAL',
      convenio: 'CONV-1',
      prevision: 'FONASA',
      descripcionPabellon: 'ARTROSCOPIA',
      tipo: 'CONSIGNACION',
      atributo: 'CONSIGNACION',
      centro: 'PABELLON',
      estado: 'INGRESADO'
    });
    expect(construirDatosDoc(r.payload)).toMatchObject({ cantidad: 2, costo: 15000, gestionId: '555' });
  });

  it('Detalle: muestra y guarda descriptorAuto en "descripcion" (mismo campo que Registro)', () => {
    const item = { ...ITEM, descriptorEmpresa: '', descriptorAuto: 'PLACA BLOQUEADA 4 ORIFICIOS' };
    const r = evaluarFila(valores(), { reporte: REPORTE, item, tipo: 'CONSIGNACION' });

    expect(r.estado).toBe(ESTADOS_FILA.OK);
    expect(r.vinculados.descripcion).toBe('PLACA BLOQUEADA 4 ORIFICIOS');
    expect(r.payload.descripcion).toBe('PLACA BLOQUEADA 4 ORIFICIOS');
    expect(construirDatosDoc(r.payload).descripcion).toBe('PLACA BLOQUEADA 4 ORIFICIOS');
    expect(r.observacion).toBe('');
  });

  it('Detalle: igual que Registro, descriptorEmpresa tiene prioridad sobre descriptorAuto', () => {
    const r = evaluarFila(valores(), { reporte: REPORTE, item: { ...ITEM, descriptorAuto: 'AUTO' }, tipo: 'CONSIGNACION' });
    expect(r.vinculados.descripcion).toBe('TORNILLO 3.5');
  });

  it('Detalle: vacío si el código no está en el maestro', () => {
    const r = evaluarFila(valores(), { reporte: REPORTE, item: undefined, tipo: 'CONSIGNACION' });
    expect(r.vinculados.descripcion).toBeUndefined();
  });

  it('Paciente ingresado tiene prioridad y se guarda en mayúsculas', () => {
    const r = evaluarFila(valores({ paciente: 'ana díaz' }), { reporte: REPORTE, item: ITEM, tipo: 'CONSIGNACION' });
    expect(r.payload.nombre).toBe('ANA DÍAZ');
    expect(r.payload.medico).toBe('DR. SOTO');
  });

  it('Admisión no encontrada es advertencia y se puede guardar', () => {
    const r = evaluarFila(valores(), { reporte: null, item: ITEM, tipo: 'CONSIGNACION' });
    expect(r.estado).toBe(ESTADOS_FILA.ADMISION_NO_ENCONTRADA);
    expect(esEstadoGuardable(r.estado)).toBe(true);
    expect(r.celdasAdvertencia.admision).toBeDefined();
    expect(r.payload).toMatchObject({ prevision: '', convenio: '', descripcionPabellon: '' });
  });

  it('Código no encontrado marca la celda del código y no se guarda', () => {
    const r = evaluarFila(valores(), { reporte: REPORTE, item: undefined, tipo: 'CONSIGNACION' });
    expect(r.estado).toBe(ESTADOS_FILA.CODIGO_NO_ENCONTRADO);
    expect(r.celdasError.codigo).toMatch(/no encontrado/);
    expect(r.payload).toBeNull();
    expect(esEstadoGuardable(r.estado)).toBe(false);
  });

  it('Proveedor distinto al del maestro es dato inválido; igual (sin tildes/mayúsculas) es OK', () => {
    const malo = evaluarFila(valores({ proveedor: 'OTRA' }), { reporte: REPORTE, item: ITEM, tipo: 'CONSIGNACION' });
    expect(malo.estado).toBe(ESTADOS_FILA.DATO_INVALIDO);
    expect(malo.celdasError.proveedor).toBeDefined();

    const bueno = evaluarFila(valores({ proveedor: ' acme  medical ' }), { reporte: REPORTE, item: ITEM, tipo: 'CONSIGNACION' });
    expect(bueno.estado).toBe(ESTADOS_FILA.OK);
  });

  it('Dato inválido incluye en la observación cada problema', () => {
    const r = evaluarFila(valores({ fecha: '32-01-2026', cantidad: '1.5' }), { reporte: REPORTE, item: ITEM, tipo: 'CONSIGNACION' });
    expect(r.estado).toBe(ESTADOS_FILA.DATO_INVALIDO);
    expect(r.observacion).toMatch(/Fecha cirugía inválida/);
    expect(r.observacion).toMatch(/Cantidad inválida/);
    expect(r.payload).toBeNull();
  });

  it('un ítem del maestro sin referencia no pasa la validación de Registro', () => {
    const r = evaluarFila(valores(), { reporte: REPORTE, item: { ...ITEM, referencia: '' }, tipo: 'CONSIGNACION' });
    expect(r.estado).toBe(ESTADOS_FILA.DATO_INVALIDO);
    expect(r.payload).toBeNull();
  });
});

describe('resolverFilas', () => {
  it('consulta cada Admisión distinta una sola vez y el maestro una vez', async () => {
    const filas = [
      { ...crearFilaVacia(), valores: valores() },
      { ...crearFilaVacia(), valores: valores({ codigo: 'C-100' }) },
      { ...crearFilaVacia(), valores: valores({ admision: '777', codigo: 'X-1' }) },
      crearFilaVacia()
    ];
    const obtenerCodigos = vi.fn(async () => [ITEM]);
    const buscarReporte = vi.fn(async (adm) => (adm === '555' ? REPORTE : null));

    const resultados = await resolverFilas(filas, { tipo: 'CONSIGNACION', obtenerCodigos, buscarReporte });

    expect(obtenerCodigos).toHaveBeenCalledTimes(1);
    expect(obtenerCodigos).toHaveBeenCalledWith('CONSIGNACION');
    expect(buscarReporte).toHaveBeenCalledTimes(2);
    expect(resultados.size).toBe(3);
    expect(resultados.get(filas[0].id).estado).toBe(ESTADOS_FILA.OK);
    expect(resultados.get(filas[1].id).estado).toBe(ESTADOS_FILA.OK);
    expect(resultados.get(filas[2].id).estado).toBe(ESTADOS_FILA.CODIGO_NO_ENCONTRADO);
  });

  it('un error al consultar una Admisión se trata como no encontrada', async () => {
    const filas = [{ ...crearFilaVacia(), valores: valores() }];
    const resultados = await resolverFilas(filas, {
      tipo: 'CONSIGNACION',
      obtenerCodigos: async () => [ITEM],
      buscarReporte: async () => { throw new Error('red'); }
    });
    expect(resultados.get(filas[0].id).estado).toBe(ESTADOS_FILA.ADMISION_NO_ENCONTRADA);
  });
});

describe('resumen y confirmación', () => {
  it('cuenta OK, advertencias, errores y filas sin cargar (ignora filas vacías)', () => {
    const conDatos = (estado) => ({ ...crearFilaVacia(), valores: valores(), resultado: estado ? { estado } : null });
    const filas = [
      conDatos(ESTADOS_FILA.OK), conDatos(ESTADOS_FILA.OK),
      conDatos(ESTADOS_FILA.ADMISION_NO_ENCONTRADA),
      conDatos(ESTADOS_FILA.CODIGO_NO_ENCONTRADO), conDatos(ESTADOS_FILA.DATO_INVALIDO),
      conDatos(null),
      crearFilaVacia()
    ];
    expect(resumirFilas(filas)).toEqual({ ok: 2, advertencias: 1, errores: 2, sinCargar: 1, guardables: 3 });
  });

  it('arma el mensaje de confirmación', () => {
    expect(mensajeConfirmacionGuardado({ guardables: 18, errores: 2, sinCargar: 0 }))
      .toBe('Se guardarán 18 registros. Las 2 filas con errores no se guardarán.');
    expect(mensajeConfirmacionGuardado({ guardables: 1, errores: 0, sinCargar: 0 }))
      .toBe('Se guardarán 1 registro.');
  });
});

describe('planificarBloques (batch de máximo 500 escrituras)', () => {
  it('cuenta documento + log por registro y 3 carpetas por fecha distinta en cada bloque', () => {
    const payloads = Array.from({ length: 300 }, () => ({ fecha: '2026-10-06' }));
    const bloques = planificarBloques(payloads);

    // 3 carpetas + 248 * 2 = 499 en el primer bloque.
    expect(bloques[0].indices).toHaveLength(248);
    expect(bloques[0].escrituras).toBe(499);
    expect(bloques[1].indices).toHaveLength(52);
    expect(bloques.every((b) => b.escrituras <= 500)).toBe(true);
    expect(bloques.flatMap((b) => b.indices)).toEqual(payloads.map((_, i) => i));
  });

  it('fechas distintas suman sus carpetas', () => {
    const bloques = planificarBloques([{ fecha: '2026-10-01' }, { fecha: '2026-10-02' }, { fecha: '2026-10-01' }]);
    expect(bloques).toHaveLength(1);
    expect(bloques[0].escrituras).toBe(3 + 2 + 3 + 2 + 2);
  });
});
