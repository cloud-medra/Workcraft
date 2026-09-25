// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { suscribirConVisibilidad } from './useVisibleSnapshot';

let visibilidad = 'visible';
Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibilidad });
const cambiar = (v) => { visibilidad = v; document.dispatchEvent(new Event('visibilitychange')); };

beforeEach(() => { vi.useFakeTimers(); visibilidad = 'visible'; });
afterEach(() => vi.useRealTimers());

describe('suscribirConVisibilidad', () => {
  it('pausa tras N ms oculta y reabre al volver', () => {
    const cancelar = vi.fn();
    const abrir = vi.fn(() => cancelar);
    const cerrar = suscribirConVisibilidad(abrir, { pausarTrasMs: 1000 });
    expect(abrir).toHaveBeenCalledTimes(1);

    cambiar('hidden');
    vi.advanceTimersByTime(999);
    expect(cancelar).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cancelar).toHaveBeenCalledTimes(1);

    cambiar('visible');
    expect(abrir).toHaveBeenCalledTimes(2);

    cerrar();
    expect(cancelar).toHaveBeenCalledTimes(2);
  });

  it('si vuelve antes de N ms no pausa ni reabre', () => {
    const cancelar = vi.fn();
    const abrir = vi.fn(() => cancelar);
    suscribirConVisibilidad(abrir, { pausarTrasMs: 1000 });
    cambiar('hidden');
    vi.advanceTimersByTime(500);
    cambiar('visible');
    vi.advanceTimersByTime(5000);
    expect(cancelar).not.toHaveBeenCalled();
    expect(abrir).toHaveBeenCalledTimes(1);
  });

  it('después de cerrar no reabre', () => {
    const abrir = vi.fn(() => vi.fn());
    const cerrar = suscribirConVisibilidad(abrir, { pausarTrasMs: 10 });
    cambiar('hidden');
    vi.advanceTimersByTime(10);
    cerrar();
    cambiar('visible');
    expect(abrir).toHaveBeenCalledTimes(1);
  });
});
