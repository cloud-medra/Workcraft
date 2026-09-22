import { describe, it, expect } from 'vitest';
import { normalizarProveedorId } from './normalizarProveedor';

describe('normalizarProveedorId', () => {
  it('convierte a minúsculas, quita tildes y reemplaza espacios por guión bajo', () => {
    expect(normalizarProveedorId('Arthrex Chile SpA')).toBe('arthrex_chile_spa');
  });

  it('quita tildes/diacríticos', () => {
    expect(normalizarProveedorId('Bodegas García Ñúñez')).toBe('bodegas_garcia_nunez');
  });

  it('reemplaza puntos, comas y otros caracteres especiales', () => {
    expect(normalizarProveedorId('Comercial S.A., Ltda.')).toBe('comercial_s_a_ltda');
  });

  it('colapsa separadores múltiples y recorta guiones bajos en los extremos', () => {
    expect(normalizarProveedorId('  ---Proveedor   XYZ---  ')).toBe('proveedor_xyz');
  });

  it('nunca devuelve un string vacío (ID de documento inválido en Firestore)', () => {
    expect(normalizarProveedorId('')).toBe('sin_proveedor');
    expect(normalizarProveedorId(null)).toBe('sin_proveedor');
    expect(normalizarProveedorId(undefined)).toBe('sin_proveedor');
    expect(normalizarProveedorId('   ')).toBe('sin_proveedor');
    expect(normalizarProveedorId('***')).toBe('sin_proveedor');
  });

  it('es determinístico: el mismo nombre siempre da el mismo id', () => {
    const a = normalizarProveedorId('Proveedor Uno S.A.');
    const b = normalizarProveedorId('Proveedor Uno S.A.');
    expect(a).toBe(b);
  });
});
