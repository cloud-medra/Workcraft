import { describe, it, expect } from 'vitest';
import { agruparPorAdmisionEmpresaFecha, construirClaveGrupo, claveFechaDia } from './agruparPorAdmisionEmpresaFecha';

const fila = (overrides) => ({
  id: '1', admision: '500100', paciente: 'Juan Pérez', medico: 'Dr. Soto',
  proveedor: 'Arthrex Chile SpA', fecha_cx: new Date(2026, 8, 20), ...overrides
});

describe('claveFechaDia', () => {
  it('normaliza a YYYY-MM-DD, ignorando la hora', () => {
    expect(claveFechaDia(new Date(2026, 8, 20, 23, 59))).toBe('2026-09-20');
    expect(claveFechaDia(new Date(2026, 8, 20, 0, 1))).toBe('2026-09-20');
  });

  it('acepta un Timestamp-like con .toDate()', () => {
    const timestampFake = { toDate: () => new Date(2026, 0, 5) };
    expect(claveFechaDia(timestampFake)).toBe('2026-01-05');
  });

  it('devuelve string vacío para fechas vacías o inválidas', () => {
    expect(claveFechaDia(null)).toBe('');
    expect(claveFechaDia(undefined)).toBe('');
  });
});

describe('agruparPorAdmisionEmpresaFecha', () => {
  it('agrupa varias filas con misma admisión+empresa+fecha en un solo grupo', () => {
    const filas = [fila({ id: '1' }), fila({ id: '2' }), fila({ id: '3' })];
    const grupos = agruparPorAdmisionEmpresaFecha(filas);
    expect(grupos).toHaveLength(1);
    expect(grupos[0].totalItems).toBe(3);
    expect(grupos[0].items.map(i => i.id)).toEqual(['1', '2', '3']);
  });

  it('separa en grupos distintos si cambia la EMPRESA (misma admisión y fecha)', () => {
    const filas = [
      fila({ id: '1', proveedor: 'Empresa A' }),
      fila({ id: '2', proveedor: 'Empresa A' }),
      fila({ id: '3', proveedor: 'Empresa B' }),
      fila({ id: '4', proveedor: 'Empresa B' }),
      fila({ id: '5', proveedor: 'Empresa B' }),
    ];
    const grupos = agruparPorAdmisionEmpresaFecha(filas);
    expect(grupos).toHaveLength(2);
    const grupoA = grupos.find(g => g.proveedor === 'Empresa A');
    const grupoB = grupos.find(g => g.proveedor === 'Empresa B');
    expect(grupoA.totalItems).toBe(2);
    expect(grupoB.totalItems).toBe(3);
  });

  it('separa en grupos distintos si cambia la FECHA_CX (misma admisión y empresa)', () => {
    const filas = [
      fila({ id: '1', fecha_cx: new Date(2026, 8, 20) }),
      fila({ id: '2', fecha_cx: new Date(2026, 8, 21) }),
    ];
    const grupos = agruparPorAdmisionEmpresaFecha(filas);
    expect(grupos).toHaveLength(2);
  });

  it('separa en grupos distintos si cambia la ADMISION (misma empresa y fecha)', () => {
    const filas = [
      fila({ id: '1', admision: '111' }),
      fila({ id: '2', admision: '222' }),
    ];
    const grupos = agruparPorAdmisionEmpresaFecha(filas);
    expect(grupos).toHaveLength(2);
  });

  it('usa los datos de la primera fila del grupo como representativos', () => {
    const filas = [
      fila({ id: '1', paciente: 'Juan Pérez', medico: 'Dr. Soto' }),
      fila({ id: '2', paciente: 'Juan Pérez (typo distinto)', medico: 'Otro Doctor' }),
    ];
    const [grupo] = agruparPorAdmisionEmpresaFecha(filas);
    expect(grupo.paciente).toBe('Juan Pérez');
    expect(grupo.medico).toBe('Dr. Soto');
  });

  it('construirClaveGrupo es estable y consistente con la agrupación', () => {
    const a = fila({ id: '1' });
    const b = fila({ id: '2' });
    expect(construirClaveGrupo(a)).toBe(construirClaveGrupo(b));
  });
});
