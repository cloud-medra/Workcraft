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

describe('montos y códigos (versión 2)', () => {
  const { aporteDesdeDoc, repartirMontos, clavePrecio } = nucleo;
  const imp = (extra) => item({ codigo: 'IMP-1', descriptorAuto: 'Tornillo 5mm', cantidad: 2, precio: 1000, ...extra });

  it('monto = cantidad × precio unitario (Consignación usa "costo"), sin IVA ni recargo', () => {
    expect(aporteDesdeDoc('implantes', imp({ vecesCosto: 1.5, venta: 9999, total: 1 })).monto).toBe(2000);
    expect(aporteDesdeDoc('consignacion', { gestionId: '1', nombre: 'X', codigo: 'C-1', descripcion: 'Placa', cantidad: 3, costo: 500 }).monto).toBe(1500);
  });

  it('sub-ítems (contenido de PAD y lotes adicionales) no son línea de código ni "sin precio"', () => {
    const contenido = aporteDesdeDoc('implantes', imp({ padPadreId: 'pad1', codigo: 'No lleva OC', precio: 0 }));
    const lote = aporteDesdeDoc('implantes', imp({ codigo: 'No lleva OC', precio: 0 }));
    [contenido, lote].forEach((ap) => { expect(ap.linea).toBeNull(); expect(ap.sinPrecio).toBe(false); });
    expect(aporteDesdeDoc('implantes', imp({ precio: 0 })).sinPrecio).toBe(true);
  });

  it('sin código: línea "Sin código" separada por descripción, no mezclada con códigos reales', () => {
    const a = aporteDesdeDoc('implantes', imp({ codigo: 'P', descriptorAuto: 'Malla' }));
    const b = aporteDesdeDoc('implantes', imp({ codigo: '', descriptorAuto: 'malla ' }));
    const c = aporteDesdeDoc('implantes', imp({ codigo: 'S/C', descriptorAuto: 'Clavo' }));
    expect(a.linea.datos.k).toBe(b.linea.datos.k);
    expect(a.linea.datos.k).not.toBe(c.linea.datos.k);
    expect(a.linea.datos.k.startsWith('SC-')).toBe(true);
    expect(a.linea.codigo.c).toBe('');
  });

  it('calcularPeriodo: líneas por admisión × código, montos y precios usados', () => {
    const r = calcularPeriodo('implantes', [imp(), imp({ precio: 1200, cantidad: 1 }), imp({ codigo: 'IMP-2', precio: 0 }), imp({ padPadreId: 'x', codigo: 'No lleva OC', precio: 0 })]);
    expect(r.documentos).toBe(4);
    expect(r.sinPrecio).toBe(1);
    const lineas = Object.entries(r.l);
    expect(lineas).toHaveLength(2);
    const [claveImp1, l1] = lineas.find(([, l]) => l.k === Object.keys(r.codigos).find((k) => r.codigos[k].c === 'IMP-1'));
    expect([l1.q, l1.n]).toEqual([3, 2]);
    expect(r.montos.l[claveImp1].$).toBe(3200);
    expect(r.montos.l[claveImp1].p).toEqual({ [clavePrecio(1000)]: 1, [clavePrecio(1200)]: 1 });
    expect(Object.values(r.montos.t).reduce((s, m) => s + m.$, 0)).toBe(3200);
  });

  it('precios con decimales no rompen las claves; los montos se reparten si no caben', () => {
    expect(clavePrecio(1234.5)).toBe('1234,5');
    const muchos = { t: Object.fromEntries(Array.from({ length: 40000 }, (_, i) => [`t${i}`, { $: i, sp: 0 }])), l: {} };
    const grupos = repartirMontos(muchos);
    expect(grupos.length).toBeGreaterThan(1);
    expect(grupos.reduce((s, g) => s + Object.keys(g.t).length, 0)).toBe(40000);
  });
});
