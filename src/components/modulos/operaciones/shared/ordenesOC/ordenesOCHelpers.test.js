import { describe, it, expect } from 'vitest';
import {
  extraerOCDeNombre, nombreCoincideConOC, claveOC, rutaPdfOC,
  agruparIndicePorOC, listarOCSinPdf, clasificarArchivosOC
} from './ordenesOCHelpers';

const pdf = (name, size = 1000) => ({ name, size, type: 'application/pdf' });

describe('extraerOCDeNombre', () => {
  it('tolera variantes de separador, mayúsculas y sufijo de copia', () => {
    ['OC_12345.pdf', 'OC-12345.pdf', 'OC 12345.pdf', 'oc_12345.PDF', 'OC_12345 (1).pdf', 'OC12345.pdf', ' Oc_12345 .pdf']
      .forEach(n => expect(extraerOCDeNombre(n)).toBe('12345'));
  });

  it('no reconoce nombres de otro formato', () => {
    ['12345.pdf', 'Orden 12345.pdf', 'OC_12345_firmada.pdf', 'OC_.pdf', '102030 - JUAN - COT 1.pdf']
      .forEach(n => expect(extraerOCDeNombre(n)).toBe(''));
  });

  it('compara sin ceros a la izquierda', () => {
    expect(nombreCoincideConOC('OC_0004500001.pdf', '4500001')).toBe(true);
    expect(nombreCoincideConOC('OC_4500002.pdf', '4500001')).toBe(false);
    expect(nombreCoincideConOC('factura.pdf', '4500001')).toBe(false);
  });
});

describe('claveOC / rutaPdfOC', () => {
  it('un PDF por OC, sin caracteres que rompan la ruta', () => {
    expect(rutaPdfOC(' 0045 ')).toBe('ordenes_oc/OC_45.pdf');
    expect(claveOC('oc-99/a')).toBe('OC-99_A');
  });
});

const indice = {
  a: { k: '100001|2026-09-15|510012', e: 'PROVEEDOR UNO', oc: '4500001', p: 'PACIENTE UNO' },
  b: { k: '100001|2026-09-15|510013', e: 'PROVEEDOR UNO', oc: '4500001', p: 'PACIENTE UNO' },
  c: { k: '100002|2026-08-20|520040', e: 'PROVEEDOR DOS', oc: '4500001', p: 'PACIENTE DOS' },
  d: { k: '100003|2026-09-01|1', e: 'PROVEEDOR UNO', oc: '4500002', p: 'PACIENTE TRES' }
};

describe('listarOCSinPdf', () => {
  it('una fila por OC con todas sus admisiones/empresas, sin las que tienen PDF', () => {
    const porOC = agruparIndicePorOC(indice);
    const filas = listarOCSinPdf(porOC, { 4500002: { subidoEn: 1 } });
    expect(filas).toEqual([{
      oc: '4500001',
      admisiones: ['100001', '100002'],
      empresas: ['PROVEEDOR DOS', 'PROVEEDOR UNO'],
      pacientes: ['PACIENTE DOS', 'PACIENTE UNO'],
      fechas: ['2026-08-20', '2026-09-15'],
      fecha: '2026-08-20'
    }]);
  });
});

describe('clasificarArchivosOC', () => {
  it('separa por motivo sin tocar Firebase', () => {
    const porOC = agruparIndicePorOC(indice);
    const { aSubir, yaTenian, rechazados } = clasificarArchivosOC([
      pdf('OC_4500001.pdf'),
      pdf('OC_4500001 (1).pdf'),
      pdf('OC_4500002.pdf'),
      pdf('OC_999.pdf'),
      pdf('escaneo.pdf'),
      { name: 'OC_4500001.docx', size: 10, type: 'application/msword' },
      pdf('OC_4500003.pdf', 16 * 1024 * 1024)
    ], { porOC, registro: { 4500002: {} } });
    expect(aSubir.map(a => a.oc)).toEqual(['4500001']);
    expect(yaTenian.map(a => a.oc)).toEqual(['4500002']);
    expect(rechazados.map(r => [r.nombre, r.tipo])).toEqual([
      ['OC_4500001 (1).pdf', 'DUPLICADO'],
      ['OC_999.pdf', 'NO_ENCONTRADA'],
      ['escaneo.pdf', 'NOMBRE'],
      ['OC_4500001.docx', 'NO_PDF'],
      ['OC_4500003.pdf', 'TAMANO']
    ]);
  });
});
