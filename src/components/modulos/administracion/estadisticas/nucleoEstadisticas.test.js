import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// El cálculo vive en el backend (functions/, CommonJS): lo usan los triggers,
// el recálculo nocturno, el manual y el script inicial.
const require = createRequire(import.meta.url);
const nucleo = require('../../../../../functions/estadisticas/nucleo.js');
const { normalizar, tuplaDesdeDoc, calcularPeriodo, repartir, nombresDudosos, idEstadistica, claveMes } = nucleo;

const item = (extra) => ({ gestionId: '2045123', paciente: 'ANA ROJAS', fecha: '2026-10-02', medico: 'Dr. Juan Pérez', descripcion: 'Artroscopía de rodilla', empresa: 'Acme Médica', ...extra });

describe('normalización', () => {
  it('agrupa mayúsculas, tildes, puntos, espacios y "Dr."', () => {
    expect(normalizar('Dr. Juan  Pérez')).toBe('JUAN PEREZ');
    expect(normalizar('JUAN PEREZ')).toBe('JUAN PEREZ');
    expect(normalizar('dra. maría  josé')).toBe('MARIA JOSE');
  });
  it('vacío, "P" y "Cargando..." son "Sin informar"', () => {
    ['', 'P', ' p ', 'Cargando...', null, undefined, '-'].forEach((v) => expect(normalizar(v)).toBe(''));
  });
});

describe('tuplas', () => {
  it('el mismo médico escrito distinto cae en la misma clave', () => {
    const a = tuplaDesdeDoc('implantes', item());
    const b = tuplaDesdeDoc('implantes', item({ medico: 'JUAN PEREZ', descripcion: 'ARTROSCOPIA DE RODILLA' }));
    expect(a.clave).toBe(b.clave);
  });
  it('Consignación toma la cirugía de descripcionPabellon y el paciente de nombre', () => {
    const t = tuplaDesdeDoc('consignacion', { gestionId: '1', nombre: 'X', medico: 'M', descripcion: 'TORNILLO 5MM', descripcionPabellon: 'Artroscopía de rodilla', empresa: 'E' });
    const i = tuplaDesdeDoc('implantes', item({ gestionId: '1', medico: 'M', empresa: 'E' }));
    expect(t.tupla.c).toBe(i.tupla.c);
  });
  it('sin ID: se identifica por paciente + fecha y queda marcada', () => {
    const a = tuplaDesdeDoc('implantes', item({ gestionId: 'P' }));
    const b = tuplaDesdeDoc('implantes', item({ gestionId: '' , empresa: 'Otra' }));
    const otro = tuplaDesdeDoc('implantes', item({ gestionId: 'P', paciente: 'LUIS SOTO' }));
    expect(a.tupla.s).toBe(true);
    expect(a.tupla.a).toBe(b.tupla.a);
    expect(a.tupla.a).not.toBe(otro.tupla.a);
  });
  it('campos vacíos van a "Sin informar"', () => {
    const t = tuplaDesdeDoc('implantes', item({ medico: 'P', empresa: '' }));
    expect(t.tupla.m).toBe('_');
    expect(t.nombres.e._).toBe('SIN INFORMAR');
  });
});

describe('calcularPeriodo', () => {
  it('varios ítems de la misma admisión, médico, cirugía y empresa = una tupla con n', () => {
    const r = calcularPeriodo('implantes', [item(), item(), item({ empresa: 'Otra SpA' }), item({ gestionId: '999' })]);
    const tuplas = Object.values(r.t);
    expect(tuplas).toHaveLength(3);
    expect(tuplas.map((t) => t.n).sort()).toEqual([1, 1, 2]);
    expect(new Set(tuplas.map((t) => t.a)).size).toBe(2);
    expect(r.documentos).toBe(4);
  });
  it('el nombre visible es la escritura más frecuente', () => {
    const r = calcularPeriodo('implantes', [item({ medico: 'JUAN PEREZ' }), item({ medico: 'Juan Pérez' }), item({ gestionId: '2', medico: 'Juan Pérez' })]);
    expect(Object.values(r.nombres.m)).toEqual(['Juan Pérez']);
  });
});

describe('partes y otros', () => {
  it('reparte en partes si no cabe, sin separar una admisión', () => {
    const docs = Array.from({ length: 9000 }, (_, i) => item({ gestionId: String(100000 + Math.floor(i / 3)), empresa: `Empresa con nombre largo ${i % 3}`, descripcion: `Cirugía ${i % 400} con una descripción bastante larga para ocupar espacio` }));
    const r = calcularPeriodo('implantes', docs);
    const grupos = repartir(r.t, r.nombres);
    expect(grupos.length).toBeGreaterThan(1);
    const dondeEsta = new Map();
    grupos.forEach((g, i) => Object.values(g).forEach((t) => {
      if (dondeEsta.has(t.a)) expect(dondeEsta.get(t.a)).toBe(i);
      dondeEsta.set(t.a, i);
    }));
  });
  it('ids de documento por período', () => {
    expect(claveMes('2026', 'octubre')).toBe('2026-10');
    expect(idEstadistica('implantes', '2026', 'enero')).toBe('implantes_2026-01');
  });
  it('nombres dudosos: mismo nombre en otro orden o con 1–2 letras distintas', () => {
    const pares = nombresDudosos(['Juan Pérez Soto', 'PEREZ SOTO JUAN', 'Juan Peres Soto', 'Ana Muñoz']);
    expect(pares).toEqual([['JUAN PEREZ SOTO', 'PEREZ SOTO JUAN'], ['JUAN PEREZ SOTO', 'JUAN PERES SOTO']]);
  });
});
