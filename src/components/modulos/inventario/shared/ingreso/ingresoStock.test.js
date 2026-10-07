import { describe, it, expect } from 'vitest';
import {
  validarIngresoStock, datosProductoIngreso, itemsParaGuardar, claveDocumentoIngreso, idDocumentoIngreso,
  esMismoDocumentoIngreso, variantesGuia, mensajeIngresoDuplicado, construirRegistroIngreso, cabeceraVaciaIngreso
} from './ingresoStock';

const CAB = { ...cabeceraVaciaIngreso(), numeroGuiaFactura: 'F-100', numeroOrden: 'OC-1', empresa: 'Acme', empresaId: 'E1', nombreCaja: 'Caja 1' };
const ITEM = { codigoId: 'P1', codigo: 'C-1', referencia: 'REF', descripcion: 'TORNILLO', precio: 10, cantidad: 2, lote: 'L1', vencimiento: '' };

describe('validarIngresoStock (mismas reglas que Ingresos)', () => {
  it('exige guía, caja, al menos un ítem, producto y cantidad > 0', () => {
    expect(validarIngresoStock({ ...CAB, numeroGuiaFactura: '  ' }, [ITEM])).toBe('El número de Guía o Factura es obligatorio');
    expect(validarIngresoStock({ ...CAB, nombreCaja: '' }, [ITEM])).toBe('El nombre de la caja destino es obligatorio');
    expect(validarIngresoStock(CAB, [])).toBe('Debe ingresar al menos una referencia');
    expect(validarIngresoStock(CAB, [{ ...ITEM, codigoId: '' }])).toMatch(/referencia seleccionada/);
    expect(validarIngresoStock(CAB, [{ ...ITEM, cantidad: 0 }])).toMatch(/cantidad mayor a cero/);
    expect(validarIngresoStock(CAB, [ITEM])).toBe('');
  });
});

describe('datos del ítem', () => {
  it('toma los datos del maestro como Ingresos y guarda tipo = descripcion', () => {
    expect(datosProductoIngreso({ id: 'P1', codigo: 'C', referencia: 'R', descriptorAuto: 'D', precioNeto: '5' }))
      .toEqual({ codigoId: 'P1', codigo: 'C', referencia: 'R', descripcion: 'D', precio: 5 });
    expect(itemsParaGuardar([ITEM])[0]).toMatchObject({ descripcion: 'TORNILLO', tipo: 'TORNILLO' });
  });

  it('el registro tiene la misma estructura que Ingresos', () => {
    const r = construirRegistroIngreso({ cabecera: CAB, items: [ITEM], usuario: { nombreCompleto: 'Ana' } });
    expect(r).toMatchObject({ tipoRegistro: 'INGRESO_STOCK', numeroGuiaFactura: 'F-100', numeroOrden: 'OC-1', empresaId: 'E1', nombreCaja: 'Caja 1', registradoPor: 'Ana' });
    expect(r).not.toHaveProperty('origen');
    expect(construirRegistroIngreso({ cabecera: CAB, items: [ITEM], origen: 'X' }).origen).toBe('X');
  });
});

describe('documento duplicado: empresa + guía + OC', () => {
  it('misma guía y misma OC (sin distinguir mayúsculas ni espacios) es el mismo documento', () => {
    expect(claveDocumentoIngreso({ ...CAB, numeroGuiaFactura: ' f-100 ', numeroOrden: 'oc-1' })).toBe(claveDocumentoIngreso(CAB));
    expect(esMismoDocumentoIngreso({ tipoRegistro: 'INGRESO_STOCK', numeroGuiaFactura: 'f-100 ', numeroOrden: 'OC-1', empresaId: 'E1' }, CAB)).toBe(true);
  });

  it('misma guía con otra OC, otra guía con la misma OC u otra empresa son documentos distintos', () => {
    const reg = { tipoRegistro: 'INGRESO_STOCK', numeroGuiaFactura: 'F-100', numeroOrden: 'OC-1', empresaId: 'E1', empresa: 'Acme' };
    expect(esMismoDocumentoIngreso(reg, { ...CAB, numeroOrden: 'OC-2' })).toBe(false);
    expect(esMismoDocumentoIngreso(reg, { ...CAB, numeroGuiaFactura: 'F-101' })).toBe(false);
    expect(esMismoDocumentoIngreso(reg, { ...CAB, empresaId: 'E2' })).toBe(false);
    expect(claveDocumentoIngreso({ ...CAB, numeroOrden: 'OC-2' })).not.toBe(claveDocumentoIngreso(CAB));
  });

  it('sin id de empresa compara por nombre; ignora registros que no son ingresos', () => {
    const reg = { tipoRegistro: 'INGRESO_STOCK', numeroGuiaFactura: 'F-100', numeroOrden: 'OC-1', empresa: 'ACME ' };
    expect(esMismoDocumentoIngreso(reg, { ...CAB, empresaId: '' })).toBe(true);
    expect(esMismoDocumentoIngreso({ ...reg, tipoRegistro: undefined }, { ...CAB, empresaId: '' })).toBe(false);
  });

  it('el id es válido en Firestore y las variantes cubren registros sin normalizar', () => {
    expect(idDocumentoIngreso({ ...CAB, numeroGuiaFactura: 'A/B.1' })).not.toMatch(/[/.]/);
    expect(variantesGuia(' f-1 ')).toEqual([' f-1 ', 'f-1', 'F-1']);
  });

  it('el mensaje indica fecha y usuario del ingreso anterior', () => {
    const msg = mensajeIngresoDuplicado(CAB, { fecha: new Date(2026, 9, 7, 9, 5), usuario: 'Ana' });
    expect(msg).toBe('La guía/factura F-100 con la OC OC-1 de Acme ya fue ingresada el 07-10-2026 09:05 por Ana.');
    expect(mensajeIngresoDuplicado({ ...CAB, numeroOrden: '' }, { fecha: { toDate: () => new Date(2026, 0, 2, 3, 4) } }))
      .toBe('La guía/factura F-100 sin OC de Acme ya fue ingresada el 02-01-2026 03:04 por usuario desconocido.');
  });
});
