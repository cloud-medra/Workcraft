import { describe, it, expect } from 'vitest';
import { construirItemDesdeProducto, validarItem, agregarItemACaja, etiquetaCaja } from './itemsCaja';

const PRODUCTO = { id: 'P1', codigo: 'C-1', referencia: 'REF-1', descriptorAuto: 'TORNILLO 3.5', precioNeto: 1200 };

describe('construirItemDesdeProducto', () => {
  it('usa la estructura de Stock General', () => {
    expect(construirItemDesdeProducto(PRODUCTO, { cantidad: 3, lote: ' L1 ', vencimiento: '2026-12-31' })).toEqual({
      codigoId: 'P1', codigo: 'C-1', referencia: 'REF-1', tipo: 'TORNILLO 3.5', precio: 1200, cantidad: 3, lote: 'L1', vencimiento: '2026-12-31'
    });
  });

  it('valida descriptor y cantidad entera mayor a cero', () => {
    expect(validarItem(construirItemDesdeProducto(PRODUCTO, { cantidad: 1 }))).toBe('');
    expect(validarItem(construirItemDesdeProducto(PRODUCTO, { cantidad: 0 }))).toMatch(/cantidad/);
    expect(validarItem(construirItemDesdeProducto(PRODUCTO, { cantidad: 1.5 }))).toMatch(/cantidad/);
    expect(validarItem(construirItemDesdeProducto({ id: 'X' }, { cantidad: 1 }))).toMatch(/descriptor/);
  });
});

describe('agregarItemACaja', () => {
  const item = construirItemDesdeProducto(PRODUCTO, { cantidad: 2, lote: 'L1', vencimiento: '2026-12-31' });

  it('mismo producto, lote y vencimiento: suma la cantidad', () => {
    const items = [{ ...item, lote: 'l1', cantidad: 5 }];
    const res = agregarItemACaja(items, item);
    expect(res).toMatchObject({ sumado: true, indice: 0 });
    expect(res.items[0].cantidad).toBe(7);
    expect(items[0].cantidad).toBe(5);
  });

  it('otro lote o vencimiento: agrega una línea nueva', () => {
    const items = [{ ...item, lote: 'L2' }, { ...item, vencimiento: '2027-01-31' }];
    const res = agregarItemACaja(items, item);
    expect(res).toMatchObject({ sumado: false, indice: 2 });
    expect(res.items).toHaveLength(3);
  });

  it('etiqueta "nombre — ubicación"', () => {
    expect(etiquetaCaja({ nombreCaja: 'Caja 1', ubicacion: 'Estante A' })).toBe('Caja 1 — Estante A');
    expect(etiquetaCaja({ nombreCaja: 'Caja 2' })).toBe('Caja 2');
  });
});
