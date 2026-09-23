import { describe, it, expect } from 'vitest';
import { obtenerNombreMostrar, preferenciaNombreMostrar } from './nombreMostrar';

const USUARIO = { nombreCompleto: 'Maikol Ganga Pinto', nombreUsuario: 'mganga', email: 'mganga@medra.cl' };

describe('obtenerNombreMostrar', () => {
  it('por defecto muestra el nombre completo', () => {
    expect(preferenciaNombreMostrar(USUARIO)).toBe('nombreCompleto');
    expect(obtenerNombreMostrar(USUARIO)).toBe('Maikol Ganga Pinto');
  });

  it.each([
    ['usuario', 'mganga'],
    ['nombreCompleto', 'Maikol Ganga Pinto'],
    ['email', 'mganga@medra.cl']
  ])('preferencia %s', (nombreMostrar, esperado) => {
    expect(obtenerNombreMostrar({ ...USUARIO, nombreMostrar })).toBe(esperado);
  });

  it('una preferencia desconocida usa el valor por defecto', () => {
    expect(obtenerNombreMostrar({ ...USUARIO, nombreMostrar: 'apodo' })).toBe('Maikol Ganga Pinto');
  });

  it('si el dato elegido está vacío usa el siguiente disponible', () => {
    expect(obtenerNombreMostrar({ ...USUARIO, nombreMostrar: 'usuario', nombreUsuario: '  ' })).toBe('Maikol Ganga Pinto');
    expect(obtenerNombreMostrar({ ...USUARIO, nombreCompleto: '' })).toBe('mganga');
    expect(obtenerNombreMostrar({ email: 'a@b.cl', nombreMostrar: 'nombreCompleto' })).toBe('a@b.cl');
    expect(obtenerNombreMostrar(null)).toBe('');
  });

  it('con mayúsculas convierte los nombres pero no el correo', () => {
    expect(obtenerNombreMostrar(USUARIO, { mayusculas: true })).toBe('MAIKOL GANGA PINTO');
    expect(obtenerNombreMostrar({ ...USUARIO, nombreMostrar: 'usuario' }, { mayusculas: true })).toBe('MGANGA');
    expect(obtenerNombreMostrar({ ...USUARIO, nombreMostrar: 'email' }, { mayusculas: true })).toBe('mganga@medra.cl');
  });
});
