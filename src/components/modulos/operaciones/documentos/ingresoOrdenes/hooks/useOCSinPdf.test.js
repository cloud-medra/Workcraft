import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../../../firebaseConfig', () => ({ db: {}, storage: {}, auth: {} }));
const { filtrarOCSinPdf } = await import('./useOCSinPdf');

const filas = [
  { oc: '4500001', admisiones: ['100001'], pacientes: ['JOSÉ PÉREZ'], empresas: ['MEDTRONIC'], fechas: ['2026-08-20', '2026-09-15'] },
  { oc: '4500002', admisiones: ['100003'], pacientes: ['ANA DIAZ'], empresas: ['ALCO'], fechas: ['2025-12-01'] }
];

describe('filtrarOCSinPdf', () => {
  it('filtra por año/mes (cualquier fecha de la OC) y por texto sin tildes', () => {
    expect(filtrarOCSinPdf(filas, { anio: '2026', mes: '09', busqueda: '' }).map(f => f.oc)).toEqual(['4500001']);
    expect(filtrarOCSinPdf(filas, { anio: '2025', mes: '', busqueda: '' }).map(f => f.oc)).toEqual(['4500002']);
    expect(filtrarOCSinPdf(filas, { anio: '', mes: '', busqueda: 'jose perez' }).map(f => f.oc)).toEqual(['4500001']);
    expect(filtrarOCSinPdf(filas, { anio: '', mes: '', busqueda: '100003' }).map(f => f.oc)).toEqual(['4500002']);
  });
});
