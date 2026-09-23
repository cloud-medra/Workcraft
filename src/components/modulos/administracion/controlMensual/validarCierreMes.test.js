import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { validarCierreMes, MENSAJE_MES_NO_COINCIDE } from './validarCierreMes';
import { MESES } from './constants';

// El backend (functions/, CommonJS) tiene su propia copia del validador.
const require = createRequire(import.meta.url);
const backend = require('../../../../../functions/validarCierreMes.js');

const CASOS = [
  // [anioIngresado, mesIngresado, esperado]
  ['2026', '09', true],
  ['2026', '9', true],
  [' 2026 ', ' 09 ', true],
  ['2025', '09', false],
  ['2026', '10', false],
  ['2026', '009', false],
  ['26', '09', false],
  ['2026', '', false],
  ['', '09', false],
  ['2026', 'septiembre', false],
  ['2026', '9.0', false],
  [undefined, undefined, false]
];

describe('validarCierreMes (cierre de Septiembre 2026)', () => {
  it.each(CASOS)('año "%s" / mes "%s" → %s', (anioIngresado, mesIngresado, esperado) => {
    const r = validarCierreMes({ anio: '2026', mesId: 'septiembre', anioIngresado, mesIngresado });
    expect(r.ok).toBe(esperado);
    if (!esperado) expect(r.mensaje).toBe(MENSAJE_MES_NO_COINCIDE);
  });

  it('acepta el número de cada mes con y sin cero a la izquierda', () => {
    MESES.forEach(m => {
      expect(validarCierreMes({ anio: '2026', mesId: m.id, anioIngresado: '2026', mesIngresado: String(m.num) }).ok).toBe(true);
      expect(validarCierreMes({ anio: '2026', mesId: m.id, anioIngresado: '2026', mesIngresado: String(m.num).padStart(2, '0') }).ok).toBe(true);
    });
  });

  it('rechaza un mes de período desconocido', () => {
    expect(validarCierreMes({ anio: '2026', mesId: 'xx', anioIngresado: '2026', mesIngresado: '09' }).ok).toBe(false);
  });

  it('la copia del backend da exactamente el mismo resultado que la del frontend', () => {
    expect(backend.MENSAJE_MES_NO_COINCIDE).toBe(MENSAJE_MES_NO_COINCIDE);
    expect(backend.MESES).toEqual(MESES);
    MESES.forEach(m => {
      CASOS.forEach(([anioIngresado, mesIngresado]) => {
        const args = { anio: '2026', mesId: m.id, anioIngresado, mesIngresado };
        expect(backend.validarCierreMes(args)).toEqual(validarCierreMes(args));
      });
    });
  });
});
