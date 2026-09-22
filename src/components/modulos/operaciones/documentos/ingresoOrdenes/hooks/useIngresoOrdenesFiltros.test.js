// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIngresoOrdenesFiltros } from './useIngresoOrdenesFiltros';

const fila = (overrides) => ({
  id: '1', admision: '500100', paciente: 'Juan Pérez', medico: 'Dr. Soto',
  proveedor: 'Empresa A', fecha_cx: new Date(2026, 8, 20), ...overrides
});

describe('useIngresoOrdenesFiltros', () => {
  it('agrupa las filas sin filtro de empresa', () => {
    const filas = [
      fila({ id: '1', admision: '111', proveedor: 'Empresa A' }),
      fila({ id: '2', admision: '111', proveedor: 'Empresa A' }),
      fila({ id: '3', admision: '111', proveedor: 'Empresa B' }),
    ];
    const { result } = renderHook(() => useIngresoOrdenesFiltros(filas));
    expect(result.current.grupos).toHaveLength(2);
    expect(result.current.opcionesEmpresas).toEqual(['Empresa A', 'Empresa B']);
  });

  it('filtra por empresa antes de agrupar', () => {
    const filas = [
      fila({ id: '1', admision: '111', proveedor: 'Empresa A' }),
      fila({ id: '2', admision: '222', proveedor: 'Empresa A' }),
      fila({ id: '3', admision: '333', proveedor: 'Empresa B' }),
    ];
    const { result } = renderHook(() => useIngresoOrdenesFiltros(filas));
    act(() => result.current.setEmpresa('Empresa A'));
    expect(result.current.grupos).toHaveLength(2);
    expect(result.current.grupos.every(g => g.proveedor === 'Empresa A')).toBe(true);
  });

  it('deselecciona la empresa si deja de existir en las opciones al cambiar `filas`', () => {
    const filasIniciales = [fila({ id: '1', proveedor: 'Empresa A' })];
    const { result, rerender } = renderHook(
      ({ filas }) => useIngresoOrdenesFiltros(filas),
      { initialProps: { filas: filasIniciales } }
    );
    act(() => result.current.setEmpresa('Empresa A'));
    expect(result.current.empresa).toBe('Empresa A');

    rerender({ filas: [fila({ id: '2', proveedor: 'Empresa B' })] });
    expect(result.current.empresa).toBe('');
  });

  it('pagina los GRUPOS (no las filas individuales) en bloques de 50', () => {
    // 120 admisiones distintas, 1 fila cada una => 120 grupos
    const muchasFilas = Array.from({ length: 120 }, (_, i) => fila({ id: String(i), admision: `ADM-${i}` }));
    const { result } = renderHook(() => useIngresoOrdenesFiltros(muchasFilas));
    expect(result.current.totalFilas).toBe(120);
    expect(result.current.totalPaginas).toBe(3);
    expect(result.current.gruposPagina).toHaveLength(50);
  });
});
