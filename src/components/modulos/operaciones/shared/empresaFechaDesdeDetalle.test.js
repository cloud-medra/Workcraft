import { describe, it, expect, vi } from 'vitest';
vi.mock('firebase/firestore', () => ({ getDocs: vi.fn(), query: vi.fn(), limit: vi.fn() }));
import { validarNuevaEmpresaFecha, MENSAJE_DUPLICADO } from './empresaFechaDesdeDetalle';

const periodo = { anio: 2026, mes: 'septiembre' };
const base = { periodo, cargandoPeriodo: false, nombreModulo: 'Implantes', bloques: [{ empresa: 'ARENYS MED S.A.', fecha: '2026-09-23' }] };

describe('validarNuevaEmpresaFecha', () => {
  it('acepta una fecha del período con empresa nueva', () => {
    expect(validarNuevaEmpresaFecha({ ...base, fecha: '2026-09-24', empresa: 'OTRA' })).toBeNull();
  });
  it('exige fecha y empresa', () => {
    expect(validarNuevaEmpresaFecha({ ...base, fecha: '', empresa: 'OTRA' })).toMatch(/fecha es obligatoria/);
    expect(validarNuevaEmpresaFecha({ ...base, fecha: '2026-09-24', empresa: '  ' })).toMatch(/empresa es obligatoria/);
  });
  it('rechaza fechas fuera del período abierto', () => {
    expect(validarNuevaEmpresaFecha({ ...base, fecha: '2026-08-31', empresa: 'OTRA' }))
      .toBe('La fecha debe estar dentro del período abierto (Septiembre 2026).');
    expect(validarNuevaEmpresaFecha({ ...base, fecha: '2025-09-10', empresa: 'OTRA' })).toMatch(/período abierto/);
  });
  it('acepta anio guardado como texto', () => {
    expect(validarNuevaEmpresaFecha({ ...base, periodo: { anio: '2026', mes: 'septiembre' }, fecha: '2026-09-01', empresa: 'OTRA' })).toBeNull();
  });
  it('sin período abierto o cargando, no permite crear', () => {
    expect(validarNuevaEmpresaFecha({ ...base, periodo: null, fecha: '2026-09-24', empresa: 'OTRA' })).toBe('No hay un período abierto para Implantes.');
    expect(validarNuevaEmpresaFecha({ ...base, cargandoPeriodo: true, fecha: '2026-09-24', empresa: 'OTRA' })).toMatch(/Cargando/);
  });
  it('detecta duplicado contra las cards cargadas (sin distinguir mayúsculas/espacios)', () => {
    expect(validarNuevaEmpresaFecha({ ...base, fecha: '2026-09-23', empresa: ' arenys med s.a. ' })).toBe(MENSAJE_DUPLICADO);
  });
});
