import { describe, it, expect } from 'vitest';
import {
  itemEsDelProducto, lotesDelProducto, sugerirLote, validarCantidadEgreso,
  agregarALista, sumarUnoPorReescaneo, cambiarCantidadLinea, quitarLinea
} from './stockProducto';

const P1 = { id: 'P1', codigo: 'C-1', referencia: 'REF-1' };
const it1 = (lote, vencimiento, cantidad, extra = {}) => ({ codigoId: 'P1', codigo: 'C-1', referencia: 'REF-1', tipo: 'TORNILLO', lote, vencimiento, cantidad, ...extra });

const CAJAS = [
  { id: 'A', nombreCaja: 'Caja A', ubicacion: 'E-1', items: [it1('L3', '2027-03-31', 4), { codigoId: 'P2', codigo: 'X', lote: 'Z', cantidad: 9 }] },
  { id: 'B', nombreCaja: 'Caja B', ubicacion: 'E-2', items: [it1('L1', '2026-11-30', 2), it1('L0', '', 7), it1('L9', '2026-01-31', 0)] },
  { id: 'C', nombreCaja: 'Caja C', items: [it1('L1', '2026-12-31', 5)] }
];

describe('lotesDelProducto', () => {
  it('lista dónde hay stock del producto (sin lotes en 0 ni otros productos), en orden FEFO', () => {
    const lotes = lotesDelProducto(CAJAS, P1);
    expect(lotes.map((l) => `${l.nombreCaja}/${l.item.lote}`)).toEqual(['Caja B/L1', 'Caja C/L1', 'Caja A/L3', 'Caja B/L0']);
    expect(lotes[0]).toMatchObject({ cajaId: 'B', ubicacion: 'E-2', itemIndex: 0, stock: 2, disponible: 2 });
  });

  it('descuenta lo que ya está en la lista', () => {
    const lista = [{ cajaId: 'B', itemIndex: 0, cantidadRetirar: 2 }];
    expect(lotesDelProducto(CAJAS, P1, lista)[0]).toMatchObject({ enLista: 2, disponible: 0 });
  });

  it('ítems antiguos sin codigoId se reconocen por código interno', () => {
    expect(itemEsDelProducto({ codigo: 'C-1' }, P1)).toBe(true);
    expect(itemEsDelProducto({ codigoId: 'P2', codigo: 'C-1' }, P1)).toBe(false);
  });
});

describe('sugerirLote', () => {
  it('FEFO: sugiere el que vence primero si la lectura no trae lote', () => {
    const { lote, motivo } = sugerirLote(lotesDelProducto(CAJAS, P1));
    expect(motivo).toBe('fefo');
    expect(lote).toMatchObject({ cajaId: 'B', item: { lote: 'L1', vencimiento: '2026-11-30' } });
  });

  it('FEFO salta los lotes sin disponible', () => {
    const lista = [{ cajaId: 'B', itemIndex: 0, cantidadRetirar: 2 }];
    expect(sugerirLote(lotesDelProducto(CAJAS, P1, lista)).lote.cajaId).toBe('C');
  });

  it('GS1: preselecciona el lote del código (y su vencimiento si viene)', () => {
    const lotes = lotesDelProducto(CAJAS, P1);
    expect(sugerirLote(lotes, { lote: 'l3' })).toMatchObject({ motivo: 'gs1', lote: { cajaId: 'A' } });
    expect(sugerirLote(lotes, { lote: 'L1', vencimiento: '2026-12-31' })).toMatchObject({ motivo: 'gs1', lote: { cajaId: 'C' } });
  });

  it('GS1 con un lote sin stock: avisa y sugiere FEFO', () => {
    const res = sugerirLote(lotesDelProducto(CAJAS, P1), { lote: 'NOEXISTE' });
    expect(res.motivo).toBe('fefo');
    expect(res.aviso).toMatch(/NOEXISTE/);
  });

  it('sin stock: no sugiere nada', () => {
    expect(sugerirLote(lotesDelProducto(CAJAS, { id: 'P3' }))).toEqual({ lote: null, motivo: null, aviso: '' });
  });
});

describe('cantidad y lista de egreso', () => {
  const lotes = lotesDelProducto(CAJAS, P1);
  const loteB = lotes[0]; // Caja B / L1, 2 disponibles

  it('no deja egresar más de lo disponible en ese lote y caja', () => {
    expect(validarCantidadEgreso(3, 2)).toMatch(/supera el stock disponible.*2 disp/);
    expect(validarCantidadEgreso(0, 2)).toMatch(/mayor a cero/);
    expect(validarCantidadEgreso(1.5, 2)).toMatch(/entera/);
    expect(validarCantidadEgreso(2, 2)).toBe('');
    const { lista, error } = agregarALista([], loteB, 3, P1);
    expect(error).toMatch(/supera/);
    expect(lista).toEqual([]);
  });

  it('agrega con la forma del traspaso y suma si es la misma caja/lote', () => {
    let { lista } = agregarALista([], loteB, 1, P1);
    expect(lista[0]).toMatchObject({ cajaId: 'B', nombreCaja: 'Caja B', ubicacionOrigen: 'E-2', itemIndex: 0, cantidadRetirar: 1, productoId: 'P1', itemOriginal: { lote: 'L1' } });
    const loteActualizado = lotesDelProducto(CAJAS, P1, lista)[0];
    ({ lista } = agregarALista(lista, loteActualizado, 1, P1));
    expect(lista).toHaveLength(1);
    expect(lista[0].cantidadRetirar).toBe(2);
  });

  it('reescanear el mismo producto suma 1 sin superar el disponible', () => {
    const stock = () => 2;
    const { lista } = agregarALista([], loteB, 1, P1);
    const r1 = sumarUnoPorReescaneo(lista, 'P1', {}, stock);
    expect(r1.error).toBe('');
    expect(r1.lista[0].cantidadRetirar).toBe(2);
    const r2 = sumarUnoPorReescaneo(r1.lista, 'P1', {}, stock);
    expect(r2.error).toMatch(/No hay más stock/);
    expect(r2.lista[0].cantidadRetirar).toBe(2);
  });

  it('reescaneo con lote GS1: suma a ese lote; otro lote u otro producto no es reescaneo', () => {
    const { lista } = agregarALista([], loteB, 1, P1);
    expect(sumarUnoPorReescaneo(lista, 'P1', { lote: 'l1' }).lista[0].cantidadRetirar).toBe(2);
    expect(sumarUnoPorReescaneo(lista, 'P1', { lote: 'L3' })).toBeNull();
    expect(sumarUnoPorReescaneo(lista, 'P2')).toBeNull();
  });

  it('editar cantidad (con tope de stock) y quitar ítems', () => {
    const { lista } = agregarALista([], loteB, 1, P1);
    expect(cambiarCantidadLinea(lista, lista[0].idTemp, 2, 2).lista[0].cantidadRetirar).toBe(2);
    expect(cambiarCantidadLinea(lista, lista[0].idTemp, 5, 2).error).toMatch(/supera/);
    expect(quitarLinea(lista, lista[0].idTemp)).toEqual([]);
  });
});
