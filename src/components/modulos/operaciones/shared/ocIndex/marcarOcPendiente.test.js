import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../../firebaseConfig', () => ({ db: {} }));
const { rangoRutasGestiones, calcularMarcasOcPendiente } = await import('./marcarOcPendiente');

describe('rangoRutasGestiones', () => {
  it('acota por mes, con el fin exclusivo en el mes siguiente', () => {
    expect(rangoRutasGestiones('2026-08', '2026-10')).toEqual({
      inicio: 'implantes_gestiones/2026/mes/08', fin: 'implantes_gestiones/2026/mes/11'
    });
    expect(rangoRutasGestiones('2025-12', '2025-12').fin).toBe('implantes_gestiones/2026/mes/01');
  });

  it('rechaza meses inválidos o invertidos', () => {
    expect(() => rangoRutasGestiones('2026-8', '2026-10')).toThrow(/AAAA-MM/);
    expect(() => rangoRutasGestiones('2026-10', '2026-08')).toThrow(/posterior/);
  });
});

describe('calcularMarcasOcPendiente', () => {
  const gestion = (items, extra = {}) => ({ ref: {}, data: { cotizaciones: [{ items }], ...extra } });

  it('true si un ítem con código no tiene OC, false si todos tienen o no hay códigos; salta las que ya tienen el campo', () => {
    const { marcas, yaTenian } = calcularMarcasOcPendiente([
      gestion([{ id: 'a', codigo: '510012' }]),
      gestion([{ id: 'a', codigo: '510012' }], { ocPorItem: { a: '4500001' } }),
      gestion([]),
      gestion([{ id: 'b', codigo: '', sinCodigo: true }]),
      gestion([{ id: 'a', codigo: '1' }], { ocPendiente: false })
    ]);
    expect(marcas.map(m => m.ocPendiente)).toEqual([true, false, false, false]);
    expect(yaTenian).toBe(1);
  });
});
