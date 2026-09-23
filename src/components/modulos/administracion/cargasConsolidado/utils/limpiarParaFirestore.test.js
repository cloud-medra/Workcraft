import { describe, it, expect } from 'vitest';
import { limpiarParaFirestore, camposUndefined } from './limpiarParaFirestore';

describe('limpiarParaFirestore', () => {
  it('omite propiedades undefined (también anidadas) y convierte undefined en arreglos a null', () => {
    const fecha = new Date(2026, 8, 23);
    const entrada = {
      numCotizacion: undefined,
      codigo: 'C-1',
      cero: 0,
      vacio: '',
      nulo: null,
      fecha,
      datosOriginales: { prevision: undefined, lote: 'L1' },
      lista: [1, undefined, { x: undefined, y: 2 }]
    };

    const salida = limpiarParaFirestore(entrada);

    expect(salida).toEqual({
      codigo: 'C-1', cero: 0, vacio: '', nulo: null, fecha,
      datosOriginales: { lote: 'L1' },
      lista: [1, null, { y: 2 }]
    });
    expect(salida.fecha).toBe(fecha);
    expect('numCotizacion' in salida).toBe(false);
  });

  it('no recorre instancias de clases (Timestamp, DocumentReference, etc.)', () => {
    class Referencia { constructor() { this.path = 'a/b'; this.opcional = undefined; } }
    const ref = new Referencia();
    expect(limpiarParaFirestore({ ref }).ref).toBe(ref);
  });

  it('camposUndefined informa la ruta de cada campo faltante', () => {
    expect(camposUndefined({ a: undefined, b: { c: undefined }, d: [undefined] })).toEqual(['a', 'b.c', 'd[0]']);
  });
});
