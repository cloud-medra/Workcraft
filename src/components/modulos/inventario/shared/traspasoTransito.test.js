import { describe, it, expect } from 'vitest';
import { aplicarRetirosACaja, mismoItem, validarDatosTraspaso, siguienteNumeroDocumento, agruparLineasPorCaja } from './traspasoTransito';

const ITEM = { codigo: 'C-1', referencia: 'REF-1', lote: 'L1', vencimiento: '2026-12-31', cantidad: 5 };
const linea = (extra = {}) => ({ cajaId: 'A', nombreCaja: 'Caja A', itemIndex: 0, cantidadRetirar: 2, itemOriginal: { ...ITEM }, ...extra });

describe('aplicarRetirosACaja', () => {
  it('descuenta sobre los ítems actuales sin modificar el original', () => {
    const items = [{ ...ITEM }];
    expect(aplicarRetirosACaja(items, [linea()])[0].cantidad).toBe(3);
    expect(items[0].cantidad).toBe(5);
  });

  it('stock cambiado: si ya no alcanza, cancela y dice qué ítem falló', () => {
    expect(() => aplicarRetirosACaja([{ ...ITEM, cantidad: 1 }], [linea()]))
      .toThrow('Stock insuficiente en Caja A (REF-1): quedan 1.');
  });

  it('ítem cambiado en esa posición (otro lote): cancela', () => {
    expect(() => aplicarRetirosACaja([{ ...ITEM, lote: 'OTRO' }], [linea()])).toThrow(/Caja A cambió/);
    expect(mismoItem(undefined, ITEM)).toBe(false);
  });
});

describe('datos del traspaso', () => {
  it('mismas validaciones que Egresos', () => {
    expect(validarDatosTraspaso({ lineas: [], numeroDocumento: '260001', tipoDestino: 'stock' })).toMatch(/vacía/);
    expect(validarDatosTraspaso({ lineas: [linea()], numeroDocumento: '', tipoDestino: 'stock' })).toMatch(/número de documento/);
    expect(validarDatosTraspaso({ lineas: [linea()], numeroDocumento: '260001', tipoDestino: '' })).toMatch(/destino/);
    expect(validarDatosTraspaso({ lineas: [linea()], numeroDocumento: '260001', tipoDestino: 'cliente' })).toBe('');
  });

  it('correlativo YYNNNN', () => {
    const fecha = new Date(2026, 9, 6);
    expect(siguienteNumeroDocumento('', fecha)).toBe('260001');
    expect(siguienteNumeroDocumento('260041', fecha)).toBe('260042');
    expect(siguienteNumeroDocumento('259999', fecha)).toBe('260001');
  });

  it('agrupa por caja', () => {
    expect(Object.keys(agruparLineasPorCaja([linea(), linea({ cajaId: 'B' }), linea()]))).toEqual(['A', 'B']);
  });
});
