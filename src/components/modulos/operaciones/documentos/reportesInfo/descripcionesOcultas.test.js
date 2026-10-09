// Núcleo de "Descripciones ocultas" (functions/descripcionesReporte/nucleo.mjs):
// normalización, campos de cada fila y la excepción de admisiones con
// gestión en Implantes.
import { describe, it, expect } from 'vitest';
import {
  descripcionNormDe, idDescripcionReporte, admisionClaveDe, camposFila, camposIguales, esFilaReporte,
} from '../../../../../../functions/descripcionesReporte/nucleo.mjs';

describe('normalización', () => {
  it('mayúsculas, sin tildes ni espacios extra; vacía → SIN DESCRIPCION', () => {
    expect(descripcionNormDe('  Cesárea  c/s salpingoligadura o\tSALPINGECTOMÍA ')).toBe('CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMIA');
    expect(descripcionNormDe('CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMÍA')).toBe(descripcionNormDe('cesarea c/s salpingoligadura o salpingectomia'));
    expect(descripcionNormDe('')).toBe('SIN DESCRIPCION');
    expect(descripcionNormDe(undefined)).toBe('SIN DESCRIPCION');
    expect(idDescripcionReporte('Cesárea c/s')).toBe('CESAREA%20C%2FS');
  });

  it('admisión como texto; sin número → vacía', () => {
    expect(admisionClaveDe(114649)).toBe('114649');
    expect(admisionClaveDe(' 0114649 ')).toBe('114649');
    expect(admisionClaveDe('P')).toBe('');
    expect(admisionClaveDe(null)).toBe('');
  });
});

describe('campos de la fila', () => {
  const fila = { 'Descripción': 'Cesárea', 'Admisión': 10 };
  it('sin entrada en el Maestro: visible en ambos módulos', () => {
    expect(camposFila(fila, null, false)).toEqual({
      descripcionNorm: 'CESAREA', admisionClave: '10', ocultaImplantes: false, ocultaDocumentos: false, descripcionOcultaImplantes: false,
    });
  });
  it('oculta por módulo; con gestión en Implantes no se oculta en Implantes (sí en Documentos)', () => {
    const entrada = { ocultaImplantes: true, ocultaDocumentos: true };
    expect(camposFila(fila, entrada, false)).toMatchObject({ ocultaImplantes: true, ocultaDocumentos: true, descripcionOcultaImplantes: true });
    expect(camposFila(fila, entrada, true)).toMatchObject({ ocultaImplantes: false, ocultaDocumentos: true, descripcionOcultaImplantes: true });
    expect(camposFila(fila, { ocultaDocumentos: true }, false)).toMatchObject({ ocultaImplantes: false, ocultaDocumentos: true });
  });
  it('compara campos y reconoce las filas de Reporte Info', () => {
    const c = camposFila(fila, null, false);
    expect(camposIguales({ ...fila, ...c }, c)).toBe(true);
    expect(camposIguales(fila, c)).toBe(false);
    expect(esFilaReporte('documentos_reportesInfo/2026/meses/octubre/registros/x')).toBe(true);
    expect(esFilaReporte('consignacion_ingresos/2026/meses/octubre/registros/x')).toBe(false);
  });
});
