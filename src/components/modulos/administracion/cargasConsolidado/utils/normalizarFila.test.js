import { describe, it, expect } from 'vitest';
import { ORIGEN, ordenarPorAdmisionYOC, filtrarPorBusquedaYOrigen } from './normalizarFila';

const fila = (gestionId, codigo, origen = ORIGEN.IMPLANTES) => ({ gestionId, codigo, origen });

describe('ordenarPorAdmisionYOC', () => {
  it('agrupa por admisión ascendente en vez de dejarlas mezcladas por fecha', () => {
    const filas = [
      fila('102040', 'COD-1'),
      fila('102030', 'COD-2'),
      fila('102040', 'COD-3'),
      fila('102030', 'COD-4')
    ];

    const resultado = ordenarPorAdmisionYOC(filas).map(f => f.gestionId);

    expect(resultado).toEqual(['102030', '102030', '102040', '102040']);
  });

  it('dentro de la misma admisión, las filas con código de OC van antes que "No lleva OC"', () => {
    const filas = [
      fila('102030', 'No lleva OC'),
      fila('102030', 'COD-1'),
      fila('102030', 'No lleva OC'),
      fila('102030', 'COD-2')
    ];

    const resultado = ordenarPorAdmisionYOC(filas).map(f => f.codigo);

    expect(resultado).toEqual(['COD-1', 'COD-2', 'No lleva OC', 'No lleva OC']);
  });

  it('combina ambos criterios con orígenes mezclados (Implantes/Consignación/Hemodinamia)', () => {
    const filas = [
      fila('102040', 'No lleva OC', ORIGEN.HEMODINAMIA),
      fila('102030', 'COD-9', ORIGEN.CONSIGNACION),
      fila('102040', 'COD-8', ORIGEN.IMPLANTES),
      fila('102030', 'No lleva OC', ORIGEN.IMPLANTES),
      fila('102035', 'COD-7', ORIGEN.HEMODINAMIA)
    ];

    const resultado = ordenarPorAdmisionYOC(filas).map(f => `${f.gestionId}:${f.codigo}`);

    expect(resultado).toEqual([
      '102030:COD-9',
      '102030:No lleva OC',
      '102035:COD-7',
      '102040:COD-8',
      '102040:No lleva OC'
    ]);
  });

  it('trata "P" y vacío/nulo igual que "No lleva OC" (van al final del grupo)', () => {
    const filas = [
      fila('102030', 'P'),
      fila('102030', ''),
      fila('102030', 'COD-1'),
      fila('102030', null)
    ];

    const resultado = ordenarPorAdmisionYOC(filas).map(f => f.codigo);

    expect(resultado[0]).toBe('COD-1');
    expect(resultado.slice(1)).toEqual(expect.arrayContaining(['P', '', null]));
  });

  it('no pierde ni modifica filas, solo reordena', () => {
    const filas = [fila('102040', 'COD-1'), fila('102030', 'COD-2'), fila('102030', 'No lleva OC')];
    const resultado = ordenarPorAdmisionYOC(filas);

    expect(resultado).toHaveLength(filas.length);
    expect(resultado).toEqual(expect.arrayContaining(filas));
  });

  it('no muta el arreglo original', () => {
    const filas = [fila('102040', 'COD-1'), fila('102030', 'COD-2')];
    const copiaOriginal = [...filas];
    ordenarPorAdmisionYOC(filas);

    expect(filas).toEqual(copiaOriginal);
  });
});

const filaConNombre = (gestionId, campos, origen = ORIGEN.IMPLANTES) => ({ gestionId, origen, ...campos });

describe('filtrarPorBusquedaYOrigen', () => {
  const filas = [
    filaConNombre('102030', { nombre: 'Juan Pérez' }, ORIGEN.IMPLANTES),
    filaConNombre('102040', { paciente: 'María López' }, ORIGEN.CONSIGNACION),
    filaConNombre('305000', { nombre: 'Pedro Soto' }, ORIGEN.HEMODINAMIA)
  ];

  it('sin filtros, devuelve todo tal cual (equivalente a "Todas")', () => {
    const resultado = filtrarPorBusquedaYOrigen(filas, {});
    expect(resultado).toHaveLength(3);
  });

  it('busca por admisión, parcial', () => {
    const resultado = filtrarPorBusquedaYOrigen(filas, { busqueda: '1020' });
    expect(resultado.map(f => f.gestionId)).toEqual(['102030', '102040']);
  });

  it('busca por nombre (campo `nombre` en Gestión o `paciente` en Solicitudes/Imputadas), parcial y sin distinguir mayúsculas', () => {
    const resultado = filtrarPorBusquedaYOrigen(filas, { busqueda: 'lópez' });
    expect(resultado.map(f => f.gestionId)).toEqual(['102040']);

    const resultado2 = filtrarPorBusquedaYOrigen(filas, { busqueda: 'PEDRO' });
    expect(resultado2.map(f => f.gestionId)).toEqual(['305000']);
  });

  it('origen vacío = sin restricción ("Todas")', () => {
    const resultado = filtrarPorBusquedaYOrigen(filas, { origenesSeleccionados: [] });
    expect(resultado).toHaveLength(3);
  });

  it('un origen individual filtra solo esa colección', () => {
    const resultado = filtrarPorBusquedaYOrigen(filas, { origenesSeleccionados: [ORIGEN.CONSIGNACION] });
    expect(resultado.map(f => f.gestionId)).toEqual(['102040']);
  });

  it('dos orígenes combinados filtran ambas colecciones', () => {
    const resultado = filtrarPorBusquedaYOrigen(filas, { origenesSeleccionados: [ORIGEN.IMPLANTES, ORIGEN.HEMODINAMIA] });
    expect(resultado.map(f => f.gestionId)).toEqual(['102030', '305000']);
  });

  it('combina búsqueda y origen a la vez', () => {
    const resultado = filtrarPorBusquedaYOrigen(filas, { busqueda: '1020', origenesSeleccionados: [ORIGEN.CONSIGNACION] });
    expect(resultado.map(f => f.gestionId)).toEqual(['102040']);

    const sinCoincidencia = filtrarPorBusquedaYOrigen(filas, { busqueda: '1020', origenesSeleccionados: [ORIGEN.HEMODINAMIA] });
    expect(sinCoincidencia).toHaveLength(0);
  });
});
