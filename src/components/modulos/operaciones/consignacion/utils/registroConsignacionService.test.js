import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  writeBatch: vi.fn(),
  runTransaction: vi.fn(async (_db, fn) => fn(globalThis.__txFalsa)),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'TS')
}));

import {
  descripcionDesdeMaestro, mapearItemMaestro, buscarItemMaestro,
  esRegistroEditable, mensajeRegistroNoEditable, guardarEdicionRegistroConsignacion, RegistroNoEditableError
} from './registroConsignacionService';

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

describe('esRegistroEditable (solo INGRESADO)', () => {
  it('INGRESADO o sin estado → editable', () => {
    expect(esRegistroEditable({ estado: 'INGRESADO' })).toBe(true);
    expect(esRegistroEditable({ estado: ' ingresado ' })).toBe(true);
    expect(esRegistroEditable({})).toBe(true);
  });
  it('CARGADO, SOLICITADO y cualquier estado nuevo → no editable', () => {
    ['CARGADO', 'SOLICITADO', 'PENDIENTE', 'REVISAR', 'ANULADO_FUTURO'].forEach(estado =>
      expect(esRegistroEditable({ estado })).toBe(false));
  });
  it('el mensaje nombra el estado actual', () => {
    expect(mensajeRegistroNoEditable({ estado: 'solicitado' })).toContain('SOLICITADO');
  });
});

describe('guardarEdicionRegistroConsignacion (revalida en Firestore)', () => {
  const crearTx = (datosActuales) => ({
    get: vi.fn(async () => ({ exists: () => datosActuales !== null, data: () => datosActuales })),
    update: vi.fn(),
    set: vi.fn(),
    delete: vi.fn()
  });
  const registro = { id: 'r1', ref: { id: 'r1' } };
  const claves = { anio: '2026', nombreMes: 'octubre', dia: '08' };

  it('rechaza si en Firestore ya está SOLICITADO, aunque la pantalla diga INGRESADO', async () => {
    globalThis.__txFalsa = crearTx({ estado: 'SOLICITADO', fecha: '2026-10-08' });
    await expect(guardarEdicionRegistroConsignacion({}, { ...registro, estado: 'INGRESADO' }, {}, claves, null))
      .rejects.toBeInstanceOf(RegistroNoEditableError);
    expect(globalThis.__txFalsa.update).not.toHaveBeenCalled();
  });

  it('rechaza si el registro ya no existe', async () => {
    globalThis.__txFalsa = crearTx(null);
    await expect(guardarEdicionRegistroConsignacion({}, registro, {}, claves, null))
      .rejects.toBeInstanceOf(RegistroNoEditableError);
  });

  it('INGRESADO y misma fecha → update en el mismo documento', async () => {
    globalThis.__txFalsa = crearTx({ estado: 'INGRESADO', fecha: '2026-10-08' });
    const res = await guardarEdicionRegistroConsignacion({}, registro, { cantidad: 2 }, claves, null);
    expect(globalThis.__txFalsa.update).toHaveBeenCalledWith(registro.ref, { cantidad: 2 });
    expect(res.movido).toBe(false);
  });
});
