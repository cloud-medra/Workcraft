// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDetallesOCFiltros } from './useDetallesOCFiltros';

const FILAS = [
  { id: '1', admision: '500100', paciente: 'Juan Pérez', oc: 'OC-111', numero_guia: 'G-1', numero_factura: '' },
  { id: '2', admision: '500200', paciente: 'María Soto', oc: 'OC-222', numero_guia: '', numero_factura: 'F-500' },
  { id: '3', admision: '500300', paciente: 'Pedro Pérez', oc: '', numero_guia: 'G-999', numero_factura: '' },
];

describe('useDetallesOCFiltros', () => {
  it('sin filtros, devuelve todas las filas', () => {
    const { result } = renderHook(() => useDetallesOCFiltros(FILAS));
    expect(result.current.filasFiltradas).toHaveLength(3);
    expect(result.current.totalFilas).toBe(3);
  });

  it('busca por admisión (coincidencia parcial)', () => {
    const { result } = renderHook(() => useDetallesOCFiltros(FILAS));
    act(() => result.current.setBusquedaAdmisionPaciente('5002'));
    expect(result.current.filasFiltradas.map(f => f.id)).toEqual(['2']);
  });

  it('busca por nombre de paciente (coincidencia parcial, sin distinguir mayúsculas)', () => {
    const { result } = renderHook(() => useDetallesOCFiltros(FILAS));
    act(() => result.current.setBusquedaAdmisionPaciente('pérez'));
    expect(result.current.filasFiltradas.map(f => f.id).sort()).toEqual(['1', '3']);
  });

  it('busca por OC', () => {
    const { result } = renderHook(() => useDetallesOCFiltros(FILAS));
    act(() => {
      result.current.setCampoBusquedaOC('oc');
      result.current.setTextoBusquedaOC('111');
    });
    expect(result.current.filasFiltradas.map(f => f.id)).toEqual(['1']);
  });

  it('busca por factura cuando el selector está en "factura"', () => {
    const { result } = renderHook(() => useDetallesOCFiltros(FILAS));
    act(() => {
      result.current.setCampoBusquedaOC('factura');
      result.current.setTextoBusquedaOC('500');
    });
    expect(result.current.filasFiltradas.map(f => f.id)).toEqual(['2']);
  });

  it('busca por guía cuando el selector está en "guia"', () => {
    const { result } = renderHook(() => useDetallesOCFiltros(FILAS));
    act(() => {
      result.current.setCampoBusquedaOC('guia');
      result.current.setTextoBusquedaOC('999');
    });
    expect(result.current.filasFiltradas.map(f => f.id)).toEqual(['3']);
  });

  it('combina búsqueda de admisión/paciente con búsqueda de OC/factura/guía (AND, no OR)', () => {
    const { result } = renderHook(() => useDetallesOCFiltros(FILAS));
    act(() => {
      result.current.setBusquedaAdmisionPaciente('pérez');
      result.current.setCampoBusquedaOC('guia');
      result.current.setTextoBusquedaOC('999');
    });
    // "Pérez" coincide con las filas 1 y 3, pero solo la 3 tiene guía "999"
    expect(result.current.filasFiltradas.map(f => f.id)).toEqual(['3']);
  });

  it('pagina el resultado ya filtrado en bloques de 50 y resetea a la página 1 al cambiar un filtro', () => {
    const muchasFilas = Array.from({ length: 120 }, (_, i) => ({ id: String(i), admision: `ADM-${i}`, paciente: 'Test' }));
    const { result } = renderHook(() => useDetallesOCFiltros(muchasFilas));

    expect(result.current.totalPaginas).toBe(3);
    expect(result.current.filasPagina).toHaveLength(50);

    act(() => result.current.setPagina(3));
    expect(result.current.pagina).toBe(3);
    expect(result.current.filasPagina).toHaveLength(20);

    act(() => result.current.setBusquedaAdmisionPaciente('ADM-1'));
    expect(result.current.pagina).toBe(1);
  });
});
