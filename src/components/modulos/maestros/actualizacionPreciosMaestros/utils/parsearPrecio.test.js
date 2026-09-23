import { describe, it, expect } from 'vitest';
import { parsearPrecio } from './parsearPrecio';

describe('parsearPrecio', () => {
  it.each([
    [1350, 1350],
    [1350.5, 1350.5],
    ['1350', 1350],
    ['1.350', 1350],
    ['1.350.000', 1350000],
    ['1,350,000', 1350000],
    ['1350,5', 1350.5],
    ['1350.5', 1350.5],
    ['1.350,50', 1350.5],
    ['1,350.50', 1350.5],
    ['$ 1.350', 1350],
    ['  2500  ', 2500],
    ['0,5', 0.5]
  ])('%j → %d', (entrada, esperado) => {
    expect(parsearPrecio(entrada)).toEqual({ ok: true, valor: esperado });
  });

  it.each([null, undefined, '', '   ', '$'])('%j → vacío', (entrada) => {
    expect(parsearPrecio(entrada)).toEqual({ vacio: true });
  });

  it.each([0, -5, '0', '0,00', '-1350'])('%j → error por no ser mayor que 0', (entrada) => {
    expect(parsearPrecio(entrada)).toEqual({ ok: false, motivo: 'El nuevo precio debe ser mayor que 0' });
  });

  it.each(['abc', '12a', '1.35.0', '1,35,0', '1.350,5,0', '1350,', 'N/A', NaN])('%j → error no numérico', (entrada) => {
    expect(parsearPrecio(entrada)).toEqual({ ok: false, motivo: 'El nuevo precio no es un número válido' });
  });
});
