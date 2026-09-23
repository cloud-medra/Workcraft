import { describe, it, expect } from 'vitest';
import { analizarImportacionPrecios, MOTIVO_SIN_CAMBIO, MOTIVO_SIN_NUEVO_PRECIO } from './analizarImportacionPrecios';
import { COLUMNAS } from './formatoPrecios';

const ENCABEZADO = COLUMNAS.map(c => c.titulo);
const EMPRESA = { id: 'e1', nombre: 'Medtronic Chile' };

const CODIGOS = [
  { id: 'A1', codigo: 'C-1', referencia: 'REF-1', descriptorEmpresa: 'TORNILLO', empresa: 'MEDTRONIC CHILE', precioNeto: 1200 },
  { id: 'A2', codigo: 'C-2', referencia: 'REF-2', descriptorEmpresa: 'PLACA', empresa: 'MEDTRONIC CHILE', precioNeto: 5000 },
  { id: 'A3', codigo: 'C-3', referencia: 'REF-3', descriptorEmpresa: 'CLAVO', empresa: ' medtronic  chile ', precioNeto: 800 },
  { id: 'B1', codigo: 'C-9', referencia: 'OTRA-1', descriptorEmpresa: 'X', empresa: 'STRYKER', precioNeto: 100 }
];

// [empresa, id, codigo, referencia, descripcion, precioActual, nuevoPrecio]
const fila = (id, nuevoPrecio, empresa = 'MEDTRONIC CHILE', referencia = `REF-${id}`) =>
  [empresa, id, '', referencia, '', 0, nuevoPrecio];

const analizar = (filasDatos, encabezado = ENCABEZADO) =>
  analizarImportacionPrecios({ filas: [encabezado, ...filasDatos], empresa: EMPRESA, codigos: CODIGOS });

describe('analizarImportacionPrecios', () => {
  it('clasifica filas en actualizar, omitir y error', () => {
    const r = analizar([
      fila('A1', '1.350'),       // actualizar
      fila('A2', ''),            // omitir: vacío
      fila('A3', 800),           // omitir: sin cambio
      fila('A2', 'abc'),         // error: duplicado (se detecta antes que el precio)
      fila('ZZ', 100),           // error: no existe
      fila('A1-x', -3)           // error: no existe
    ]);

    expect(r.rechazo).toBeNull();
    expect(r.actualizar).toEqual([
      { fila: 2, id: 'A1', codigo: 'C-1', referencia: 'REF-1', descripcion: 'TORNILLO', precioAnterior: 1200, precioNuevo: 1350 }
    ]);
    expect(r.omitidos).toEqual([
      { fila: 3, referencia: 'REF-2', motivo: MOTIVO_SIN_NUEVO_PRECIO },
      { fila: 4, referencia: 'REF-3', motivo: MOTIVO_SIN_CAMBIO }
    ]);
    expect(r.errores.map(e => [e.fila, e.motivo])).toEqual([
      [5, 'ID interno repetido (ya aparece en la fila 3)'],
      [6, 'El código no existe en el maestro'],
      [7, 'El código no existe en el maestro']
    ]);
  });

  it('reporta precio inválido o no positivo como error con la referencia del maestro', () => {
    const r = analizar([fila('A1', 'doce mil', 'MEDTRONIC CHILE', 'editada'), fila('A2', 0)]);
    expect(r.errores).toEqual([
      { fila: 2, referencia: 'REF-1', motivo: 'El nuevo precio no es un número válido' },
      { fila: 3, referencia: 'REF-2', motivo: 'El nuevo precio debe ser mayor que 0' }
    ]);
    expect(r.actualizar).toEqual([]);
  });

  it('reporta como error un ID que pertenece a otra empresa', () => {
    const r = analizar([fila('B1', 150)]);
    expect(r.errores).toEqual([{ fila: 2, referencia: 'OTRA-1', motivo: 'El código pertenece a otra empresa (STRYKER)' }]);
  });

  it('compara la empresa sin distinguir mayúsculas, tildes ni espacios', () => {
    const r = analizar([fila('A1', 1300, '  medtrónic chile ')]);
    expect(r.rechazo).toBeNull();
    expect(r.actualizar).toHaveLength(1);
  });

  it('rechaza el archivo completo si alguna fila es de otra empresa', () => {
    const r = analizar([fila('A1', 1300), fila('B1', 150, 'STRYKER'), fila('A2', 1, '')]);
    expect(r.rechazo).toMatch(/otra empresa \(STRYKER, \(vacía\)\)/);
    expect(r.actualizar).toEqual([]);
    expect(r.errores).toEqual([]);
  });

  it('rechaza el archivo si las columnas no son las esperadas', () => {
    const r = analizar([fila('A1', 1300)], ['Empresa', 'Referencia', 'Precio']);
    expect(r.rechazo).toMatch(/no tiene el formato esperado/);
  });

  it('acepta encabezados con otras mayúsculas o sin tildes', () => {
    const r = analizar([fila('A1', 1300)], ENCABEZADO.map(t => t.toUpperCase().replace('Ó', 'O')));
    expect(r.rechazo).toBeNull();
  });

  it('rechaza archivos vacíos o sin filas de datos, ignorando filas en blanco', () => {
    expect(analizarImportacionPrecios({ filas: [], empresa: EMPRESA, codigos: CODIGOS }).rechazo).toMatch(/vacío/);
    expect(analizar([['', '', null], []]).rechazo).toMatch(/no contiene filas de datos/);
  });
});
