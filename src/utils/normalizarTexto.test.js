import { describe, it, expect } from 'vitest';
import { normalizarTexto, incluyeTexto } from './normalizarTexto';

describe('normalizarTexto', () => {
  it('quita tildes, pasa a minúsculas y recorta', () => {
    expect(normalizarTexto('  Descripción ÁRTICULO ')).toBe('descripcion articulo');
    expect(normalizarTexto(null)).toBe('');
    expect(normalizarTexto(12345)).toBe('12345');
  });

  it('incluyeTexto ignora mayúsculas y tildes; búsqueda vacía siempre coincide', () => {
    expect(incluyeTexto('Jeringa Médica', 'medica')).toBe(true);
    expect(incluyeTexto('Jeringa', 'MÉD')).toBe(false);
    expect(incluyeTexto(undefined, '')).toBe(true);
  });
});
