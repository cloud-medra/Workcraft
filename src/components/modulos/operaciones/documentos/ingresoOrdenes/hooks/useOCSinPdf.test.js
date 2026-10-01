import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../../../firebaseConfig', () => ({ db: {}, storage: {}, auth: {} }));
const { filtrarOCSinPdf, aniosSeleccionables } = await import('./useOCSinPdf');

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

describe('aniosSeleccionables', () => {
  it('el año actual y los 4 anteriores, sin leer Firestore', () => {
    expect(aniosSeleccionables(new Date(2026, 9, 1))).toEqual(['2026', '2025', '2024', '2023', '2022']);
  });
});
