import { describe, it, expect } from 'vitest';
import { unirDatos, indicadores, filasComparadas, filasCruce, filtrarFilas, ordenarFilas, variacion } from './agregados';
import { periodoAnterior, etiquetaPeriodo, desdeClave } from './estadisticasConfig';

const t = (a, m, c, e, extra = {}) => ({ a, m, c, e, n: 1, ...extra });
const doc = (modulo, tuplas, nombres = {}) => ({
  modulo, piezas: [{ t: Object.fromEntries(tuplas.map((x, i) => [`${modulo}${i}`, x])) }],
  nombres: { m: { m1: 'Pérez', m2: 'Soto', ...nombres.m }, c: { c1: 'Rodilla', c2: 'Cadera' }, e: { e1: 'Acme', e2: 'Beta' } },
});

// Implantes: admisión 1 con dos empresas, admisión 2. Consignación: la
// admisión 1 otra vez (cuenta una vez en Todos) y la 3 sin médico.
const IMPLANTES = doc('implantes', [t('1', 'm1', 'c1', 'e1'), t('1', 'm1', 'c1', 'e2'), t('2', 'm2', 'c2', 'e1'), t('9', 'm2', 'c2', 'e1', { n: 0 })]);
const CONSIGNACION = doc('consignacion', [t('1', 'm1', 'c1', 'e1'), t('3', '_', 'c1', 'e2'), t('SINID-x', 'm1', 'c1', 'e1', { s: true })]);
const ANTERIOR = unirDatos([doc('implantes', [t('5', 'm1', 'c1', 'e1'), t('6', 'm1', 'c2', 'e2')])]);

describe('agregados de Estadísticas', () => {
  it('Todos: una admisión en dos módulos cuenta una vez; las tuplas en 0 no cuentan', () => {
    const todos = unirDatos([IMPLANTES, CONSIGNACION]);
    expect(indicadores(todos.tuplas)).toEqual({ admisiones: 4, sinId: 1, m: 2, c: 2, e: 2 });
    expect(indicadores(unirDatos([IMPLANTES]).tuplas).admisiones).toBe(2);
  });

  it('por médico cuenta admisiones distintas y "Sin informar" no se pierde', () => {
    const filas = filasComparadas('m', unirDatos([IMPLANTES, CONSIGNACION]), ANTERIOR);
    const por = Object.fromEntries(filas.map((f) => [f.nombre, f]));
    expect(por['Pérez']).toMatchObject({ actual: 2, anterior: 2, diferencia: 0, variacion: 0 });
    expect(por.Soto).toMatchObject({ actual: 1, anterior: 0, variacion: null });
    expect(por['Sin informar'].actual).toBe(1);
    expect(por['Pérez'].participacion).toBe(50);
  });

  it('cruce: empresas de un médico y médicos de una cirugía', () => {
    const actual = unirDatos([IMPLANTES]);
    const empresas = filasCruce('m', 'm1', 'e', actual, ANTERIOR);
    expect(Object.fromEntries(empresas.map((f) => [f.nombre, [f.actual, f.anterior]]))).toEqual({ Acme: [1, 1], Beta: [1, 1] });
    const medicos = filasCruce('c', 'c2', 'm', actual, ANTERIOR);
    expect(Object.fromEntries(medicos.map((f) => [f.nombre, [f.actual, f.anterior]]))).toEqual({ Soto: [1, 0], 'Pérez': [0, 1] });
  });

  it('búsqueda sin tildes, orden y variación', () => {
    const filas = [{ nombre: 'Pérez', actual: 2, variacion: null }, { nombre: 'Soto', actual: 5, variacion: 10 }, { nombre: 'Ávila', actual: 2, variacion: -5 }];
    expect(filtrarFilas(filas, 'perez').map((f) => f.nombre)).toEqual(['Pérez']);
    expect(ordenarFilas(filas).map((f) => f.nombre)).toEqual(['Soto', 'Ávila', 'Pérez']);
    expect(ordenarFilas(filas, 'variacion', 'asc').map((f) => f.nombre)).toEqual(['Ávila', 'Soto', 'Pérez']);
    expect(variacion(15, 10)).toBe(50);
    expect(variacion(3, 0)).toBeNull();
  });

  it('períodos', () => {
    expect(periodoAnterior('2026-01')).toBe('2025-12');
    expect(periodoAnterior('2026-10')).toBe('2026-09');
    expect(etiquetaPeriodo('2026-10')).toBe('Octubre 2026');
    expect(desdeClave('2026-03')).toEqual({ anio: '2026', mes: 'marzo' });
  });
});
