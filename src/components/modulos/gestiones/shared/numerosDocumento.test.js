import { describe, it, expect } from 'vitest';
import { convertirNumeroSeguro, numeroDesdeXml, normalizarNumerosDocumento } from './numerosDocumento';

describe('convertirNumeroSeguro', () => {
  it('convierte enteros y decimales con punto', () => {
    expect(convertirNumeroSeguro('14582947')).toEqual({ valor: 14582947, seguro: true });
    expect(convertirNumeroSeguro(' 12.5 ')).toEqual({ valor: 12.5, seguro: true });
    expect(convertirNumeroSeguro('-3')).toEqual({ valor: -3, seguro: true });
    expect(convertirNumeroSeguro(42)).toEqual({ valor: 42, seguro: true });
  });

  it('no convierte formatos ambiguos ni vacíos', () => {
    ['1.234.567', '1,5', '1.234,50', '$1000', '', '  ', 'NaN'].forEach((v) => {
      expect(convertirNumeroSeguro(v)).toEqual({ valor: v, seguro: false });
    });
    expect(convertirNumeroSeguro(null).seguro).toBe(false);
    expect(convertirNumeroSeguro(undefined).seguro).toBe(false);
  });
});

describe('numeroDesdeXml', () => {
  it('parsea y usa 0 para vacíos', () => {
    expect(numeroDesdeXml('100')).toBe(100);
    expect(numeroDesdeXml('2.5')).toBe(2.5);
    expect(numeroDesdeXml('')).toBe(0);
    expect(numeroDesdeXml(undefined)).toBe(0);
  });
});

describe('normalizarNumerosDocumento', () => {
  it('convierte total y montos de detalles sin tocar otros campos', () => {
    const r = normalizarNumerosDocumento({
      folio: '123', total: '1000',
      detalles: [{ codigo: '0001', cantidad: '2', precio: '500', monto: '1000', nroLin: '1' }]
    });
    expect(r).toEqual({
      folio: '123', total: 1000,
      detalles: [{ codigo: '0001', cantidad: 2, precio: 500, monto: 1000, nroLin: '1' }]
    });
  });

  it('deja como están los valores que no se pueden convertir con seguridad', () => {
    expect(normalizarNumerosDocumento({ total: '1.234.567' }).total).toBe('1.234.567');
  });

  it('no agrega campos que no existían', () => {
    expect(normalizarNumerosDocumento({ folio: '1' })).toEqual({ folio: '1' });
  });
});
