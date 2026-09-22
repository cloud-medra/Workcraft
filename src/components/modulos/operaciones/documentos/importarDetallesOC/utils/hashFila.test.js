// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { calcularHashFila, CAMPOS_HASH } from './hashFila';

const filaBase = () => ({
  id: '1001', admision: '500100', proveedor: 'Arthrex Chile SpA', fecha_cx: new Date(2026, 8, 20),
  paciente: 'Juan Pérez', medico: 'Dr. Soto', codigo: 'COD-1', descripcion: 'Placa', cantidad: 2, precio_u: 1000, atributo: 'A1',
  oc: '', oc_monto: 0, estado: 'PENDIENTE',
  fecha_recepcion: null, fecha_cargo: null,
  numero_guia: '', numero_factura: '',
  fecha_emision: null, fecha_ingreso: null,
  lote: '', fecha_vencimiento: null
});

describe('calcularHashFila', () => {
  it('incluye los 18 campos esperados (estado/seguimiento + identidad editable, sin los de ruta)', () => {
    expect(CAMPOS_HASH).toHaveLength(18);
    ['id', 'admision', 'proveedor', 'fecha_cx'].forEach(campoDeRuta => {
      expect(CAMPOS_HASH).not.toContain(campoDeRuta);
    });
    ['oc', 'oc_monto', 'estado', 'fecha_recepcion', 'fecha_cargo', 'numero_guia', 'numero_factura', 'fecha_emision', 'fecha_ingreso', 'lote', 'fecha_vencimiento'].forEach(campo => {
      expect(CAMPOS_HASH).toContain(campo);
    });
    ['paciente', 'medico', 'codigo', 'descripcion', 'cantidad', 'precio_u', 'atributo'].forEach(campo => {
      expect(CAMPOS_HASH).toContain(campo);
    });
  });

  it('es determinístico: la misma fila da siempre el mismo hash', async () => {
    const h1 = await calcularHashFila(filaBase());
    const h2 = await calcularHashFila(filaBase());
    expect(h1).toBe(h2);
    expect(h1).toHaveLength(16);
  });

  it('cambia si se llena un campo de seguimiento (ej. OC antes vacío)', async () => {
    const antes = await calcularHashFila(filaBase());
    const despues = await calcularHashFila({ ...filaBase(), oc: 'OC-12345' });
    expect(despues).not.toBe(antes);
  });

  it('cambia si se corrige un campo de "identidad" (ej. descripción con typo corregido)', async () => {
    const antes = await calcularHashFila(filaBase());
    const despues = await calcularHashFila({ ...filaBase(), descripcion: 'Placa de titanio' });
    expect(despues).not.toBe(antes);
  });

  it('NO cambia si solo cambian los campos de ruta (id/admision/proveedor/fecha_cx)', async () => {
    const antes = await calcularHashFila(filaBase());
    const despues = await calcularHashFila({
      ...filaBase(), id: '9999', admision: '999999', proveedor: 'Otro Proveedor', fecha_cx: new Date(2020, 0, 1)
    });
    expect(despues).toBe(antes);
  });

  it('compara fechas solo por día (ignora horas/minutos)', async () => {
    const a = await calcularHashFila({ ...filaBase(), fecha_emision: new Date(2026, 8, 20, 3, 15) });
    const b = await calcularHashFila({ ...filaBase(), fecha_emision: new Date(2026, 8, 20, 23, 59) });
    expect(a).toBe(b);
  });

  it('distingue fechas de día distinto', async () => {
    const a = await calcularHashFila({ ...filaBase(), fecha_emision: new Date(2026, 8, 20) });
    const b = await calcularHashFila({ ...filaBase(), fecha_emision: new Date(2026, 8, 21) });
    expect(a).not.toBe(b);
  });

  it('compara números por valor, no por formato (10 == 10.0)', async () => {
    const a = await calcularHashFila({ ...filaBase(), oc_monto: 1000 });
    const b = await calcularHashFila({ ...filaBase(), oc_monto: 1000.0 });
    expect(a).toBe(b);
  });
});
