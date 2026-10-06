import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  writeBatch: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS')
}));

import { descripcionDesdeMaestro, mapearItemMaestro, buscarItemMaestro } from './registroConsignacionService';

const ITEM = {
  codigo: 'C-200',
  referencia: 'KITBYPASSTCRL2',
  precioNeto: 90000,
  descriptorEmpresa: 'KITBYPASSTCRL2',
  descriptorAuto: 'BYPASS2 KITBYPASSTCRL2',
  empresa: 'ACME MEDICAL'
};

describe('descripcionDesdeMaestro', () => {
  it('con descriptorAuto y descriptorEmpresa presentes usa descriptorAuto', () => {
    expect(descripcionDesdeMaestro(ITEM)).toBe('BYPASS2 KITBYPASSTCRL2');
  });

  it('usa descriptorEmpresa solo si no hay descriptorAuto', () => {
    expect(descripcionDesdeMaestro({ ...ITEM, descriptorAuto: '' })).toBe('KITBYPASSTCRL2');
    expect(descripcionDesdeMaestro(null)).toBe('');
  });
});

describe('mapearItemMaestro (Registro, Carga Masiva y edición en Cargas)', () => {
  it('guarda descriptorAuto en "descripcion"', () => {
    expect(mapearItemMaestro(ITEM)).toEqual({
      referencia: 'KITBYPASSTCRL2',
      codigo: 'C-200',
      costo: 90000,
      descripcion: 'BYPASS2 KITBYPASSTCRL2',
      empresa: 'ACME MEDICAL'
    });
  });
});

describe('buscarItemMaestro', () => {
  const OTRO = { codigo: 'C-300', referencia: 'REF-300' };
  const codigos = [OTRO, ITEM];

  it('busca por Código interno sin distinguir mayúsculas ni espacios', () => {
    expect(buscarItemMaestro(codigos, { codigo: ' c-200 ' })).toBe(ITEM);
  });

  it('si el código no está, busca por Referencia exacta', () => {
    expect(buscarItemMaestro(codigos, { codigo: 'NO-EXISTE', referencia: 'kitbypasstcrl2' })).toBe(ITEM);
  });

  it('el código tiene prioridad sobre la referencia', () => {
    expect(buscarItemMaestro(codigos, { codigo: 'C-300', referencia: 'KITBYPASSTCRL2' })).toBe(OTRO);
  });

  it('no hace coincidencias parciales y devuelve null si no encuentra', () => {
    expect(buscarItemMaestro(codigos, { referencia: 'KITBYPASS' })).toBeNull();
    expect(buscarItemMaestro(codigos, {})).toBeNull();
    expect(buscarItemMaestro(undefined, { codigo: 'C-200' })).toBeNull();
  });
});
