// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import PuntosAnimados from './PuntosAnimados';
import { elegirSiguiente } from '../utils/puntosAnimados';

const simularMovimientoReducido = (reducido) => {
  window.matchMedia = vi.fn().mockImplementation((q) => ({ matches: reducido && q.includes('reduce'), media: q }));
};
const destacados = (container) => [...container.querySelectorAll('[data-efecto]')].filter((p) => p.dataset.efecto !== 'normal');

afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('elegirSiguiente', () => {
  it('no elige un punto destacado ni uno de los recientes, con efecto y duración válidos', () => {
    for (let k = 0; k < 200; k += 1) {
      const { indice, efecto, duracion } = elegirSiguiente(12, [0], [1, 2, 3]);
      expect([0, 1, 2, 3]).not.toContain(indice);
      expect(['brillo', 'brilloCrece', 'onda']).toContain(efecto);
      expect(duracion).toBeGreaterThanOrEqual(1800);
      expect(duracion).toBeLessThanOrEqual(2400);
    }
  });

  it('aun sin candidatos libres, no repite el último punto', () => {
    const recientes = Array.from({ length: 11 }, (_, i) => i); // todos menos el 11
    for (let k = 0; k < 50; k += 1) {
      expect(elegirSiguiente(12, [], recientes).indice).not.toBe(10);
    }
  });
});

describe('PuntosAnimados', () => {
  it('se superponen como máximo 2 efectos, con variedad, y el mismo punto no se repite seguido', () => {
    simularMovimientoReducido(false);
    vi.useFakeTimers();
    const { container } = render(<PuntosAnimados />);
    expect(container.querySelectorAll('[data-efecto]')).toHaveLength(12);
    const efectos = new Set();
    const secuencia = []; // índices en el orden en que se encienden
    let antes = new Set();
    let huboSuperposicion = false;
    for (let t = 0; t < 300; t += 1) {
      act(() => { vi.advanceTimersByTime(100); });
      const puntos = [...container.querySelectorAll('[data-efecto]')];
      const ahora = new Set(puntos.map((p, i) => (p.dataset.efecto !== 'normal' ? i : null)).filter((i) => i !== null));
      expect(ahora.size).toBeLessThanOrEqual(2);
      if (ahora.size === 2) huboSuperposicion = true;
      ahora.forEach((i) => { if (!antes.has(i)) secuencia.push(i); efectos.add(puntos[i].dataset.efecto); });
      antes = ahora;
    }
    expect(secuencia.length).toBeGreaterThan(15);
    secuencia.slice(1).forEach((i, k) => expect(i).not.toBe(secuencia[k]));
    expect(huboSuperposicion).toBe(true);
    expect(efectos).toEqual(new Set(['brillo', 'brilloCrece', 'onda']));
  });

  it('cada punto destacado vuelve al reposo al terminar su animación', () => {
    simularMovimientoReducido(false);
    vi.useFakeTimers();
    const { container, unmount } = render(<PuntosAnimados />);
    act(() => { vi.advanceTimersByTime(1150); });
    const [primero] = destacados(container);
    const indice = [...container.querySelectorAll('[data-efecto]')].indexOf(primero);
    // Su animación dura como mucho 2,4 s; en ese lapso no puede volver a
    // elegirse (está entre los recientes), así que tiene que quedar en reposo.
    act(() => { vi.advanceTimersByTime(2400); });
    expect(container.querySelectorAll('[data-efecto]')[indice].dataset.efecto).toBe('normal');
    unmount();
    expect(vi.getTimerCount()).toBe(0); // intervalo y temporizadores limpios
  });

  it('con movimiento reducido los puntos quedan quietos', () => {
    simularMovimientoReducido(true);
    vi.useFakeTimers();
    const { container } = render(<PuntosAnimados />);
    act(() => { vi.advanceTimersByTime(10000); });
    expect(destacados(container)).toHaveLength(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
