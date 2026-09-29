import { describe, it, expect } from 'vitest';
import { formatearPesos } from './formatearMoneda';

describe('formatearPesos', () => {
  it('redondea al peso más cercano y usa punto de miles', () => {
    expect(formatearPesos(123456.78)).toBe('123.457');
    expect(formatearPesos(123456.49)).toBe('123.456');
    expect(formatearPesos(123456.5)).toBe('123.457');
    expect(formatearPesos(12345678)).toBe('12.345.678');
  });
  it('acepta texto numérico y valores vacíos', () => {
    expect(formatearPesos('4115226.4')).toBe('4.115.226');
    expect(formatearPesos(undefined)).toBe('0');
    expect(formatearPesos('')).toBe('0');
    expect(formatearPesos(null)).toBe('0');
  });
  it('no muestra "-0"', () => {
    expect(formatearPesos(-0.4)).toBe('0');
    expect(formatearPesos(-1234.6)).toBe('-1.235');
  });
});
