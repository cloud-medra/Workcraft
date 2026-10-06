import { describe, it, expect } from 'vitest';
import { numeroDeMes, compararMeses, ordenarMeses, ordenarPeriodos } from './ordenarMeses';

describe('numeroDeMes', () => {
  it.each([
    ['01', 1], ['9', 9], ['09', 9], ['12', 12], [10, 10],
    ['septiembre', 9], ['Septiembre', 9], [' OCTUBRE ', 10], ['setiembre', 9]
  ])('%s -> %s', (entrada, esperado) => {
    expect(numeroDeMes(entrada)).toBe(esperado);
  });

  it.each(['', '0', '13', 'abc', null, undefined, 1.5])('no reconoce %s', (entrada) => {
    expect(numeroDeMes(entrada)).toBeNull();
  });
});

describe('ordenarMeses', () => {
  it('ordena nombres por número de mes, no alfabéticamente', () => {
    expect(ordenarMeses(['octubre', 'septiembre', 'noviembre', 'agosto', 'enero']))
      .toEqual(['enero', 'agosto', 'septiembre', 'octubre', 'noviembre']);
  });

  it('ordena números como texto con o sin cero a la izquierda', () => {
    expect(ordenarMeses(['10', '9', '11', '02'])).toEqual(['02', '9', '10', '11']);
    expect(ordenarMeses([12, 3, 10, 1])).toEqual([1, 3, 10, 12]);
  });

  it('mezcla formatos y deja los no reconocidos al final', () => {
    expect(ordenarMeses(['xx', 'noviembre', '09', 'octubre'])).toEqual(['09', 'octubre', 'noviembre', 'xx']);
  });

  it('no modifica el arreglo original y conserva los valores tal cual', () => {
    const original = ['11', '9'];
    expect(ordenarMeses(original)).toEqual(['9', '11']);
    expect(original).toEqual(['11', '9']);
    expect(ordenarMeses(undefined)).toEqual([]);
  });

  it('compararMeses sirve directo en sort', () => {
    expect(['diciembre', 'marzo'].sort(compararMeses)).toEqual(['marzo', 'diciembre']);
  });
});

describe('ordenarPeriodos', () => {
  it('ordena por año y luego por mes', () => {
    const periodos = [
      { anio: '2026', mes: 'enero' },
      { anio: '2025', mes: 'diciembre' },
      { anio: '2025', mes: 'septiembre' },
      { anio: '2026', mes: '02' }
    ];
    expect(ordenarPeriodos(periodos)).toEqual([
      { anio: '2025', mes: 'septiembre' },
      { anio: '2025', mes: 'diciembre' },
      { anio: '2026', mes: 'enero' },
      { anio: '2026', mes: '02' }
    ]);
  });

  it('acepta una función para extraer año y mes', () => {
    const items = [{ p: { anio: 2026, mes: 3 } }, { p: { anio: 2026, mes: 1 } }];
    expect(ordenarPeriodos(items, (x) => x.p).map((x) => x.p.mes)).toEqual([1, 3]);
  });
});
