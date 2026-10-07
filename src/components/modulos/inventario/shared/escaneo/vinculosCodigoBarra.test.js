import { describe, it, expect } from 'vitest';
import { idVinculo, evaluarVinculo, agregarCodigoALista, quitarCodigoDeLista, ajustarListaAProducto, planificarVinculos } from './vinculosCodigoBarra';

describe('idVinculo', () => {
  it('genera ids válidos para Firestore', () => {
    expect(idVinculo('7801234567894')).toBe('7801234567894');
    expect(idVinculo('AB/12')).toBe('AB%2F12');
    expect(idVinculo('.')).toBe('%2E');
    expect(idVinculo('__x__')).toBe('cb___x__');
    expect(idVinculo('  ')).toBe('');
  });
});

describe('evaluarVinculo', () => {
  it('nuevo, mismo producto, otro producto o sin producto elegido', () => {
    expect(evaluarVinculo(null, 'P1')).toBe('nuevo');
    expect(evaluarVinculo({ productoId: 'P1' }, 'P1')).toBe('mismo');
    expect(evaluarVinculo({ productoId: 'P2' }, 'P1')).toBe('otro');
    expect(evaluarVinculo({ productoId: 'P2' }, null)).toBe('sinProducto');
  });
});

describe('varios códigos para un mismo producto', () => {
  it('se acumulan sin repetir y se pueden quitar', () => {
    let lista = [];
    lista = agregarCodigoALista(lista, { clave: 'A', codigo: 'A' });
    lista = agregarCodigoALista(lista, { clave: 'B', codigo: 'B', vinculoProductoId: 'P1' });
    lista = agregarCodigoALista(lista, { clave: 'A', codigo: 'A' });
    expect(lista.map((c) => c.clave)).toEqual(['A', 'B']);
    expect(quitarCodigoDeLista(lista, 'A').map((c) => c.clave)).toEqual(['B']);
  });

  it('al guardar se vinculan todos los nuevos al mismo producto; los ya vinculados no se reescriben', () => {
    const lista = [{ clave: 'A', codigo: 'A' }, { clave: 'B', codigo: 'B' }, { clave: 'C', codigo: 'C', vinculoProductoId: 'P1' }];
    const plan = planificarVinculos(lista, 'P1', { A: null, B: null, C: { productoId: 'P1' } });
    expect(plan.map((v) => v.clave)).toEqual(['A', 'B']);
  });
});

describe('código ya vinculado a otro producto', () => {
  it('sin confirmación no se cambia (error al guardar)', () => {
    expect(() => planificarVinculos([{ clave: 'A', codigo: 'A' }], 'P1', { A: { productoId: 'P2', referencia: 'REF-2' } }))
      .toThrow(/vinculado a otro producto \(REF-2\)/);
  });

  it('con confirmación se reasigna', () => {
    const plan = planificarVinculos([{ clave: 'A', codigo: 'A', vinculoProductoId: 'P2', reasignar: true }], 'P1', { A: { productoId: 'P2' } });
    expect(plan).toEqual([{ clave: 'A', codigo: 'A', reasignadoDe: 'P2' }]);
  });

  it('si después de confirmar pasó a un tercer producto, tampoco se cambia', () => {
    expect(() => planificarVinculos([{ clave: 'A', codigo: 'A', vinculoProductoId: 'P2', reasignar: true }], 'P1', { A: { productoId: 'P3' } }))
      .toThrow(/otro producto/);
  });

  it('al cambiar de producto se quitan de la lista los vinculados a otro sin confirmación', () => {
    const lista = [{ clave: 'A', vinculoProductoId: 'P1' }, { clave: 'B', vinculoProductoId: null }, { clave: 'C', vinculoProductoId: 'P2', reasignar: true }];
    const { lista: nueva, quitados } = ajustarListaAProducto(lista, 'P9');
    expect(nueva.map((c) => c.clave)).toEqual(['B', 'C']);
    expect(quitados.map((c) => c.clave)).toEqual(['A']);
  });
});
