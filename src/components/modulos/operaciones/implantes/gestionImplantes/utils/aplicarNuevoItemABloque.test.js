import { describe, it, expect } from 'vitest';
import { aplicarNuevoItemABloque } from './aplicarNuevoItemABloque';

const bloqueVacio = () => ({ costo: 0, cotizaciones: [] });

describe('aplicarNuevoItemABloque', () => {
  it('PAD principal con cotización X y su contenido con cotización Y distinta no se mezclan', () => {
    let bloque = bloqueVacio();

    // Referencia principal PAD, cotización 150230
    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'pad_1',
      esPad: true,
      numCotizacion: '150230',
      totalCotizacion: 100000,
      referencia: 'Kit PAD',
      cantidad: 1
    });

    // Contenido del PAD, con su propia cotización 999888 (distinta a la del padre)
    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'contenido_1',
      padPadreId: 'pad_1',
      numCotizacion: '999888',
      totalCotizacion: 0,
      referencia: 'Tornillo interno',
      cantidad: 4
    });

    const cot = bloque.cotizaciones[0];

    // El numCotizacion "de grupo" (usado en el header de la cotización,
    // Detallestab y SolicitudImplantes) sigue siendo el de la referencia
    // PAD principal, no el del contenido.
    expect(cot.numCotizacion).toBe('150230');

    const itemPrincipal = cot.items.find(it => it.id === 'pad_1');
    const itemContenido = cot.items.find(it => it.id === 'contenido_1');

    // Cada ítem guarda su propio numCotizacion de forma independiente.
    expect(itemPrincipal.numCotizacion).toBe('150230');
    expect(itemContenido.numCotizacion).toBe('999888');
    expect(itemContenido.numCotizacion).not.toBe(itemPrincipal.numCotizacion);
  });

  it('si el contenido del PAD deja la cotización en blanco, hereda la del padre (comportamiento esperado, no el bug)', () => {
    let bloque = bloqueVacio();

    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'pad_2',
      esPad: true,
      numCotizacion: 'COT-100',
      totalCotizacion: 50000,
      referencia: 'Kit PAD 2',
      cantidad: 1
    });

    // Cargastab.jsx resuelve numCotContenido = numCotizacionPad || numCotizacion del padre
    // antes de llamar acá; simulamos ese mismo valor heredado.
    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'contenido_2',
      padPadreId: 'pad_2',
      numCotizacion: 'COT-100',
      totalCotizacion: 0,
      referencia: 'Pieza interna',
      cantidad: 2
    });

    const cot = bloque.cotizaciones[0];
    expect(cot.numCotizacion).toBe('COT-100');
    expect(cot.items.find(it => it.id === 'contenido_2').numCotizacion).toBe('COT-100');
  });

  it('un ítem normal (no PAD) posterior sí puede actualizar la cotización del grupo', () => {
    let bloque = bloqueVacio();

    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'item_1',
      numCotizacion: 'COT-A',
      totalCotizacion: 1000,
      referencia: 'Referencia normal',
      cantidad: 1
    });

    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'item_2',
      numCotizacion: 'COT-B',
      totalCotizacion: 0,
      referencia: 'Otra referencia normal',
      cantidad: 1
    });

    // Comportamiento previo preservado: entre ítems normales (sin PAD), el
    // último numCotizacion no vacío sigue definiendo el de grupo.
    expect(bloque.cotizaciones[0].numCotizacion).toBe('COT-B');
    expect(bloque.cotizaciones[0].items[0].numCotizacion).toBe('COT-A');
    expect(bloque.cotizaciones[0].items[1].numCotizacion).toBe('COT-B');
  });

  it('referencia normal con lotes adicionales: la principal factura la cantidad total y los lotes quedan sin costo ni número propio de cotización', () => {
    let bloque = bloqueVacio();

    // Referencia principal: cantidad TOTAL = 4, factura normalmente.
    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'ref_1',
      numCotizacion: 'COT-500',
      totalCotizacion: 200000,
      referencia: 'Tornillo 4.5mm',
      cantidad: 4,
      lote: 'L-100',
      precio: 1000,
      venta: 4000,
      totalItem: 4000
    });

    // Dos lotes adicionales (2 + 1), sin costo, sin numCotizacion propio.
    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'lote_1a',
      lotePadreId: 'ref_1',
      numCotizacion: 'COT-500',
      totalCotizacion: 0,
      referencia: 'Tornillo 4.5mm',
      cantidad: 2,
      lote: 'L-200',
      precio: 0,
      venta: 0,
      totalItem: 0
    });

    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'lote_1b',
      lotePadreId: 'ref_1',
      numCotizacion: 'COT-500',
      totalCotizacion: 0,
      referencia: 'Tornillo 4.5mm',
      cantidad: 1,
      lote: 'L-300',
      precio: 0,
      venta: 0,
      totalItem: 0
    });

    const cot = bloque.cotizaciones[0];
    const principal = cot.items.find(it => it.id === 'ref_1');
    const lote1 = cot.items.find(it => it.id === 'lote_1a');
    const lote2 = cot.items.find(it => it.id === 'lote_1b');

    // La principal sigue facturando la cantidad TOTAL original, sin reducirse.
    expect(principal.cantidad).toBe(4);
    expect(principal.venta).toBe(4000);

    // Los lotes adicionales no tienen costo propio.
    expect(lote1.precio).toBe(0);
    expect(lote1.venta).toBe(0);
    expect(lote2.precio).toBe(0);
    expect(lote2.venta).toBe(0);

    // La cantidad de los lotes adicionales suma correctamente contra el total.
    expect(lote1.cantidad + lote2.cantidad).toBeLessThanOrEqual(principal.cantidad);
    expect(principal.cantidad - (lote1.cantidad + lote2.cantidad)).toBe(1); // queda 1 en el lote original

    // El numCotizacion de grupo no se ve afectado por los lotes hijos.
    expect(cot.numCotizacion).toBe('COT-500');
  });

  it('varias líneas de contenido de PAD con cotizaciones propias distintas quedan todas guardadas sin pisarse entre sí', () => {
    let bloque = bloqueVacio();

    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'pad_3',
      esPad: true,
      numCotizacion: 'COT-PADRE',
      totalCotizacion: 20000,
      referencia: 'Kit PAD 3',
      cantidad: 1
    });

    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'contenido_3a',
      padPadreId: 'pad_3',
      numCotizacion: 'COT-HIJO-1',
      totalCotizacion: 0,
      referencia: 'Pieza A',
      cantidad: 1
    });

    bloque = aplicarNuevoItemABloque(bloque, {
      id: 'contenido_3b',
      padPadreId: 'pad_3',
      numCotizacion: 'COT-HIJO-2',
      totalCotizacion: 0,
      referencia: 'Pieza B',
      cantidad: 1
    });

    const cot = bloque.cotizaciones[0];
    expect(cot.numCotizacion).toBe('COT-PADRE');
    expect(cot.items.find(it => it.id === 'contenido_3a').numCotizacion).toBe('COT-HIJO-1');
    expect(cot.items.find(it => it.id === 'contenido_3b').numCotizacion).toBe('COT-HIJO-2');
  });
});
