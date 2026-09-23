import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  normalizarSolicitudImplantes,
  normalizarSolicitudConsignacion,
  normalizarSolicitudHemodinamia
} from './normalizarFila';
import { construirHojasSolicitudUnificada } from './hojasExcelSolicitud';

const fechaRegistro = { toDate: () => new Date(2026, 8, 20, 10, 0) };

const bloqueImplantes = {
  refPath: 'implantes_gestiones/2026/detalles/A1',
  gestionId: '102030',
  nombre: 'PACIENTE IMP',
  medico: 'DR IMP',
  fecha: '2026-09-18',
  empresa: 'EMP IMP',
  centro: 'PABELLON',
  prevision: 'FONASA',
  atributo: 'IMPLANTES',
  fechaRegistro,
  cotizaciones: [{
    numCotizacion: 'COT-1',
    items: [{
      id: 'it1', codigo: 'C-1', referencia: 'REF-IMP', descriptorAuto: 'TORNILLO 3.5MM',
      tipoVinculado: 'OSTEOSINTESIS', cantidad: 2, precio: 100, venta: 150,
      estadoCarga: 'CARGADO', lote: 'L1', vencimiento: '2027-01-31'
    }]
  }]
};

const docHemodinamia = {
  refPath: 'hemodinamia_gestiones/2026/detalles/H1',
  gestionId: '102040',
  nombre: 'PACIENTE HEMO',
  medico: 'DR HEMO',
  fecha: '2026-09-19',
  empresa: 'EMP HEMO',
  prevision: 'ISAPRE',
  fechaRegistro,
  cotizaciones: [{
    numCotizacion: 'COT-2',
    items: [{
      id: 'h1', codigo: 'C-2', referencia: 'REF-HEMO', descriptorAuto: 'STENT CORONARIO',
      tipoVinculado: 'STENT', cantidad: 1, precio: 500, venta: 800, lote: 'L2', vencimiento: ''
    }]
  }]
};

const itemConsignacion = {
  id: 'c1',
  refPath: 'consignacion_registros/X/detalles/c1',
  datosOriginales: { prevision: 'PARTICULAR' },
  gestionId: '102050',
  nombre: 'PACIENTE CON',
  medico: 'DR CON',
  fecha: '2026-09-17',
  empresa: 'EMP CON',
  codigo: 'C-3',
  descripcion: 'PLACA BLOQUEADA',
  cantidad: 3,
  costo: 40,
  ventaUnitaria: 60,
  atributo: 'CONSIGNACION',
  fechaRegistro,
  numeroGuia: 9876,
  lote: 'PAD',
  vencimiento: 'PAD'
};

const filaGuiaConsignacion = {
  id: 'guia-D1-0', ref: null, esFilaGuia: true, gestionId: '102050', nombre: 'PACIENTE CON',
  medico: 'DR CON', fecha: '2026-09-17', empresa: 'EMP G', codigo: 'No lleva OC',
  descripcion: 'TORNILLO GUIA', cantidad: 5, costo: 0, ventaUnitaria: 0, atributo: 'INSUMO',
  fechaRegistro, numeroGuia: 0, lote: 'LG', vencimiento: '2028-01-01'
};

const filas = [
  ...normalizarSolicitudImplantes(bloqueImplantes),
  ...normalizarSolicitudConsignacion(itemConsignacion),
  ...normalizarSolicitudConsignacion(filaGuiaConsignacion),
  ...normalizarSolicitudHemodinamia(docHemodinamia)
];

// Escribe y relee un .xlsx real con la misma llamada que usa el hook,
// para validar el archivo tal cual lo recibiría el usuario.
const generarYLeerLibro = () => {
  const workbook = XLSX.utils.book_new();
  construirHojasSolicitudUnificada(filas, '23-09-2026').forEach(({ nombre, filas: f }) => {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(f), nombre);
  });
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const leido = XLSX.read(buffer, { type: 'buffer' });
  const hojas = {};
  leido.SheetNames.forEach(n => { hojas[n] = XLSX.utils.sheet_to_json(leido.Sheets[n], { defval: '' }); });
  return { nombres: leido.SheetNames, hojas };
};

describe('construirHojasSolicitudUnificada (Excel de Solicitudes del Consolidado)', () => {
  const { nombres, hojas } = generarYLeerLibro();

  it('el libro tiene las 3 hojas por origen + Detalle Unificado + Resumen', () => {
    expect(nombres).toEqual([
      'Solicitud Implantes', 'Solicitud Consignación', 'Solicitud Hemodinamia', 'Detalle Unificado', 'Resumen'
    ]);
  });

  it('DESCRIPCION exporta descriptorAuto (no la referencia) en Implantes/Hemodinamia', () => {
    expect(hojas['Solicitud Implantes'][0].DESCRIPCION).toBe('TORNILLO 3.5MM');
    expect(hojas['Solicitud Hemodinamia'][0].DESCRIPCION).toBe('STENT CORONARIO');
    expect(hojas['Solicitud Consignación'][0].DESCRIPCION).toBe('PLACA BLOQUEADA');
    const todasLasDescripciones = [
      ...hojas['Detalle Unificado'].map(f => f.DESCRIPCION),
      ...hojas.Resumen.map(f => f['Descripción'])
    ];
    expect(todasLasDescripciones).not.toContain('REF-IMP');
    expect(todasLasDescripciones).not.toContain('REF-HEMO');
  });

  it('las hojas por origen tienen las mismas columnas que el Excel nativo de cada módulo', () => {
    expect(Object.keys(hojas['Solicitud Implantes'][0])).toEqual([
      'ID', 'PACIENTE', 'MEDICO', 'FECHA', 'EMPRESA', 'CODIGO', 'DESCRIPCION', 'CANTIDAD', 'PRECIO',
      'ATRIBUTO', 'FECHA REGISTRO', 'FECHA CARGA', 'N° COTIZACION', 'FECHA INGRESO', 'LOTE', 'VENCIMIENTO'
    ]);
    expect(Object.keys(hojas['Solicitud Consignación'][0])).toEqual([
      'ADMISION', 'PACIENTE', 'MEDICO', 'FECHA', 'EMPRESA', 'CODIGO', 'DESCRIPCION', 'CANTIDAD', 'PRECIO',
      'ATRIBUTO', 'FECHA DE REGISTRO', 'FECHA DE CARGA', 'N GUIA', 'FECHA DE INGRESO', 'LOTE', 'VENCIMIENTO'
    ]);
  });

  it('Detalle Unificado junta fila por fila los 3 orígenes con ATRIBUTO/fechas/N° cotización llenos', () => {
    const det = hojas['Detalle Unificado'];
    expect(det.map(f => f.ORIGEN)).toEqual(['Implantes', 'Consignación', 'Consignación', 'Hemodinamia']);
    expect(det[0]).toMatchObject({
      'ID': '102030', 'ATRIBUTO': 'OSTEOSINTESIS', 'FECHA REGISTRO': '20-09-2026', 'FECHA CARGA': '18-09-2026',
      'N° COTIZACIÓN': 'COT-1', 'FECHA INGRESO': '23-09-2026', 'VENCIMIENTO': '31-01-2027'
    });
    expect(det[1]).toMatchObject({
      'ID': '102050', 'ATRIBUTO': 'CONSIGNACION', 'FECHA REGISTRO': '20-09-2026', 'FECHA CARGA': '17-09-2026',
      'N° COTIZACIÓN': 9876, 'FECHA INGRESO': '23-09-2026', 'VENCIMIENTO': 'PAD'
    });
    expect(det[3]).toMatchObject({ 'ATRIBUTO': 'STENT', 'N° COTIZACIÓN': 'COT-2' });
  });

  it('Resumen incluye Área, Previsión y Estado, y Venta usa la venta (no el costo)', () => {
    const res = hojas.Resumen;
    expect(Object.keys(res[0])).toEqual([
      'Origen', 'Ingreso', 'Área', 'Previsión', 'Id', 'Cód', 'Cant', 'Venta', 'Médico', 'Fecha', 'Descripción', 'Estado'
    ]);
    expect(res[0]).toMatchObject({ 'Área': 'PABELLON', 'Previsión': 'FONASA', 'Estado': 'CARGADO', 'Venta': 150 });
    expect(res[1]).toMatchObject({ 'Área': 'PABELLON', 'Previsión': 'PARTICULAR', 'Estado': 'CARGADO', 'Venta': 60 });
    expect(res[2]).toMatchObject({ 'Previsión': '-', 'Estado': '-' });
    expect(res[3]).toMatchObject({ 'Área': 'HEMODINAMIA', 'Previsión': 'ISAPRE', 'Estado': 'PENDIENTE', 'Venta': 800 });
  });

  it('omite la hoja de un origen sin filas seleccionadas, pero mantiene las unificadas', () => {
    const hojasSolo = construirHojasSolicitudUnificada(normalizarSolicitudImplantes(bloqueImplantes), '23-09-2026');
    expect(hojasSolo.map(h => h.nombre)).toEqual(['Solicitud Implantes', 'Detalle Unificado', 'Resumen']);
  });
});
