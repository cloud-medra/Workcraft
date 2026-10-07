import { describe, it, expect } from 'vitest';
import { parsearGS1, fechaGS1aISO, gtinValido } from './gs1';

const GS = '\u001d';

describe('parsearGS1', () => {
  it('con paréntesis: GTIN, lote y vencimiento', () => {
    expect(parsearGS1('(01)07612345678900(17)261231(10)ABC123')).toMatchObject({
      esGS1: true, gtin: '07612345678900', lote: 'ABC123', vencimiento: '2026-12-31'
    });
  });

  it('crudo con separador GS (FNC1) y lote antes del vencimiento', () => {
    expect(parsearGS1(`0109501101530003${'10'}L-77${GS}17270630`)).toMatchObject({
      esGS1: true, gtin: '09501101530003', lote: 'L-77', vencimiento: '2027-06-30'
    });
  });

  it('crudo sin GS con el lote al final, y prefijo de simbología ]C1 / ]d2', () => {
    expect(parsearGS1(']C1010761234567890017261231' + '10LOTE9')).toMatchObject({ gtin: '07612345678900', lote: 'LOTE9', vencimiento: '2026-12-31' });
    expect(parsearGS1(']d2010761234567890017261231' + '10LOTE9').esGS1).toBe(true);
  });

  it('vencimiento con día 00 = último día del mes (también febrero bisiesto)', () => {
    expect(parsearGS1('(01)07612345678900(17)260400').vencimiento).toBe('2026-04-30');
    expect(parsearGS1('(01)07612345678900(17)280200').vencimiento).toBe('2028-02-29');
  });

  it('sin lote ni vencimiento deja esos campos vacíos', () => {
    expect(parsearGS1('(01)07612345678900')).toMatchObject({ esGS1: true, lote: '', vencimiento: '' });
  });

  it('no es GS1: EAN-13, código interno, GTIN con verificador inválido o vacío', () => {
    expect(parsearGS1('7801234567894').esGS1).toBe(false);
    expect(parsearGS1('ABC-123').esGS1).toBe(false);
    expect(parsearGS1('(01)07612345678901(10)X').esGS1).toBe(false);
    expect(parsearGS1('').esGS1).toBe(false);
  });
});

describe('fechaGS1aISO / gtinValido', () => {
  it('fechas inválidas devuelven vacío', () => {
    expect(fechaGS1aISO('261331')).toBe('');
    expect(fechaGS1aISO('260231')).toBe('');
    expect(fechaGS1aISO('abc')).toBe('');
  });

  it('valida el dígito verificador', () => {
    expect(gtinValido('07612345678900')).toBe(true);
    expect(gtinValido('7801234567894')).toBe(true);
    expect(gtinValido('7801234567890')).toBe(false);
  });
});
