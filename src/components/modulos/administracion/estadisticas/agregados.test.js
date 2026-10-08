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
    expect(indicadores(todos.tuplas)).toEqual({ admisiones: 4, sinId: 1, m: 2, c: 2, e: 2, monto: 0, sinPrecio: 0 });
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

import { unirCodigos, filasCodigos, filasCruceCodigo, codigosDe } from './agregados';

describe('montos y códigos', () => {
  // Admisión 1 (Pérez, Rodilla, Acme): 3 tornillos a $1.000 y $1.200, 1 placa.
  // Admisión 2 (Soto, Cadera, Beta): 2 tornillos a $1.000; un ítem sin código.
  const codDoc = {
    modulo: 'implantes',
    codigos: { k1: { c: 'IMP-1', d: 'Tornillo' }, k2: { c: 'IMP-2', d: 'Placa' }, 'SC-x': { c: '', d: 'Malla' } },
    piezas: [{ l: {
      l1: { a: '1', m: 'm1', c: 'c1', e: 'e1', k: 'k1', q: 3, n: 2 },
      l2: { a: '1', m: 'm1', c: 'c1', e: 'e1', k: 'k2', q: 1, n: 1 },
      l3: { a: '2', m: 'm2', c: 'c2', e: 'e2', k: 'k1', q: 2, n: 1 },
      l4: { a: '2', m: 'm2', c: 'c2', e: 'e2', k: 'SC-x', q: 1, n: 1 },
      l5: { a: '9', m: 'm2', c: 'c2', e: 'e2', k: 'k2', q: 0, n: 0 },
    } }],
  };
  const montosDoc = { piezas: [{
    t: { t1: { $: 5200, sp: 0 }, t2: { $: 2000, sp: 1 } },
    l: {
      l1: { $: 3200, p: { 1000: 2, 1200: 1 } },
      l2: { $: 2000, p: { 2000: 1 } },
      l3: { $: 2000, p: { 1000: 1 } },
      l4: { $: 0, p: {} },
    },
  }] };
  const actual = unirCodigos([codDoc], [montosDoc]);
  const vacio = unirCodigos([]);

  it('pestaña Códigos: cantidad, admisiones, monto, precio promedio y variación de precio', () => {
    const filas = Object.fromEntries(filasCodigos(actual, vacio).map((f) => [f.codigo === 'Sin código' ? f.descripcion : f.codigo, f]));
    expect(filas['IMP-1']).toMatchObject({ actual: 5, admisiones: 2, monto: 5200, precio: 1040, precioMin: 1000, precioMax: 1200, anterior: 0, variacion: null });
    expect(filas['IMP-2']).toMatchObject({ actual: 1, monto: 2000, precio: 2000, precioMin: null, precioMax: null });
    expect(filas.Malla).toMatchObject({ codigo: 'Sin código', sinCodigo: true, actual: 1, precio: null });
    expect(Object.keys(filas)).toHaveLength(3); // la línea en 0 no aparece
  });

  it('detalle de un código: médicos con cantidad, admisiones y monto', () => {
    const nombres = { m: { m1: 'Pérez', m2: 'Soto' } };
    const filas = filasCruceCodigo('k1', 'm', actual, vacio, nombres, {});
    expect(Object.fromEntries(filas.map((f) => [f.nombre, [f.actual, f.admisiones, f.monto]]))).toEqual({ 'Pérez': [3, 1, 3200], Soto: [2, 1, 2000] });
  });

  it('detalle de un médico: sus códigos', () => {
    expect(codigosDe('m', 'm2', actual, vacio).map((f) => [f.codigo, f.actual, f.monto])).toEqual([['IMP-1', 2, 2000], ['Sin código', 1, 0]]);
  });

  it('montos por fila y en los indicadores', () => {
    const doc = { modulo: 'implantes', piezas: [{ t: { t1: { a: '1', m: 'm1', c: 'c1', e: 'e1', n: 2 }, t2: { a: '2', m: 'm2', c: 'c2', e: 'e2', n: 1 } } }], nombres: { m: { m1: 'Pérez', m2: 'Soto' } } };
    const datos = unirDatos([doc], [montosDoc]);
    expect(indicadores(datos.tuplas)).toMatchObject({ monto: 7200, sinPrecio: 1 });
    const fila = filasComparadas('m', datos, unirDatos([doc])).find((f) => f.nombre === 'Pérez');
    expect(fila).toMatchObject({ monto: 5200, montoAnterior: 0, montoDiferencia: 5200 });
    expect(ordenarFilas(filasComparadas('m', datos, unirDatos([])), 'monto').map((f) => f.nombre)).toEqual(['Pérez', 'Soto']);
  });
});
