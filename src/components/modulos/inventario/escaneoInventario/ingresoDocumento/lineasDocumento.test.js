import { describe, it, expect } from 'vitest';
import { nuevaLinea, indiceLineaIgual, sumarALinea, cambiarCantidadLinea, quitarLinea, totalUnidades } from './lineasDocumento';

const ITEM = { codigoId: 'P1', codigo: 'C-1', referencia: 'R', descripcion: 'D', precio: 0, cantidad: 2, lote: 'L1', vencimiento: '2026-12-31' };

describe('líneas del documento escaneado', () => {
  it('reconoce la misma línea por producto + lote + vencimiento (lote sin distinguir mayúsculas)', () => {
    const lineas = [nuevaLinea({ id: 'P1' }, ITEM, [])];
    expect(indiceLineaIgual(lineas, { ...ITEM, lote: 'l1' })).toBe(0);
    expect(indiceLineaIgual(lineas, { ...ITEM, lote: 'L2' })).toBe(-1);
    expect(indiceLineaIgual(lineas, { ...ITEM, codigoId: 'P2' })).toBe(-1);
  });

  it('sumar acumula la cantidad y une los códigos sin repetir', () => {
    const lineas = [nuevaLinea({ id: 'P1' }, ITEM, [{ clave: 'A', codigo: 'A' }])];
    const res = sumarALinea(lineas, 0, { ...ITEM, cantidad: 3 }, [{ clave: 'A', codigo: 'A' }, { clave: 'B', codigo: 'B' }]);
    expect(res[0].item.cantidad).toBe(5);
    expect(res[0].codigos.map((c) => c.clave)).toEqual(['A', 'B']);
    expect(lineas[0].item.cantidad).toBe(2);
  });

  it('editar cantidad, quitar y total de unidades', () => {
    const a = nuevaLinea({ id: 'P1' }, ITEM, []);
    const b = nuevaLinea({ id: 'P1' }, { ...ITEM, lote: 'L2', cantidad: 4 }, []);
    expect(a.id).not.toBe(b.id);
    const editadas = cambiarCantidadLinea([a, b], a.id, 10);
    expect(totalUnidades(editadas)).toBe(14);
    expect(quitarLinea(editadas, a.id)).toHaveLength(1);
  });
});
