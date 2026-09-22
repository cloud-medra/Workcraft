// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSeguimientoFiltros } from './useSeguimientoFiltros';

const fila = (overrides) => ({ id: '1', admision: '500100', proveedor: 'Empresa A', ...overrides });

describe('useSeguimientoFiltros', () => {
  it('sin filtro de empresa, devuelve todas las filas', () => {
    const filas = [fila({ id: '1' }), fila({ id: '2', proveedor: 'Empresa B' })];
    const { result } = renderHook(() => useSeguimientoFiltros(filas));
    expect(result.current.filasFiltradas).toHaveLength(2);
    expect(result.current.opcionesEmpresas).toEqual(['Empresa A', 'Empresa B']);
  });

  it('filtra por empresa seleccionada', () => {
    const filas = [fila({ id: '1', proveedor: 'Empresa A' }), fila({ id: '2', proveedor: 'Empresa B' })];
    const { result } = renderHook(() => useSeguimientoFiltros(filas));
    act(() => result.current.setEmpresa('Empresa B'));
    expect(result.current.filasFiltradas.map(f => f.id)).toEqual(['2']);
  });

  it('deselecciona la empresa si deja de existir tras cambiar el período o el tipo de seguimiento', () => {
    const { result, rerender } = renderHook(
      ({ filas }) => useSeguimientoFiltros(filas),
      { initialProps: { filas: [fila({ id: '1', proveedor: 'Empresa A' })] } }
    );
    act(() => result.current.setEmpresa('Empresa A'));
    rerender({ filas: [fila({ id: '2', proveedor: 'Empresa B' })] });
    expect(result.current.empresa).toBe('');
  });

  it('pagina en bloques de 50 y resetea a la página 1 al cambiar de empresa', () => {
    const muchasFilas = Array.from({ length: 60 }, (_, i) => fila({ id: String(i) }));
    const { result } = renderHook(() => useSeguimientoFiltros(muchasFilas));
    act(() => result.current.setPagina(2));
    expect(result.current.pagina).toBe(2);
    act(() => result.current.setEmpresa('Empresa A'));
    expect(result.current.pagina).toBe(1);
  });
});
