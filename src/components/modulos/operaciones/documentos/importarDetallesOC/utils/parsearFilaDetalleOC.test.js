import { describe, it, expect } from 'vitest';
import { normalizarFilaDetalleOC, parsearFechaExcel } from './parsearFilaDetalleOC';

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

  it('descarta filas sin ID (basura/filas vacías del Excel)', () => {
    const sinId = { ...filaExcelCompleta(), ID: '' };
    expect(normalizarFilaDetalleOC(sinId, XLSXFake)).toBeNull();

    const idUndefined = { ...filaExcelCompleta() };
    delete idUndefined.ID;
    expect(normalizarFilaDetalleOC(idUndefined, XLSXFake)).toBeNull();
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
