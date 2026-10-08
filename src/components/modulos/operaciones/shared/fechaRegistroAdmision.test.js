import { describe, it, expect } from 'vitest';
import { calcularFechaRegistroAdmision, tieneIdAdmision } from './fechaRegistroAdmision';

const ahora = new Date(2026, 9, 8, 12, 0);
const anterior = new Date(2026, 9, 1, 9, 0);

describe('tieneIdAdmision', () => {
  it('vacío, "P", null y espacios no cuentan como ID', () => {
    ['', 'P', null, undefined, '   '].forEach(v => expect(tieneIdAdmision(v)).toBe(false));
  });
  it('un número o texto con valor sí', () => {
    expect(tieneIdAdmision('12345')).toBe(true);
    expect(tieneIdAdmision(12345)).toBe(true);
  });
});

describe('calcularFechaRegistroAdmision', () => {
  it('alta con ID → ahora', () => {
    expect(calcularFechaRegistroAdmision({ idAnterior: undefined, idNuevo: '123', ahora })).toBe(ahora);
  });
  it('alta sin ID → null', () => {
    expect(calcularFechaRegistroAdmision({ idAnterior: undefined, idNuevo: 'P', ahora })).toBeNull();
  });
  it('de vacío a con valor → ahora', () => {
    expect(calcularFechaRegistroAdmision({ idAnterior: 'P', idNuevo: '123', fechaAnterior: null, ahora })).toBe(ahora);
  });
  it('mismo ID → conserva la fecha', () => {
    expect(calcularFechaRegistroAdmision({ idAnterior: '123', idNuevo: '123', fechaAnterior: anterior, ahora })).toBe(anterior);
  });
  it('ID cambiado por otro → conserva la fecha del primer registro', () => {
    expect(calcularFechaRegistroAdmision({ idAnterior: '123', idNuevo: '456', fechaAnterior: anterior, ahora })).toBe(anterior);
  });
  it('ID borrado → null', () => {
    expect(calcularFechaRegistroAdmision({ idAnterior: '123', idNuevo: '', fechaAnterior: anterior, ahora })).toBeNull();
  });
  it('registro antiguo con ID pero sin fecha → sigue en null (no se inventa)', () => {
    expect(calcularFechaRegistroAdmision({ idAnterior: '123', idNuevo: '456', fechaAnterior: undefined, ahora })).toBeNull();
  });
});
