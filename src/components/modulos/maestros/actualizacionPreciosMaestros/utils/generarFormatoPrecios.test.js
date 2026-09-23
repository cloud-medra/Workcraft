import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { construirLibroFormato, nombreArchivoFormato } from './generarFormatoPrecios';
import { leerFilasExcel } from './leerExcelPrecios';
import { analizarImportacionPrecios } from './analizarImportacionPrecios';
import { COLUMNAS } from './formatoPrecios';

const EMPRESA = { id: 'e1', nombre: 'Médica Sur S.A.' };
const CODIGOS = [
  { id: 'B2', codigo: 'C-2', referencia: 'REF-B', descriptorEmpresa: 'PLACA', empresa: 'MEDICA SUR S.A.', precioNeto: 5000 },
  { id: 'A1', codigo: 'C-1', referencia: 'REF-A', descriptorAuto: 'TORNILLO', empresa: 'MEDICA SUR S.A.', precioNeto: 1200 }
];

describe('nombreArchivoFormato', () => {
  it('usa un slug de la empresa y la fecha', () => {
    expect(nombreArchivoFormato('Médica Sur S.A.', new Date(2026, 8, 3))).toBe('actualizacion_precios_medica_sur_s_a_2026-09-03.xlsx');
  });
});

describe('construirLibroFormato', () => {
  it('genera encabezados, filas ordenadas por referencia y solo "Nuevo precio" editable', async () => {
    const libro = await construirLibroFormato({ empresa: EMPRESA, codigos: CODIGOS });
    const buffer = await libro.xlsx.writeBuffer();

    // Se relee el archivo escrito, como lo abriría Excel.
    const releido = new ExcelJS.Workbook();
    await releido.xlsx.load(buffer);
    const hoja = releido.getWorksheet('Precios');

    expect(hoja.getRow(1).values.slice(1)).toEqual(COLUMNAS.map(c => c.titulo));
    expect(hoja.getRow(2).values.slice(1, 7)).toEqual(['Médica Sur S.A.', 'A1', 'C-1', 'REF-A', 'TORNILLO', 1200]);
    expect(hoja.getRow(3).getCell(2).value).toBe('B2');
    expect(hoja.sheetProtection?.sheet).toBe(true);

    const celdaPrecio = hoja.getRow(2).getCell(7);
    expect(celdaPrecio.protection?.locked).toBe(false);
    expect(celdaPrecio.numFmt).toBe('"$" #,##0');
    expect(celdaPrecio.dataValidation).toMatchObject({ type: 'decimal', operator: 'greaterThan', formulae: [0] });
    expect(hoja.getRow(2).getCell(6).numFmt).toBe('"$" #,##0');
    expect(hoja.getRow(2).getCell(4).protection?.locked).not.toBe(false);
  });

  it('el formato completado se puede importar (lectura con xlsx)', async () => {
    const libro = await construirLibroFormato({ empresa: EMPRESA, codigos: CODIGOS });
    libro.getWorksheet('Precios').getRow(2).getCell(7).value = 1350;
    libro.getWorksheet('Precios').getRow(3).getCell(7).value = '5.000';
    const buffer = await libro.xlsx.writeBuffer();

    const filas = leerFilasExcel(XLSX.read(buffer, { type: 'array' }));
    const r = analizarImportacionPrecios({ filas, empresa: EMPRESA, codigos: CODIGOS });

    expect(r.rechazo).toBeNull();
    expect(r.actualizar.map(a => [a.id, a.precioAnterior, a.precioNuevo])).toEqual([['A1', 1200, 1350]]);
    expect(r.omitidos.map(o => o.referencia)).toEqual(['REF-B']);
    expect(r.errores).toEqual([]);
  });
});
