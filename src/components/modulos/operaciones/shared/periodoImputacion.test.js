import { describe, it, expect } from 'vitest';
import {
  periodoImputacion, periodosImputacionDeBloque, periodoDesdeTexto, periodoSolicitudDeBloque,
  camposPeriodoSolicitud, camposSolicitudDe, bloqueParaImputacion,
} from './periodoImputacion';

const item = { id: 'it1', periodoAnio: '2026', periodoMes: 'septiembre' }; // cargado en septiembre

describe('periodoImputacion', () => {
  it('bloque no solicitado: el período de carga del ítem', () => {
    expect(periodoImputacion({ solicitud: 'PENDIENTE' }, item)).toEqual({ anio: '2026', mes: 'septiembre' });
  });
  it('bloque solicitado: el período de solicitud, no el de carga', () => {
    const bloque = { solicitud: 'SOLICITADO', ...camposPeriodoSolicitud({ anio: 2026, mes: 'octubre' }) };
    expect(periodoImputacion(bloque, item)).toEqual({ anio: '2026', mes: 'octubre' });
  });
  it('bloque solicitado antes del campo estructurado: se deduce del texto "Octubre 2026"', () => {
    expect(periodoImputacion({ solicitud: 'SOLICITADO', periodo: 'Octubre 2026' }, item)).toEqual({ anio: '2026', mes: 'octubre' });
    expect(periodoDesdeTexto('SEPTIEMBRE 2025')).toEqual({ anio: '2025', mes: 'septiembre' });
    expect(periodoDesdeTexto('Octubre')).toBeNull();
    expect(periodoDesdeTexto('')).toBeNull();
  });
  it('el campo estructurado manda sobre el texto', () => {
    expect(periodoSolicitudDeBloque({ periodo: 'Agosto 2026', periodoSolicitudAnio: '2026', periodoSolicitudMes: 'octubre' })).toEqual({ anio: '2026', mes: 'octubre' });
  });
  it('solicitado sin ningún dato de período: vuelve al de carga (como antes)', () => {
    expect(periodoImputacion({ solicitud: 'SOLICITADO' }, item)).toEqual({ anio: '2026', mes: 'septiembre' });
    expect(periodoImputacion({ solicitud: 'PENDIENTE' }, { id: 'x' })).toBeNull();
  });
  it('candado: un bloque solicitado se valida solo contra su período de solicitud', () => {
    const items = [item, { id: 'it2', periodoAnio: '2026', periodoMes: 'agosto' }];
    expect(periodosImputacionDeBloque({ solicitud: 'SOLICITADO', periodo: 'Octubre 2026' }, items)).toEqual([{ anio: '2026', mes: 'octubre' }]);
    expect(periodosImputacionDeBloque({ solicitud: 'PENDIENTE' }, items)).toHaveLength(2);
    expect(periodosImputacionDeBloque(null, items)).toHaveLength(2);
  });
  it('los datos de solicitud viajan con el bloque y el documento guardado manda', () => {
    const original = { solicitud: 'SOLICITADO', periodo: 'Octubre 2026', solicitadoPor: 'Ana', fechaSolicitud: 'f', otro: 1 };
    expect(camposSolicitudDe(original)).toEqual({ periodo: 'Octubre 2026', solicitadoPor: 'Ana', fechaSolicitud: 'f' });
    expect(bloqueParaImputacion({ solicitud: 'SOLICITADO', periodo: 'Agosto 2026' }, original).periodo).toBe('Octubre 2026');
    expect(bloqueParaImputacion({ solicitud: 'SOLICITADO' }, null)).toEqual({ solicitud: 'SOLICITADO' });
  });
});
