import { describe, it, expect } from 'vitest';
import { ESTADOS_PROCESO, normalizarEstadoProceso, getEstadoProcesoClase } from './estadosProceso';

describe('estadosProceso', () => {
  it('normaliza tildes, mayúsculas y alias históricos al nombre canónico', () => {
    expect(normalizarEstadoProceso('falta vinculacion')).toBe('Falta Vinculación');
    expect(normalizarEstadoProceso('LISTO PARA INGRESO')).toBe('Listo para Ingreso');
    expect(normalizarEstadoProceso('Listos para Ingreso')).toBe('Listo para Ingreso');
    expect(normalizarEstadoProceso('Rechazado')).toBe('Rechazada');
    expect(normalizarEstadoProceso('Completado')).toBe('Finalizado');
    expect(normalizarEstadoProceso('')).toBeNull();
    expect(normalizarEstadoProceso('Otro')).toBeNull();
  });

  it('asigna un color distinto a cada estado', () => {
    const clases = Object.values(ESTADOS_PROCESO).map(getEstadoProcesoClase);
    expect(new Set(clases).size).toBe(clases.length);
  });

  it('el mismo estado escrito distinto obtiene el mismo color', () => {
    expect(getEstadoProcesoClase('Vinculacion Parcial')).toBe(getEstadoProcesoClase('Vinculación Parcial'));
  });

  it('estado desconocido cae en el color neutro', () => {
    expect(getEstadoProcesoClase('???')).toBe(getEstadoProcesoClase(undefined));
  });
});
