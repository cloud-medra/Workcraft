import { describe, it, expect } from 'vitest';
import { asignarIdsFilas, grupoFilaDetalleOC } from './idFilaDetalleOC';

const fila = (extra = {}) => ({
  id: '', admision: '114584', fecha_cx: new Date(2026, 8, 15), proveedor: 'MEDTRONIC', codigo: '510012', cantidad: 1, ...extra
});

describe('asignarIdsFilas', () => {
  it('clave base + correlativo por aparición, sin pisar repetidas', () => {
    const r = asignarIdsFilas([fila(), fila({ codigo: '510013' }), fila(), fila()]);
    expect(r.map(f => f.id)).toEqual([
      '114584_20260915_medtronic_510012_1',
      '114584_20260915_medtronic_510013_1',
      '114584_20260915_medtronic_510012_2',
      '114584_20260915_medtronic_510012_3'
    ]);
    expect(r[0]._grupo).toBe('114584_20260915_medtronic_510012');
  });

  it('es estable: el mismo archivo genera los mismos IDs', () => {
    const filas = [fila(), fila(), fila({ admision: '200' })];
    expect(asignarIdsFilas(filas).map(f => f.id)).toEqual(asignarIdsFilas(filas).map(f => f.id));
  });

  it('respeta el ID del Excel si viene, y no lo marca con grupo', () => {
    const [r] = asignarIdsFilas([fila({ id: '88123' })]);
    expect(r.id).toBe('88123');
    expect(r._grupo).toBeUndefined();
  });

  it('código con "/" o vacío no rompe la ruta de Firestore', () => {
    expect(grupoFilaDetalleOC(fila({ codigo: 'ab 1/2' }))).toBe('114584_20260915_medtronic_AB1-2');
    expect(grupoFilaDetalleOC(fila({ codigo: '' }))).toBe('114584_20260915_medtronic_SIN_CODIGO');
  });
});
