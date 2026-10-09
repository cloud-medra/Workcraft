import { describe, it, expect, vi } from 'vitest';

vi.mock('xlsx', () => ({}));
import { filasParaExcel, filasCodigosParaExcel } from './exportarEstadisticas';

const fila = { nombre: 'Juan', codigo: 'X', descripcion: 'd', actual: 3, anterior: 1, diferencia: 2, variacion: 200, participacion: 50, admisiones: 2, precio: 10, monto: 30, montoAnterior: 10, montoDiferencia: 20, montoVariacion: 200 };

describe('exportar Estadísticas según el modo', () => {
  it('comparando: columnas del período anterior y variaciones', () => {
    const [f] = filasParaExcel([fila], { singular: 'Médico', periodo: '2026-01', anterior: '2025-12', conMontos: true });
    expect(Object.keys(f)).toEqual(['Médico', 'Admisiones Enero 2026', 'Admisiones Diciembre 2025', 'Diferencia', 'Variación %', '% del total',
      'Monto Enero 2026', 'Monto Diciembre 2025', 'Diferencia de monto', 'Variación % de monto']);
  });

  it('"Solo un mes" (sin anterior): sin columnas comparativas', () => {
    const [f] = filasParaExcel([fila], { singular: 'Médico', periodo: '2026-01', anterior: null, conMontos: true });
    expect(Object.keys(f)).toEqual(['Médico', 'Admisiones Enero 2026', '% del total', 'Monto Enero 2026']);
    const [c] = filasCodigosParaExcel([fila], { periodo: '2026-01', anterior: null, conMontos: true });
    expect(Object.keys(c)).toEqual(['Código', 'Descripción', 'Cantidad Enero 2026', 'Admisiones', 'Precio unitario (promedio)', 'Precio mínimo', 'Precio máximo', 'Monto Enero 2026']);
  });
});
