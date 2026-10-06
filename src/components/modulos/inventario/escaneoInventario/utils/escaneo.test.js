import { describe, it, expect } from 'vitest';
import { esTeclaFinEscaneo, normalizarCodigoLeido, interpretarLectura } from './escaneo';

describe('esTeclaFinEscaneo', () => {
  it('Enter (y NumpadEnter / Tab como sufijo) cierran la lectura', () => {
    expect(esTeclaFinEscaneo({ key: 'Enter' })).toBe(true);
    expect(esTeclaFinEscaneo({ key: 'NumpadEnter' })).toBe(true);
    expect(esTeclaFinEscaneo({ key: 'Tab' })).toBe(true);
    expect(esTeclaFinEscaneo({ key: 'A' })).toBe(false);
    expect(esTeclaFinEscaneo({ key: '1' })).toBe(false);
  });
});

describe('interpretarLectura', () => {
  it('código normal: la clave del vínculo es el propio código, sin espacios ni controles', () => {
    expect(normalizarCodigoLeido('  7801234567894\r\n')).toBe('7801234567894');
    expect(interpretarLectura(' 7801234567894 ')).toMatchObject({ codigo: '7801234567894', clave: '7801234567894' });
  });

  it('GS1: la clave del vínculo es el GTIN (lote/vencimiento cambian entre unidades)', () => {
    const a = interpretarLectura('(01)07612345678900(17)261231(10)A1');
    const b = interpretarLectura('(01)07612345678900(17)270131(10)B2');
    expect(a.clave).toBe('07612345678900');
    expect(b.clave).toBe(a.clave);
    expect(a.gs1).toMatchObject({ lote: 'A1', vencimiento: '2026-12-31' });
  });

  it('vacío no es una lectura', () => {
    expect(interpretarLectura('   ')).toBeNull();
  });
});
