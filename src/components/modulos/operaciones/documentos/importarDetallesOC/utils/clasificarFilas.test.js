import { describe, it, expect } from 'vitest';
import { clasificarFilas } from './clasificarFilas';

const fila = (id, hash) => ({ id, _hash: hash });

describe('clasificarFilas', () => {
  it('clasifica como "nueva" un ID que no está en el snapshot anterior', () => {
    const { nuevas, cambiadas, sinCambios } = clasificarFilas([fila('1', 'hashA')], {});
    expect(nuevas.map(f => f.id)).toEqual(['1']);
    expect(cambiadas).toHaveLength(0);
    expect(sinCambios).toHaveLength(0);
  });

  it('clasifica como "cambiada" un ID que existe pero con hash distinto', () => {
    const { cambiadas } = clasificarFilas([fila('1', 'hashNuevo')], { '1': 'hashViejo' });
    expect(cambiadas.map(f => f.id)).toEqual(['1']);
  });

  it('clasifica como "sin cambios" un ID que existe con el mismo hash', () => {
    const { sinCambios } = clasificarFilas([fila('1', 'hashX')], { '1': 'hashX' });
    expect(sinCambios.map(f => f.id)).toEqual(['1']);
  });

  it('maneja una importación completa mixta (nuevas + cambiadas + sin cambios)', () => {
    const filas = [
      fila('1', 'h1'), // nueva
      fila('2', 'h2-nuevo'), // cambiada
      fila('3', 'h3') // sin cambios
    ];
    const snapshot = { '2': 'h2-viejo', '3': 'h3' };

    const { nuevas, cambiadas, sinCambios } = clasificarFilas(filas, snapshot);
    expect(nuevas.map(f => f.id)).toEqual(['1']);
    expect(cambiadas.map(f => f.id)).toEqual(['2']);
    expect(sinCambios.map(f => f.id)).toEqual(['3']);
  });

  it('segunda importación sin cambios reales: todo cae en "sin cambios"', () => {
    const filas = [fila('1', 'h1'), fila('2', 'h2')];
    const snapshot = { '1': 'h1', '2': 'h2' };
    const { nuevas, cambiadas, sinCambios } = clasificarFilas(filas, snapshot);
    expect(nuevas).toHaveLength(0);
    expect(cambiadas).toHaveLength(0);
    expect(sinCambios).toHaveLength(2);
  });
});
