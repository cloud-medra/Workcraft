import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../shared/useResumenImputadas', () => ({ useResumenImputadas: vi.fn(), TODOS_LOS_MESES: 'TODOS' }));

describe('agruparFilasGuiaPorDocumento', () => {
  it('asocia filasGuia a su documento y no repite las de un delivery compartido', async () => {
    const { agruparFilasGuiaPorDocumento } = await import('./useResumenConsignacionData');
    const filas = [{ codigoGuia: 'A', numeroGuia: '111' }, { codigoGuia: 'B', numeroGuia: '222' }];

    const mapa = agruparFilasGuiaPorDocumento([
      { refPath: 'r1', delivery: 'D1', filasGuia: filas },
      { refPath: 'r2', delivery: 'D1', filasGuia: filas },
      { refPath: 'r3', delivery: 'D2' },
      { refPath: 'r4', delivery: 'D3', filasGuia: [{ codigoGuia: 'C', numeroGuia: '444' }] }
    ]);

    expect(mapa.get('r1').map((f) => f.numeroGuia)).toEqual(['111', '222']);
    expect(mapa.has('r2')).toBe(false);
    expect(mapa.has('r3')).toBe(false);
    expect(mapa.get('r4')[0].numeroGuia).toBe('444');
  });
});
