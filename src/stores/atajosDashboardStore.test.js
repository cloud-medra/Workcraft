import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  doc: (_db, ...ruta) => ({ ruta: ruta.join('/') }),
  getDoc: vi.fn(),
  setDoc: vi.fn(async () => {}),
  serverTimestamp: () => 'TS'
}));
vi.mock('../firebaseConfig', () => ({ db: {} }));

describe('atajosDashboardStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sin configuración guardada usa los atajos por defecto', async () => {
    const { getDoc } = await import('firebase/firestore');
    const { obtenerAtajosConfigurados } = await import('./atajosDashboardStore');
    const { ATAJOS_POR_DEFECTO } = await import('../config/atajosDashboard');
    getDoc.mockResolvedValueOnce({ exists: () => false });

    expect(await obtenerAtajosConfigurados(true)).toBe(ATAJOS_POR_DEFECTO);
    expect(getDoc.mock.calls[0][0].ruta).toBe('configuracion_sistema/atajosDashboard');
  });

  it('guarda la lista limpia y la deja en caché (sin volver a leer)', async () => {
    const { getDoc, setDoc } = await import('firebase/firestore');
    const { obtenerAtajosConfigurados, guardarAtajosConfigurados } = await import('./atajosDashboardStore');
    const lista = [
      { modulo: 'maestros', path: '/maestros/codigosMaestros', label: 'x' },
      { modulo: 'maestros', path: '/maestros/codigosMaestros' }
    ];

    await guardarAtajosConfigurados(lista, { nombreCompleto: 'Admin' });

    expect(setDoc.mock.calls[0][1]).toEqual({
      atajos: [{ modulo: 'maestros', path: '/maestros/codigosMaestros' }],
      actualizadoEn: 'TS',
      actualizadoPor: 'Admin'
    });
    expect(await obtenerAtajosConfigurados()).toEqual([{ modulo: 'maestros', path: '/maestros/codigosMaestros' }]);
    expect(getDoc).not.toHaveBeenCalled();
  });
});
