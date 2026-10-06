// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const leerVinculo = vi.fn();
const ITEM = { codigoId: 'P1', codigo: 'C-1', referencia: 'REF-1', tipo: 'TORNILLO', cantidad: 2 };
const CAJAS = [
  { id: 'A', nombreCaja: 'Caja A', ubicacion: 'E-1', items: [{ ...ITEM, lote: 'L2', vencimiento: '2027-01-31' }] },
  { id: 'B', nombreCaja: 'Caja B', ubicacion: 'E-2', items: [{ ...ITEM, lote: 'L1', vencimiento: '2026-11-30' }] }
];

vi.mock('../../../../../hooks/useInventarioGeneral', () => ({ useInventarioGeneral: () => ({ cajas: CAJAS }) }));
vi.mock('../../../../../stores/catalogosStore', () => ({ cargarCatalogo: async () => [{ id: 'P1', codigo: 'C-1', referencia: 'REF-1', descriptorAuto: 'TORNILLO' }] }));
vi.mock('../../../../../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../../../../context/ModalContext', () => ({ useModal: () => ({ confirmAction: vi.fn() }) }));
vi.mock('../../../../../context/UserContext', () => ({ useUser: () => ({ userData: { nombreCompleto: 'Ana' } }) }));
vi.mock('../services/escaneoInventarioService', () => ({ leerVinculo: (...a) => leerVinculo(...a) }));
vi.mock('../../shared/traspasoTransitoService', () => ({ generarSiguienteNumeroDocumento: async () => '260001', ejecutarTraspasoTransito: vi.fn() }));
vi.mock('../utils/sonidoEscaneo', () => ({ reproducirSonidoEscaneo: vi.fn() }));

const { default: EgresoPorEscaneo } = await import('./EgresoPorEscaneo');

const escanear = (texto) => {
  const input = screen.getByLabelText('Código de barras');
  fireEvent.change(input, { target: { value: texto } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

afterEach(cleanup);
beforeEach(() => leerVinculo.mockReset());

describe('EgresoPorEscaneo', () => {
  it('código no vinculado: avisa en rojo, no deja seguir y ofrece ir a Ingreso por inventario', async () => {
    leerVinculo.mockResolvedValue(null);
    const onIrA = vi.fn();
    render(<EgresoPorEscaneo onIrA={onIrA} />);
    escanear('999');
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/no está vinculado/));
    expect(screen.queryByText(/Agregar a la lista/)).toBeNull();
    fireEvent.click(screen.getByText(/Ir a Ingreso por inventario/));
    expect(onIrA).toHaveBeenCalledWith('ingresoInventario');
  });

  it('código vinculado: muestra el stock y sugiere FEFO; Enter vacío agrega y reescanear suma 1', async () => {
    leerVinculo.mockResolvedValue({ productoId: 'P1', referencia: 'REF-1' });
    render(<EgresoPorEscaneo />);
    escanear('780');
    await waitFor(() => expect(screen.getByText(/Agregar a la lista/)).toBeTruthy());
    expect(screen.getByLabelText('Lote L1 en Caja B').checked).toBe(true);
    expect(screen.getByLabelText('Lote L2 en Caja A').checked).toBe(false);

    fireEvent.keyDown(screen.getByLabelText('Código de barras'), { key: 'Enter' });
    await waitFor(() => expect(screen.getByText(/Lista de egreso: 1 ítem\(s\) · 1 unidad/)).toBeTruthy());

    escanear('780');
    await waitFor(() => expect(screen.getByText(/Lista de egreso: 1 ítem\(s\) · 2 unidad/)).toBeTruthy());

    escanear('780'); // el lote L1 de Caja B solo tiene 2
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/No hay más stock/));
    expect(screen.getByText(/Lista de egreso: 1 ítem\(s\) · 2 unidad/)).toBeTruthy();
  });

  it('GS1 con lote: preselecciona ese lote', async () => {
    leerVinculo.mockResolvedValue({ productoId: 'P1' });
    render(<EgresoPorEscaneo />);
    escanear('(01)07612345678900(10)L2');
    await waitFor(() => expect(screen.getByLabelText('Lote L2 en Caja A').checked).toBe(true));
    expect(leerVinculo).toHaveBeenCalledWith('07612345678900');
  });
});
