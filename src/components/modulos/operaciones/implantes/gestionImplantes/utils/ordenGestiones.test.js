import { describe, it, expect } from 'vitest';
import { fechaGestionEnMs, ordenarGestiones } from './ordenGestiones';

const g = (id, fecha, nombre, empresa) => ({ id, refPath: `x/${id}`, fecha, nombre, empresa });
const ids = (lista) => ordenarGestiones(lista).map((x) => x.id);

describe('fechaGestionEnMs', () => {
  it('interpreta los formatos guardados como la misma fecha real', () => {
    const esperado = Date.UTC(2026, 9, 6);
    ['2026-10-06', '06-10-2026', '06/10/2026', '2026/10/06', 46301, '46301'].forEach((v) =>
      expect(fechaGestionEnMs(v)).toBe(esperado));
    expect(fechaGestionEnMs(new Date(esperado))).toBe(esperado);
    expect(fechaGestionEnMs({ toMillis: () => esperado })).toBe(esperado);
  });
  it('vacío, "P" o inválido → null', () => {
    [null, undefined, '', 'P', 'sin fecha', '2026-02-30', '31-13-2026'].forEach((v) =>
      expect(fechaGestionEnMs(v)).toBeNull());
  });
});

describe('ordenarGestiones', () => {
  it('fecha más reciente primero, sobre la fecha real (no como texto)', () => {
    // Como texto, '06-10-2026' > '01-11-2026' y '31-12-2025' > '01-01-2026'.
    expect(ids([
      g('a', '06-10-2026', 'X', 'E'),
      g('b', '2026-11-01', 'X', 'E'),
      g('c', '31-12-2025', 'X', 'E'),
      g('d', '2026-01-01', 'X', 'E'),
    ])).toEqual(['b', 'a', 'd', 'c']);
  });

  it('el caso reportado: 06-10, 07-10, 06-10 queda agrupado por fecha', () => {
    expect(ids([
      g('1', '2026-10-06', 'Pedro', 'Acme'),
      g('2', '2026-10-07', 'Ana', 'Acme'),
      g('3', '2026-10-06', 'Ana', 'Acme'),
    ])).toEqual(['2', '3', '1']);
  });

  it('misma fecha: nombre A→Z y luego empresa A→Z, sin distinguir mayúsculas ni tildes', () => {
    expect(ids([
      g('1', '2026-10-06', 'Óscar', 'B'),
      g('2', '2026-10-06', 'ana', 'Zeta'),
      g('3', '2026-10-06', 'Ana', 'alfa'),
      g('4', '2026-10-06', 'oscar', 'A'),
      g('5', '2026-10-06', 'Ángela', 'X'),
    ])).toEqual(['3', '2', '5', '4', '1']);
  });

  it('sin fecha, sin nombre o sin empresa (vacío o "P") van al final de su nivel', () => {
    expect(ids([
      g('sinFecha', 'P', 'Ana', 'A'),
      g('sinNombre', '2026-10-06', '', 'A'),
      g('sinEmpresa', '2026-10-06', 'Ana', 'P'),
      g('completo', '2026-10-06', 'Ana', 'A'),
      g('nada', null, null, null),
    ])).toEqual(['completo', 'sinEmpresa', 'sinNombre', 'sinFecha', 'nada']);
  });

  it('no modifica la lista original', () => {
    const lista = [g('1', '2026-01-01'), g('2', '2026-02-01')];
    ordenarGestiones(lista);
    expect(lista.map((x) => x.id)).toEqual(['1', '2']);
  });
});
