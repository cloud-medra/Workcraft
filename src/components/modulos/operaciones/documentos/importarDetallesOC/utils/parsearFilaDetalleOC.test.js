import { describe, it, expect } from 'vitest';
import {
  normalizarFilaDetalleOC, parsearFechaExcel, limpiarOC, numeroFlexible, mapearEncabezados, validarFilaDetalleOC
} from './parsearFilaDetalleOC';

// Fake mínimo de XLSX.SSF.parse_date_code (para no depender de la librería
// real en este test — solo se usa para números seriales de Excel).
const XLSXFake = {
  SSF: {
    // Serial 45901 = 2025-09-01 (valor de ejemplo, no se valida el cálculo
    // real de Excel acá, solo que la función lo use tal cual lo entrega).
    parse_date_code: () => ({ y: 2025, m: 9, d: 1 })
  }
};

describe('parsearFechaExcel', () => {
  it('acepta un objeto Date y le quita la hora', () => {
    const resultado = parsearFechaExcel(new Date(2026, 8, 20, 15, 30), XLSXFake);
    expect(resultado.getFullYear()).toBe(2026);
    expect(resultado.getMonth()).toBe(8);
    expect(resultado.getDate()).toBe(20);
    expect(resultado.getHours()).toBe(0);
  });

  it('acepta un número serial de Excel', () => {
    const resultado = parsearFechaExcel(45901, XLSXFake);
    expect(resultado.getFullYear()).toBe(2025);
    expect(resultado.getMonth()).toBe(8);
    expect(resultado.getDate()).toBe(1);
  });

  it('acepta texto "dd/mm/yyyy"', () => {
    const resultado = parsearFechaExcel('20/09/2026', XLSXFake);
    expect(resultado.getFullYear()).toBe(2026);
    expect(resultado.getMonth()).toBe(8);
    expect(resultado.getDate()).toBe(20);
  });

  it('acepta texto "yyyy-mm-dd"', () => {
    const resultado = parsearFechaExcel('2026-09-20', XLSXFake);
    expect(resultado.getFullYear()).toBe(2026);
    expect(resultado.getMonth()).toBe(8);
    expect(resultado.getDate()).toBe(20);
  });

  it('devuelve null para vacío o texto no interpretable', () => {
    expect(parsearFechaExcel('', XLSXFake)).toBeNull();
    expect(parsearFechaExcel(null, XLSXFake)).toBeNull();
    expect(parsearFechaExcel('no es una fecha', XLSXFake)).toBeNull();
  });
});

describe('normalizarFilaDetalleOC', () => {
  const filaExcelCompleta = () => ({
    ID: '1001', ADMISION: '500100', PACIENTE: 'Juan Pérez', MEDICO: 'Dr. Soto',
    FECHA_CX: '20/09/2026', PROVEEDOR: 'Arthrex Chile SpA', CODIGO: 'COD-1',
    DESCRIPCION: 'Placa', CANT: 2, PRECIO_U: 15000, ATRIBUTO: 'A1',
    OC: 'OC-999', OC_MONTO: 30000, ESTADO: 'RECIBIDO',
    FECHA_RECEPCION: '21/09/2026', FECHA_CARGO: '', NUMERO_GUIA: 'G-1', NUMERO_FACTURA: '',
    FECHA_EMISION: '', FECHA_INGRESO: '22/09/2026', LOTE: 'L-1', FECHA_VENCIMIENTO: ''
  });

  it('mapea todas las columnas del Excel a los nombres de campo en minúscula esperados', () => {
    const resultado = normalizarFilaDetalleOC(filaExcelCompleta(), XLSXFake);
    expect(resultado).toMatchObject({
      id: '1001', admision: '500100', paciente: 'Juan Pérez', medico: 'Dr. Soto',
      proveedor: 'Arthrex Chile SpA', codigo: 'COD-1', descripcion: 'Placa',
      cantidad: 2, precio_u: 15000, atributo: 'A1',
      oc: 'OC-999', oc_monto: 30000, estado: 'RECIBIDO',
      numero_guia: 'G-1', numero_factura: '', lote: 'L-1'
    });
    expect(resultado.fecha_cx).toBeInstanceOf(Date);
    expect(resultado.fecha_recepcion).toBeInstanceOf(Date);
    expect(resultado.fecha_cargo).toBeNull();
    expect(resultado.fecha_emision).toBeNull();
    expect(resultado.fecha_vencimiento).toBeNull();
  });

  it('sin ID la fila igual se normaliza, con id vacío (se genera después)', () => {
    const sinId = { ...filaExcelCompleta(), ID: '' };
    expect(normalizarFilaDetalleOC(sinId, XLSXFake)).toMatchObject({ id: '', admision: '500100' });

    const idUndefined = { ...filaExcelCompleta() };
    delete idUndefined.ID;
    expect(normalizarFilaDetalleOC(idUndefined, XLSXFake)).toMatchObject({ id: '' });
  });

  it('campos numéricos vacíos se guardan como 0, no como texto vacío', () => {
    const fila = { ...filaExcelCompleta(), CANT: '', PRECIO_U: undefined, OC_MONTO: '' };
    const resultado = normalizarFilaDetalleOC(fila, XLSXFake);
    expect(resultado.cantidad).toBe(0);
    expect(resultado.precio_u).toBe(0);
    expect(resultado.oc_monto).toBe(0);
  });

  it('recorta espacios en los campos de texto', () => {
    const fila = { ...filaExcelCompleta(), PACIENTE: '  Juan Pérez  ', ID: '  1001  ' };
    const resultado = normalizarFilaDetalleOC(fila, XLSXFake);
    expect(resultado.paciente).toBe('Juan Pérez');
    expect(resultado.id).toBe('1001');
  });
});

describe('formatos tolerados', () => {
  it('fechas: año de 2 dígitos, con hora, puntos, mes en texto y serial como texto', () => {
    const iso = (d) => d && `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    expect(iso(parsearFechaExcel('15-09-26', XLSXFake))).toBe('2026-9-15');
    expect(iso(parsearFechaExcel('15-09-2026 10:30', XLSXFake))).toBe('2026-9-15');
    expect(iso(parsearFechaExcel('15.09.2026', XLSXFake))).toBe('2026-9-15');
    expect(iso(parsearFechaExcel('2026-09-15T00:00:00', XLSXFake))).toBe('2026-9-15');
    expect(iso(parsearFechaExcel('15-sep-2026', XLSXFake))).toBe('2026-9-15');
    expect(iso(parsearFechaExcel('15 de septiembre de 2026', XLSXFake))).toBe('2026-9-15');
    expect(iso(parsearFechaExcel('45901', XLSXFake))).toBe('2025-9-1');
    expect(parsearFechaExcel('31-02-2026', XLSXFake)).toBeNull();
  });

  it('OC: número, texto y formato contabilidad', () => {
    expect(limpiarOC(4500001234)).toBe('4500001234');
    expect(limpiarOC(' $ 4.500.001.234 ')).toBe('4500001234');
    expect(limpiarOC('4.500.001.234,00')).toBe('4500001234');
    expect(limpiarOC('OC-999')).toBe('OC-999');
    expect(limpiarOC(' - ')).toBe('');
    expect(limpiarOC('')).toBe('');
  });

  it('números en formato chileno/contabilidad', () => {
    expect(numeroFlexible('$ 1.234.567')).toBe(1234567);
    expect(numeroFlexible('1.234,5')).toBe(1234.5);
    expect(numeroFlexible('1,5')).toBe(1.5);
    expect(numeroFlexible('1.500')).toBe(1500);
    expect(numeroFlexible('2')).toBe(2);
    expect(numeroFlexible('-')).toBe(0);
    expect(numeroFlexible('abc')).toBeNull();
  });

  it('admisión numérica sin decimales y textos sin notación científica', () => {
    const r = normalizarFilaDetalleOC({ ID: 88123, ADMISION: 102345, FECHA_CX: '15-09-2026', OC: 4500001234, CANT: '1' }, XLSXFake);
    expect(r).toMatchObject({ id: '88123', admision: '102345', oc: '4500001234', cantidad: 1 });
  });

  it('encabezados con tildes, espacios y sinónimos', () => {
    const { mapa, faltantes } = mapearEncabezados(['ID', 'ADMISIÓN ', 'Fecha CX', 'Proveedor', 'CÓDIGO', 'CANTIDAD', 'N° OC']);
    expect(faltantes).toEqual([]);
    expect(mapa).toMatchObject({ ADMISION: 'ADMISIÓN ', FECHA_CX: 'Fecha CX', CODIGO: 'CÓDIGO', CANT: 'CANTIDAD', OC: 'N° OC' });
    expect(mapearEncabezados(['ADMISION']).faltantes).toEqual(['FECHA_CX', 'PROVEEDOR', 'CODIGO', 'CANT']);
  });

  it('validarFilaDetalleOC explica el motivo con el valor original', () => {
    expect(validarFilaDetalleOC({ id: '1', admision: '', fecha_cx: null }, { FECHA_CX: '15/13/2026' }))
      .toEqual(['ADMISION vacía', 'FECHA_CX "15/13/2026" no se reconoce como fecha']);
    expect(validarFilaDetalleOC({ id: '1', admision: '1', fecha_cx: new Date() })).toEqual([]);
  });
});

describe('encabezados de la planilla real (21 columnas)', () => {
  it('mapea ID_PACIENTE, FECHA_CIRUGIA, CODIGO_CLINICA, CODIGO_PROVEEDOR, CANTIDAD y PRECIO_UNITARIO', () => {
    const { mapa, faltantes } = mapearEncabezados([
      'ID_PACIENTE', 'PACIENTE', 'MEDICO', 'FECHA_CIRUGIA', 'PROVEEDOR', 'CODIGO_CLINICA', 'CODIGO_PROVEEDOR',
      'CANTIDAD', 'PRECIO_UNITARIO', 'ATRIBUTO', 'OC', 'OC_MONTO', 'ESTADO', 'FECHA_RECEPCION', 'FECHA_CARGO',
      'NUMERO_GUIA', 'NUMERO_FACTURA', 'FECHA_EMISION', 'FECHA_INGRESO', 'LOTE', 'FECHA_VENCIMIENTO'
    ]);
    expect(mapa).toMatchObject({
      ADMISION: 'ID_PACIENTE', FECHA_CX: 'FECHA_CIRUGIA', CODIGO: 'CODIGO_CLINICA',
      DESCRIPCION: 'CODIGO_PROVEEDOR', CANT: 'CANTIDAD', PRECIO_U: 'PRECIO_UNITARIO', OC: 'OC'
    });
    expect(mapa.ID).toBeUndefined();
    // El ID de fila es opcional: se genera (idFilaDetalleOC.js).
    expect(faltantes).toEqual([]);
  });
});
