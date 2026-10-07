import { describe, it, expect } from 'vitest';
import { estaExcluidoDeGuia, normalizarCodigoKit } from './exclusionKitsGuia';

describe('estaExcluidoDeGuia', () => {
  it('excluye los kits sin importar mayúsculas, espacios ni guiones', () => {
    ['KIT-MANGACRL', 'KITMANGACRL', 'KIT MANGA CRL', ' kit-manga-crl ', 'KITBYPASSTCRL2', 'kit by pass tcrl2', 'KIT MANGACRL']
      .forEach((c) => expect(estaExcluidoDeGuia(c)).toBe(true));
  });

  it('no excluye otros códigos ni valores vacíos', () => {
    ['KITBYPASSTCRL', 'KITMANGACRL3', 'PROD-A', '', null, undefined]
      .forEach((c) => expect(estaExcluidoDeGuia(c)).toBe(false));
  });

  it('normaliza códigos numéricos sin romperse', () => {
    expect(normalizarCodigoKit(1481687012)).toBe('1481687012');
  });
});
