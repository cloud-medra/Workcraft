import { describe, it, expect } from 'vitest';
import { esCodigoActivo } from './useAutocompleteReferencia';

describe('esCodigoActivo — sugerencias de Referencia en Cargas (Implantes)', () => {
  it('trata como activo al código sin campo estado o con ACTIVO', () => {
    expect(esCodigoActivo({ referencia: 'A' })).toBe(true);
    expect(esCodigoActivo({ referencia: 'A', estado: 'ACTIVO' })).toBe(true);
    expect(esCodigoActivo({ referencia: 'A', estado: '' })).toBe(true);
  });

  it('excluye los códigos INACTIVO (sin importar mayúsculas/espacios)', () => {
    expect(esCodigoActivo({ referencia: 'A', estado: 'INACTIVO' })).toBe(false);
    expect(esCodigoActivo({ referencia: 'A', estado: ' inactivo ' })).toBe(false);
  });
});
