// @vitest-environment jsdom
// Detalle de Reporte Info en la URL: parámetros y vista inicial del
// Dashboard al recargar (solo si el usuario tiene esa vista).
import { describe, it, expect, beforeEach } from 'vitest';
import { leerURL, urlCon, vistaInicialDesdeURL } from './urlDetalle';

const conImplantes = { rol: 'usuario', permisos: { implantes: ['/implantes/reportesInfo'] } };

beforeEach(() => window.history.replaceState(null, '', '/'));

describe('urlDetalle', () => {
  it('escribe y lee los parámetros, conservando los ajenos', () => {
    window.history.replaceState(null, '', '/?otro=1');
    const url = urlCon({ vista: '/implantes/reportesInfo', detalle: '200', anio: '2026', mes: '' });
    window.history.replaceState(null, '', url);
    expect(leerURL()).toEqual({ vista: '/implantes/reportesInfo', detalle: '200', anio: '2026', mes: '' });
    expect(window.location.search).toContain('otro=1');
    window.history.replaceState(null, '', urlCon());
    expect(window.location.search).toBe('?otro=1');
  });

  it('vista inicial: la de Reporte Info del detalle, solo con permiso', () => {
    expect(vistaInicialDesdeURL(conImplantes)).toBeNull();
    window.history.replaceState(null, '', urlCon({ vista: '/implantes/reportesInfo', detalle: '200' }));
    expect(vistaInicialDesdeURL(conImplantes)).toEqual({ modulo: 'implantes', vista: '/implantes/reportesInfo' });
    expect(vistaInicialDesdeURL({ rol: 'usuario', permisos: { documentos: ['/documentos/reportesInfo'] } })).toBeNull();
    window.history.replaceState(null, '', urlCon({ vista: '/administracion/listadoUsuario', detalle: '200' }));
    expect(vistaInicialDesdeURL(conImplantes)).toBeNull();
  });
});
