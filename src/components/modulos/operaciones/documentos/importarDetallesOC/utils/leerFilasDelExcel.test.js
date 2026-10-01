// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import * as XLSX from 'xlsx';

vi.mock('../../../../../../firebaseConfig', () => ({ db: {}, storage: {} }));
vi.mock('../../../shared/ocIndex/indiceOCRemoto', () => ({ descargarIndiceOC: vi.fn(), publicarIndiceOC: vi.fn() }));

const { leerFilasDelExcel } = await import('./procesarImportacionDetallesOC');
const { detectarFormato } = await import('./leerHojaArchivo');

const ENCABEZADOS_REALES = ['ID', 'ADMISION', 'PACIENTE', 'MEDICO', 'FECHA_CX', 'PROVEEDOR', 'CODIGO', 'DESCRIPCION', 'CANT', 'PRECIO_U', 'ATRIBUTO', 'OC', 'OC_MONTO', 'ESTADO', 'FECHA_RECEPCION', 'FECHA_CARGO', 'NUMERO_GUIA', 'NUMERO_FACTURA', 'FECHA_EMISION', 'FECHA_INGRESO', 'LOTE', 'FECHA_VENCIMIENTO'];
const bytesTexto = (texto) => { const b = new TextEncoder().encode(texto); return { arrayBuffer: async () => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) }; };

// Arma un .xlsx real en memoria (mismo camino que un archivo subido).
const archivo = (filas, { hoja = 'planilla', formatoCodigo } = {}) => {
  const ws = XLSX.utils.aoa_to_sheet(filas);
  if (formatoCodigo) {
    const rango = XLSX.utils.decode_range(ws['!ref']);
    for (let r = 1; r <= rango.e.r; r++) {
      const celda = ws[XLSX.utils.encode_cell({ r, c: formatoCodigo })];
      if (celda) celda.z = '00000';
    }
  }
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja);
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return { arrayBuffer: async () => buffer };
};

describe('leerFilasDelExcel', () => {
  it('reconoce encabezados con tildes/espacios/sinónimos y valores en formatos variados', async () => {
    const { filas, invalidas, tieneColumnaOC } = await leerFilasDelExcel(archivo([
      ['ID', 'ADMISIÓN ', 'PACIENTE', 'Fecha CX', 'PROVEEDOR', 'CÓDIGO', 'CANTIDAD', 'N° OC'],
      [88123, 102345, 'JUAN', '15-09-26', 'MEDTRONIC', '00123', 1, 4500001234],
      [88124, 102345, 'JUAN', '15/09/2026 10:30', 'MEDTRONIC', 'AB-1', '2', ' $ 4.500.001.235 ']
    ]));
    expect(invalidas).toEqual([]);
    expect(tieneColumnaOC).toBe(true);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toMatchObject({ id: '88123', admision: '102345', codigo: '00123', cantidad: 1, oc: '4500001234', _filaExcel: 2 });
    expect(filas[0].fecha_cx).toEqual(new Date(2026, 8, 15));
    expect(filas[1]).toMatchObject({ cantidad: 2, oc: '4500001235' });
  });

  it('código numérico con formato "00000" conserva los ceros a la izquierda', async () => {
    const { filas } = await leerFilasDelExcel(archivo([
      ['ID', 'ADMISION', 'FECHA_CX', 'PROVEEDOR', 'CODIGO', 'CANT', 'OC'],
      [1, 5, '01-09-2026', 'X', 123, 1, 9]
    ], { formatoCodigo: 4 }));
    expect(filas[0].codigo).toBe('00123');
  });

  it('salta filas de título sobre los encabezados', async () => {
    const { filas } = await leerFilasDelExcel(archivo([
      ['REPORTE DETALLE OC'],
      [],
      ['ID', 'ADMISION', 'FECHA_CX', 'PROVEEDOR', 'CODIGO', 'CANT', 'OC'],
      [1, 5, '01-09-2026', 'X', 'C1', 1, 9]
    ]));
    expect(filas).toHaveLength(1);
    expect(filas[0]._filaExcel).toBe(4);
  });

  it('informa el motivo por fila y no la cuenta como válida', async () => {
    const { filas, invalidas } = await leerFilasDelExcel(archivo([
      ['ID', 'ADMISION', 'FECHA_CX', 'PROVEEDOR', 'CODIGO', 'CANT', 'OC'],
      [1, 5, 'mañana', 'X', 'C1', 1, 9],
      [2, '', '01-09-2026', 'X', 'C1', 1, 9],
    ]));
    expect(filas).toEqual([]);
    expect(invalidas).toEqual([
      { id: '1', filaExcel: 2, error: 'FECHA_CX "mañana" no se reconoce como fecha' },
      { id: '2', filaExcel: 3, error: 'ADMISION vacía' }
    ]);
  });

  it('aborta con un mensaje claro si faltan columnas obligatorias', async () => {
    await expect(leerFilasDelExcel(archivo([['ID', 'ADM', 'FECHA', 'EMPRESA'], [1, 2, 3, 4]])))
      .rejects.toThrow(/Faltan columnas obligatorias: ADMISION, CODIGO, CANT\. Encabezados encontrados en la hoja "planilla": ID \| ADM \| FECHA \| EMPRESA/);
  });

  it('xlsx con celdas vacías en medio de la fila: cada valor queda en su columna', async () => {
    const { filas, invalidas } = await leerFilasDelExcel(archivo([
      ENCABEZADOS_REALES,
      // PACIENTE, MEDICO, ATRIBUTO y varias fechas vacías
      [114584, 2001, null, null, '15-09-2026', 'PRODUCTOS MEDICOS PROMEDON CHILE S A', 'C1', 'PLACA', 1, 1000, null, 4500001, 1000, 'RECIBIDO', null, null, 'G1', null, null, null, 'L1', null],
      [114789, 2002, 'ANA', null, '16-09-2026', 'ALCO MEDICAL SPA', 'C2', null, 2, null, null, 4500002, null, null, null, null, null, null, null, null, null, '01-01-2030']
    ]));
    expect(invalidas).toEqual([]);
    expect(filas[0]).toMatchObject({ id: '114584', paciente: '', medico: '', proveedor: 'PRODUCTOS MEDICOS PROMEDON CHILE S A', codigo: 'C1', cantidad: 1, oc: '4500001', lote: 'L1', numero_guia: 'G1' });
    expect(filas[0].fecha_cx).toEqual(new Date(2026, 8, 15));
    expect(filas[1]).toMatchObject({ proveedor: 'ALCO MEDICAL SPA', cantidad: 2, oc: '4500002', descripcion: '' });
    expect(filas[1].fecha_vencimiento).toEqual(new Date(2030, 0, 1));
  });

  it('".xls" que en realidad es HTML con <td/> vacíos: no corre las columnas', async () => {
    const td = (v) => (v === null ? '<td/>' : `<td>${v}</td>`);
    const tr = (celdas) => `<tr>${celdas.map(td).join('')}</tr>`;
    const html = `<html><head><meta charset="utf-8"></head><body><table>
      ${tr(ENCABEZADOS_REALES)}
      ${tr(['114584', '2001', 'JUAN', null, '15-09-2026', 'PRODUCTOS MEDICOS PROMEDON CHILE S A', '00123', 'PLACA', '1', '1.000', null, '4500001', '1.000', 'OK', null, null, null, null, null, null, 'L1', null])}
    </table></body></html>`;
    const { filas, invalidas, formato } = await leerFilasDelExcel(bytesTexto(html));
    expect(formato).toBe('html');
    expect(invalidas).toEqual([]);
    expect(filas[0]).toMatchObject({ medico: '', proveedor: 'PRODUCTOS MEDICOS PROMEDON CHILE S A', codigo: '00123', cantidad: 1, precio_u: 1000, oc: '4500001', lote: 'L1' });
    expect(filas[0].fecha_cx).toEqual(new Date(2026, 8, 15));
  });

  it('HTML con colspan/rowspan y tabla de título: respeta las posiciones', async () => {
    const html = `<table><tr><td colspan="7">REPORTE</td></tr></table>
      <table>
        <tr><th>ID</th><th>ADMISION</th><th>FECHA_CX</th><th>PROVEEDOR</th><th>CODIGO</th><th>CANT</th><th>OC</th></tr>
        <tr><td>1</td><td rowspan="2">500</td><td>01-09-2026</td><td colspan="1">X</td><td>C1</td><td>1</td><td>9</td></tr>
        <tr><td>2</td><td>02-09-2026</td><td>Y</td><td>C2</td><td>3</td><td>8</td></tr>
      </table>`;
    const { filas, invalidas } = await leerFilasDelExcel(bytesTexto(html));
    expect(invalidas).toEqual([]);
    expect(filas.map(f => [f.id, f.admision, f.proveedor, f.codigo, f.cantidad, f.oc]))
      .toEqual([['1', '500', 'X', 'C1', 1, '9'], ['2', '500', 'Y', 'C2', 3, '8']]);
  });

  it('planilla real sin ID: genera clave + correlativo para las filas repetidas', async () => {
    const enc = ['ID_PACIENTE', 'PACIENTE', 'MEDICO', 'FECHA_CIRUGIA', 'PROVEEDOR', 'CODIGO_CLINICA', 'CODIGO_PROVEEDOR', 'CANTIDAD', 'PRECIO_UNITARIO', 'OC'];
    const { filas, invalidas } = await leerFilasDelExcel(archivo([
      enc,
      [114584, 'JUAN', 'DR', new Date(2026, 8, 15), 'Medtronic Chile S.A.', 510012, 'TORNILLO 3.5', 1, 1000, 4500001],
      [114584, 'JUAN', 'DR', new Date(2026, 8, 15), 'Medtronic Chile S.A.', 510013, 'PLACA', 1, 5000, 4500001],
      [114584, 'JUAN', 'DR', new Date(2026, 8, 15), 'Medtronic Chile S.A.', 510012, 'TORNILLO 3.5', 1, 1000, 4500001]
    ]));
    expect(invalidas).toEqual([]);
    expect(filas.map(f => f.id)).toEqual([
      '114584_20260915_medtronic_chile_s_a_510012_1',
      '114584_20260915_medtronic_chile_s_a_510013_1',
      '114584_20260915_medtronic_chile_s_a_510012_2'
    ]);
    expect(filas[0]).toMatchObject({ admision: '114584', codigo: '510012', descripcion: 'TORNILLO 3.5', cantidad: 1, precio_u: 1000, oc: '4500001' });
    expect(filas[0].fecha_cx).toEqual(new Date(2026, 8, 15));
  });

  it('detecta el formato real del archivo', async () => {
    const xlsx = await archivo([['ID'], [1]]).arrayBuffer();
    expect(detectarFormato(xlsx)).toBe('xlsx');
    expect(detectarFormato(new TextEncoder().encode('\uFEFF<html><body><table></table>').buffer)).toBe('html');
    expect(detectarFormato(new TextEncoder().encode('<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">').buffer)).toBe('xml2003');
    expect(detectarFormato(new TextEncoder().encode('ID;ADMISION').buffer)).toBe('texto');
  });
});
