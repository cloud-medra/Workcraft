import { describe, it, expect } from 'vitest';
import {
  claveProductoLote, esperadoDeItems, lineaDeConteo, sumarAlConteo, fijarCantidadConteo,
  compararConteo, ajustarItemsCaja, avanceInventario, CATEGORIAS
} from './inventarioFisico';

const P1 = { id: 'P1', codigo: 'C-1', referencia: 'REF-1', descriptorAuto: 'TORNILLO', precioNeto: 100 };
const P2 = { id: 'P2', codigo: 'C-2', referencia: 'REF-2', descriptorAuto: 'PLACA', precioNeto: 900 };
const item = (prod, lote, vencimiento, cantidad) => ({ codigoId: prod.id, codigo: prod.codigo, referencia: prod.referencia, tipo: prod.descriptorAuto, precio: prod.precioNeto, cantidad, lote, vencimiento });

const ITEMS = [
  item(P1, 'L1', '2026-12-31', 5),
  item(P1, 'L1', '2026-12-31', 2), // línea repetida: se suma
  item(P1, 'L2', '2027-01-31', 3),
  item(P2, 'A', '', 4),
  item(P2, 'B', '', 1),
  item(P2, 'Z', '', 0)              // en 0: no es esperado
];
const esperado = esperadoDeItems(ITEMS);
const contar = (prod, lote, venc, n) => sumarAlConteo([], lineaDeConteo(esperado, prod, { lote, vencimiento: venc }), n)[0];

describe('esperado del conteo', () => {
  it('suma líneas repetidas y omite las que están en 0', () => {
    expect(esperado.map((e) => [e.lote, e.esperado])).toEqual([['L1', 7], ['L2', 3], ['A', 4], ['B', 1]]);
  });

  it('ítems antiguos sin codigoId usan la misma clave al contarlos', () => {
    const antiguo = [{ codigo: 'C-1', referencia: 'REF-1', tipo: 'TORNILLO', cantidad: 2, lote: 'X', vencimiento: '' }];
    const esp = esperadoDeItems(antiguo);
    expect(lineaDeConteo(esp, P1, { lote: 'x' }).clave).toBe(claveProductoLote(antiguo[0]));
  });
});

describe('suma por escaneo repetido y corrección manual', () => {
  it('escanear el mismo producto y lote suma 1', () => {
    let conteo = [];
    const linea = lineaDeConteo(esperado, P1, { lote: 'L1', vencimiento: '2026-12-31' });
    conteo = sumarAlConteo(conteo, linea);
    conteo = sumarAlConteo(conteo, linea);
    conteo = sumarAlConteo(conteo, lineaDeConteo(esperado, P1, { lote: 'l1', vencimiento: '2026-12-31' }));
    expect(conteo).toHaveLength(1);
    expect(conteo[0].cantidad).toBe(3);
    conteo = sumarAlConteo(conteo, lineaDeConteo(esperado, P1, { lote: 'L2', vencimiento: '2027-01-31' }));
    expect(conteo).toHaveLength(2);
  });

  it('la cantidad se puede escribir (entero >= 0)', () => {
    const conteo = [contar(P1, 'L1', '2026-12-31', 1)];
    expect(fijarCantidadConteo(conteo, conteo[0].clave, '6').conteo[0].cantidad).toBe(6);
    expect(fijarCantidadConteo(conteo, conteo[0].clave, '0').conteo[0].cantidad).toBe(0);
    expect(fijarCantidadConteo(conteo, conteo[0].clave, '-1').error).toMatch(/entero/);
    expect(fijarCantidadConteo(conteo, conteo[0].clave, '1.5').error).toMatch(/entero/);
  });
});

describe('compararConteo (esperado vs contado)', () => {
  const conteo = [
    contar(P1, 'L1', '2026-12-31', 7),  // cuadrado
    contar(P1, 'L2', '2027-01-31', 1),  // faltante (2)
    contar(P2, 'A', '', 6),             // sobrante (+2)
    contar(P2, 'NUEVO', '2028-01-31', 3) // lote nuevo: sobrante
    // P2/B esperado 1 y no contado: no encontrado
  ];
  const { filas, totales } = compararConteo(esperado, conteo);
  const fila = (lote) => filas.find((f) => f.lote === lote);

  it('clasifica cada producto + lote + vencimiento', () => {
    expect(fila('L1')).toMatchObject({ esperado: 7, contado: 7, diferencia: 0, categoria: CATEGORIAS.CUADRADO });
    expect(fila('L2')).toMatchObject({ esperado: 3, contado: 1, diferencia: -2, categoria: CATEGORIAS.FALTANTE });
    expect(fila('A')).toMatchObject({ esperado: 4, contado: 6, diferencia: 2, categoria: CATEGORIAS.SOBRANTE });
    expect(fila('B')).toMatchObject({ esperado: 1, contado: 0, diferencia: -1, categoria: CATEGORIAS.NO_ENCONTRADO });
    expect(fila('NUEVO')).toMatchObject({ esperado: 0, contado: 3, diferencia: 3, categoria: CATEGORIAS.SOBRANTE, loteNuevo: true });
  });

  it('totales por categoría y unidades', () => {
    expect(totales).toMatchObject({
      cuadrado: 1, faltante: 1, sobrante: 2, noEncontrado: 1,
      unidadesEsperadas: 15, unidadesContadas: 17, unidadesFaltantes: 3, unidadesSobrantes: 5
    });
  });

  it('contar 0 un lote esperado es "no encontrado"', () => {
    const r = compararConteo(esperado, [contar(P2, 'B', '', 0)]);
    expect(r.filas.find((f) => f.lote === 'B').categoria).toBe(CATEGORIAS.NO_ENCONTRADO);
  });
});

describe('ajustarItemsCaja (ajuste final del stock)', () => {
  const conteo = [
    contar(P1, 'L1', '2026-12-31', 6),
    contar(P1, 'L2', '2027-01-31', 3),
    contar(P2, 'NUEVO', '2028-01-31', 2)
  ];
  const { items, ajustes } = ajustarItemsCaja(ITEMS, conteo);

  it('la cantidad queda igual a la contada: primera línea con lo contado, repetidas en 0', () => {
    expect(items[0].cantidad).toBe(6);
    expect(items[1].cantidad).toBe(0);
    expect(items[2].cantidad).toBe(3);
  });

  it('lo no contado queda en 0 (no se elimina) y los lotes nuevos se agregan', () => {
    expect(items[3].cantidad).toBe(0);
    expect(items[4].cantidad).toBe(0);
    expect(items[5].cantidad).toBe(0);
    expect(items).toHaveLength(7);
    expect(items[6]).toMatchObject({ codigoId: 'P2', lote: 'NUEVO', vencimiento: '2028-01-31', cantidad: 2, tipo: 'PLACA', precio: 900 });
  });

  it('un ajuste por clave que cambia, con anterior, nueva y diferencia', () => {
    expect(ajustes.map((a) => [a.lote, a.anterior, a.nueva, a.diferencia, a.loteNuevo])).toEqual([
      ['L1', 7, 6, -1, false],
      ['A', 4, 0, -4, false],
      ['B', 1, 0, -1, false],
      ['NUEVO', 0, 2, 2, true]
    ]);
  });

  it('no modifica el arreglo recibido', () => {
    expect(ITEMS[0].cantidad).toBe(5);
  });
});

describe('avance', () => {
  it('"X de N cajas finalizadas"', () => {
    const cajas = [{ id: 'A' }, { id: 'B' }, { id: 'C' }];
    expect(avanceInventario(cajas, [{ id: 'A', estado: 'FINALIZADA' }, { id: 'B', estado: 'EN_CONTEO' }]).texto).toBe('1 de 3 cajas finalizadas');
  });
});
