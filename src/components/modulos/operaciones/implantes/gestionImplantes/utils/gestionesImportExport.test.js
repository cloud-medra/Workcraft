import { describe, it, expect } from 'vitest';
import { construirTextoAdmisionNombre } from './gestionesImportExport';

describe('construirTextoAdmisionNombre', () => {
  it('termina con un espacio después del último guion', () => {
    expect(construirTextoAdmisionNombre('102030', 'JUAN PEREZ')).toBe('102030 - JUAN PEREZ - ');
    expect(construirTextoAdmisionNombre('102030', 'JUAN PEREZ').endsWith(' - ')).toBe(true);
  });

  it('mantiene el nombre tal cual (mayúsculas y espacios internos)', () => {
    expect(construirTextoAdmisionNombre('102030', 'JUAN  PEREZ SOTO')).toBe('102030 - JUAN  PEREZ SOTO - ');
  });

  it('usa P cuando falta id o nombre', () => {
    expect(construirTextoAdmisionNombre('', '')).toBe('P - P - ');
  });
});
