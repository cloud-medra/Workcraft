import { describe, it, expect } from 'vitest';
import { calcularVentaUnitaria, calcularCamposFinancieros, PORCENTAJE_RECARGO_HEMODINAMIA, buscarCodigosHemodinamia } from './cargasHelpers';

describe('recargo fijo Hemodinamia (gross-up)', () => {
  it('usa 27% por defecto', () => {
    expect(PORCENTAJE_RECARGO_HEMODINAMIA).toBe(0.27);
  });

  it('50.370 con 27% => venta 69.000 (no 63.970)', () => {
    expect(calcularVentaUnitaria(50370)).toBe(69000);
    expect(calcularVentaUnitaria(50370)).not.toBe(63970);
  });

  it('multiplica por cantidad y conserva totalItem = precio * cantidad', () => {
    const r = calcularCamposFinancieros(50370, 2);
    expect(r.venta).toBe(138000);
    expect(r.totalItem).toBe(100740);
    expect(r.recargoEncontrado).toBe(true);
  });

  it('acepta otro porcentaje y precio vacío', () => {
    expect(calcularVentaUnitaria(75, 0.25)).toBe(100);
    expect(calcularVentaUnitaria('')).toBe(0);
  });
});

describe('búsqueda de códigos de Hemodinamia', () => {
  const items = [
    { id: '1', referencia: 'CAT-100', descriptorAuto: 'Catéter guía', segmento: 'HEMODINAMIA' },
    { id: '2', referencia: 'CAT-200', descriptorAuto: 'Catéter guía otro centro', segmento: 'IMPLANTES' },
    { id: '3', referencia: 'STE-1', descriptorAuto: 'Stent coronario', segmento: 'hemodinamia' }
  ];

  it('encuentra por descripción, sin importar mayúsculas ni tildes', () => {
    expect(buscarCodigosHemodinamia(items, 'CATETER').map(i => i.id)).toEqual(['1']);
    expect(buscarCodigosHemodinamia(items, 'coronario').map(i => i.id)).toEqual(['3']);
  });

  it('encuentra por referencia', () => {
    expect(buscarCodigosHemodinamia(items, 'ste-1').map(i => i.id)).toEqual(['3']);
  });

  it('no devuelve ítems de otro centro aunque la descripción coincida', () => {
    expect(buscarCodigosHemodinamia(items, 'otro centro')).toEqual([]);
  });
});
