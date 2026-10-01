import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../../../firebaseConfig', () => ({ db: {}, storage: {}, auth: {} }));
const { filtrarOCSinPdf, aniosDePeriodos, mesesDePeriodos } = await import('./useOCSinPdf');

const filas = [
  { oc: '4500001', admisiones: ['100001'], pacientes: ['JOSÉ PÉREZ'], empresas: ['MEDTRONIC'], fechas: ['2026-09-15'] },
  { oc: '4500002', admisiones: ['100003'], pacientes: ['ANA DIAZ'], empresas: ['ALCO'], fechas: ['2026-09-01'] }
];

describe('filtrarOCSinPdf', () => {
  it('busca por OC, admisión, paciente o empresa, sin tildes', () => {
    expect(filtrarOCSinPdf(filas, 'jose perez').map(f => f.oc)).toEqual(['4500001']);
    expect(filtrarOCSinPdf(filas, '100003').map(f => f.oc)).toEqual(['4500002']);
    expect(filtrarOCSinPdf(filas, '')).toHaveLength(2);
  });
});

describe('aniosDePeriodos / mesesDePeriodos', () => {
  it('solo años y meses con OC, del más reciente al más antiguo', () => {
    const periodos = ['2026-09', '2026-03', '2025-12', '2025-11'];
    expect(aniosDePeriodos(periodos)).toEqual(['2026', '2025']);
    expect(mesesDePeriodos(periodos, '2026')).toEqual(['09', '03']);
    expect(mesesDePeriodos(periodos, '2025')).toEqual(['12', '11']);
    expect(mesesDePeriodos(periodos, '')).toEqual([]);
    expect(aniosDePeriodos([])).toEqual([]);
  });
});
