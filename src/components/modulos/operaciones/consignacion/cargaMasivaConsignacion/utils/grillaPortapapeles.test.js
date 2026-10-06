import { describe, it, expect } from 'vitest';
import {
  CLAVES_INGRESO,
  crearFilasVacias,
  parsearTextoPortapapeles,
  pegarMatrizEnFilas
} from './grillaPortapapeles';

const col = (key) => CLAVES_INGRESO.indexOf(key);

describe('parsearTextoPortapapeles', () => {
  it('separa columnas por tabulación y filas por salto de línea, ignorando la última línea vacía', () => {
    expect(parsearTextoPortapapeles('a\tb\r\nc\td\r\n')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('una columna copiada de Excel da una celda por fila', () => {
    expect(parsearTextoPortapapeles('101\n102\n103\n')).toEqual([['101'], ['102'], ['103']]);
  });

  it('solo ignora la última línea vacía, no las intermedias', () => {
    expect(parsearTextoPortapapeles('101\n\n103\n')).toEqual([['101'], [''], ['103']]);
  });

  it('respeta celdas entre comillas con saltos de línea y comillas escapadas', () => {
    expect(parsearTextoPortapapeles('"línea 1\nlínea 2"\tx\n"di ""hola"""\ty\n'))
      .toEqual([['línea 1\nlínea 2', 'x'], ['di "hola"', 'y']]);
  });

  it('una comilla sin cerrar se toma como texto', () => {
    expect(parsearTextoPortapapeles('"abc\tx\nz\n')).toEqual([['"abc', 'x'], ['z']]);
  });

  it('texto vacío no produce filas; una celda vacía de Excel da una celda vacía', () => {
    expect(parsearTextoPortapapeles('')).toEqual([]);
    expect(parsearTextoPortapapeles('\r\n')).toEqual([['']]);
  });
});

describe('pegarMatrizEnFilas', () => {
  it('pega una columna completa hacia abajo desde la celda seleccionada', () => {
    const filas = crearFilasVacias(20);
    const matriz = parsearTextoPortapapeles(Array.from({ length: 20 }, (_, i) => String(1000 + i)).join('\r\n') + '\r\n');

    const resultado = pegarMatrizEnFilas(filas, 0, col('admision'), matriz);

    expect(resultado).toHaveLength(20);
    expect(resultado.map((f) => f.valores.admision)).toEqual(Array.from({ length: 20 }, (_, i) => String(1000 + i)));
    // Las demás columnas no se tocan.
    expect(resultado.every((f) => f.valores.paciente === '')).toBe(true);
  });

  it('pega un bloque de varias columnas hacia la derecha y hacia abajo', () => {
    const filas = crearFilasVacias(5);
    const matriz = parsearTextoPortapapeles('06-10-2026\tACME\tC-1\n07/10/2026\tBETA\tC-2\n');

    const resultado = pegarMatrizEnFilas(filas, 1, col('fecha'), matriz);

    expect(resultado[0].valores.fecha).toBe('');
    expect(resultado[1].valores).toMatchObject({ fecha: '06-10-2026', proveedor: 'ACME', codigo: 'C-1' });
    expect(resultado[2].valores).toMatchObject({ fecha: '07/10/2026', proveedor: 'BETA', codigo: 'C-2' });
    expect(resultado[1].valores.cantidad).toBe('');
  });

  it('agrega filas cuando se pegan más filas de las que hay', () => {
    const filas = crearFilasVacias(3);
    const matriz = [['1'], ['2'], ['3'], ['4'], ['5']];

    const resultado = pegarMatrizEnFilas(filas, 1, 0, matriz);

    expect(resultado).toHaveLength(6);
    expect(resultado.map((f) => f.valores.admision)).toEqual(['', '1', '2', '3', '4', '5']);
    expect(new Set(resultado.map((f) => f.id)).size).toBe(6);
  });

  it('ignora las columnas que se salen de la grilla', () => {
    const filas = crearFilasVacias(1);
    const resultado = pegarMatrizEnFilas(filas, 0, col('cantidad'), [['3', 'Rápido', 'sobra']]);

    expect(resultado[0].valores).toMatchObject({ cantidad: '3', delivery: 'Rápido' });
    expect(Object.keys(resultado[0].valores)).toEqual(CLAVES_INGRESO);
  });

  it('no muta la grilla original y deja sin cargar las filas pegadas', () => {
    const filas = crearFilasVacias(2).map((f) => ({ ...f, resultado: { estado: 'OK' } }));
    const resultado = pegarMatrizEnFilas(filas, 0, 0, [['55']]);

    expect(filas[0].valores.admision).toBe('');
    expect(resultado[0].resultado).toBeNull();
    expect(resultado[1].resultado).toEqual({ estado: 'OK' });
  });
});
