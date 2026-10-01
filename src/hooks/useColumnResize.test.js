// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useColumnResize, claveStorageAnchos, leerAnchosGuardados } from './useColumnResize';

const COLUMNAS = [
  { key: 'a', ancho: 100, min: 60 },
  { key: 'b', ancho: 200, min: 60 }
];

describe('useColumnResize', () => {
  beforeEach(() => localStorage.clear());

  it('sin clave funciona como antes: no toca localStorage', () => {
    const { result } = renderHook(() => useColumnResize(COLUMNAS));
    act(() => result.current.handleResize('a', 150));
    expect(result.current.anchos).toEqual({ a: 150, b: 200 });
    expect(result.current.anchoTotalTabla).toBe(350);
    expect(localStorage.length).toBe(0);
  });

  it('con clave guarda solo lo que difiere del defecto, por tabla y usuario, y lo recupera', () => {
    const { result, unmount } = renderHook(() => useColumnResize(COLUMNAS, { clave: 'tabla1', usuario: 'u1' }));
    expect(result.current.personalizados).toBe(false);
    act(() => result.current.handleResize('a', 150));
    expect(JSON.parse(localStorage.getItem(claveStorageAnchos('tabla1', 'u1')))).toEqual({ a: 150 });
    expect(result.current.personalizados).toBe(true);
    unmount();

    const otraVez = renderHook(() => useColumnResize(COLUMNAS, { clave: 'tabla1', usuario: 'u1' }));
    expect(otraVez.result.current.anchos).toEqual({ a: 150, b: 200 });

    const otroUsuario = renderHook(() => useColumnResize(COLUMNAS, { clave: 'tabla1', usuario: 'u2' }));
    expect(otroUsuario.result.current.anchos).toEqual({ a: 100, b: 200 });
  });

  it('restablecer vuelve al defecto y borra lo guardado', () => {
    localStorage.setItem(claveStorageAnchos('t', 'u'), JSON.stringify({ b: 300 }));
    const { result } = renderHook(() => useColumnResize(COLUMNAS, { clave: 't', usuario: 'u' }));
    expect(result.current.anchos.b).toBe(300);
    act(() => result.current.restablecerAnchos());
    expect(result.current.anchos).toEqual({ a: 100, b: 200 });
    expect(localStorage.getItem(claveStorageAnchos('t', 'u'))).toBeNull();
  });

  it('si el uid llega después (sesión cargando) carga los anchos de ese usuario', () => {
    localStorage.setItem(claveStorageAnchos('t', 'u9'), JSON.stringify({ a: 90 }));
    const { result, rerender } = renderHook(({ usuario }) => useColumnResize(COLUMNAS, { clave: 't', usuario }), { initialProps: { usuario: undefined } });
    expect(result.current.anchos.a).toBe(100);
    rerender({ usuario: 'u9' });
    expect(result.current.anchos.a).toBe(90);
  });

  it('ignora datos corruptos, columnas que ya no existen y valores bajo el mínimo', () => {
    localStorage.setItem('x', '{no es json');
    expect(leerAnchosGuardados('x', COLUMNAS)).toEqual({});
    localStorage.setItem('y', JSON.stringify({ a: 10, b: 'ancho', vieja: 500 }));
    expect(leerAnchosGuardados('y', COLUMNAS)).toEqual({ a: 60 });
  });

  it('si localStorage falla, sigue funcionando en memoria', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceeded'); });
    const { result } = renderHook(() => useColumnResize(COLUMNAS, { clave: 't', usuario: 'u' }));
    act(() => result.current.handleResize('b', 250));
    expect(result.current.anchos.b).toBe(250);
    setItem.mockRestore();
  });
});
