// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const leerVinculo = vi.fn();
const buscarIngresoDuplicado = vi.fn();
const guardarIngresoStock = vi.fn();
let respuestaModal = 'confirmar';
const PRODUCTO = { id: 'P1', codigo: 'C-1', referencia: 'REF-1', descriptorAuto: 'TORNILLO', precioNeto: 100 };

vi.mock('../../shared/ingreso/useCatalogosIngreso', () => ({
  useCatalogosIngreso: () => ({ catalogoCodigos: [PRODUCTO], listaEmpresas: [{ id: 'E1', nombre: 'Acme', rut: '1-9' }], listaCajas: [] })
}));
vi.mock('../../../../../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../../../../context/UserContext', () => ({ useUser: () => ({ userData: { nombreCompleto: 'Ana' } }) }));
vi.mock('../../../../../context/ModalContext', () => ({
  useModal: () => ({ confirmAction: (_t, _m, onConfirm, opts) => (respuestaModal === 'confirmar' ? onConfirm() : opts.onCancel?.()) })
}));
vi.mock('../../shared/escaneo/escaneoInventarioService', () => ({ leerVinculo: (...a) => leerVinculo(...a) }));
vi.mock('../../shared/escaneo/sonidoEscaneo', () => ({ reproducirSonidoEscaneo: vi.fn() }));
vi.mock('../../shared/ingreso/ingresoStockService', () => ({
  buscarIngresoDuplicado: (...a) => buscarIngresoDuplicado(...a),
  guardarIngresoStock: (...a) => guardarIngresoStock(...a)
}));

const { default: IngresoPorDocumento } = await import('./IngresoPorDocumento');

const escanear = (texto) => {
  const input = screen.getByLabelText('Código de barras');
  fireEvent.change(input, { target: { value: texto } });
  fireEvent.keyDown(input, { key: 'Enter' });
};
const llenarCabecera = () => {
  fireEvent.change(screen.getByPlaceholderText('Ej: F001-4920'), { target: { value: 'F-100' } });
  fireEvent.change(screen.getByPlaceholderText('Ej: OC-2026-081'), { target: { value: 'OC-1' } });
  fireEvent.change(screen.getByPlaceholderText('Seleccionar o escribir...'), { target: { value: 'Caja 1' } });
};
const agregar = (cantidad, lote) => {
  fireEvent.change(screen.getByPlaceholderText('Lote'), { target: { value: lote } });
  fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: String(cantidad) } });
  fireEvent.click(screen.getByText('Agregar a la lista'));
};

afterEach(cleanup);
beforeEach(() => {
  leerVinculo.mockReset();
  buscarIngresoDuplicado.mockReset().mockResolvedValue(null);
  guardarIngresoStock.mockReset().mockResolvedValue({ id: 'NUEVO' });
  respuestaModal = 'confirmar';
});

describe('IngresoPorDocumento', () => {
  it('cabecera: exige los mismos campos que Ingresos y avisa del documento duplicado', async () => {
    render(<IngresoPorDocumento />);
    fireEvent.click(screen.getByText('Continuar al escaneo'));
    expect(screen.getByText('El número de Guía o Factura es obligatorio')).toBeTruthy();

    buscarIngresoDuplicado.mockResolvedValue({ fecha: new Date(2026, 9, 1, 10, 30), usuario: 'Carla' });
    llenarCabecera();
    fireEvent.click(screen.getByText('Continuar al escaneo'));
    await waitFor(() => expect(screen.getByText(/ya fue ingresada el 01-10-2026 10:30 por Carla/)).toBeTruthy());
    expect(screen.queryByLabelText('Código de barras')).toBeNull();
  });

  it('código vinculado: agrega, pregunta sumar o línea nueva con el mismo lote y confirma con el servicio de Ingresos', async () => {
    leerVinculo.mockResolvedValue({ productoId: 'P1' });
    render(<IngresoPorDocumento />);
    llenarCabecera();
    fireEvent.click(screen.getByText('Continuar al escaneo'));
    await waitFor(() => expect(screen.getByLabelText('Código de barras')).toBeTruthy());

    escanear('780');
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Producto reconocido/));
    agregar(2, 'L1');
    expect(screen.getByText(/Documento: 1 línea\(s\) · 2 unidad/)).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Código de barras')));

    escanear('780');
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Producto reconocido/));
    agregar(3, 'l1'); // mismo lote -> el modal responde "Sumar cantidad"
    expect(screen.getByText(/Documento: 1 línea\(s\) · 5 unidad/)).toBeTruthy();

    respuestaModal = 'cancelar'; // "Agregar como línea nueva"
    escanear('780');
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Producto reconocido/));
    agregar(1, 'L1');
    expect(screen.getByText(/Documento: 2 línea\(s\) · 6 unidad/)).toBeTruthy();

    fireEvent.click(screen.getByText('Revisar y confirmar'));
    fireEvent.click(screen.getByText('Confirmar ingreso'));
    await waitFor(() => expect(guardarIngresoStock).toHaveBeenCalledTimes(1));
    const arg = guardarIngresoStock.mock.calls[0][0];
    expect(arg.cabecera).toMatchObject({ numeroGuiaFactura: 'F-100', numeroOrden: 'OC-1', nombreCaja: 'Caja 1' });
    expect(arg.items.map((i) => [i.codigoId, i.lote, i.cantidad, i.descripcion, i.precio])).toEqual([['P1', 'L1', 5, 'TORNILLO', 100], ['P1', 'L1', 1, 'TORNILLO', 100]]);
    expect(arg.origen).toBe('Ingreso con guía o factura por escaneo');
    expect(arg.vinculos[0].codigos.map((c) => c.clave)).toEqual(['780']);
    await waitFor(() => expect(screen.getByText('Continuar al escaneo')).toBeTruthy());
  });

  it('código no vinculado: abre la búsqueda del maestro y lo deja para vincular al confirmar', async () => {
    leerVinculo.mockResolvedValue(null);
    render(<IngresoPorDocumento />);
    llenarCabecera();
    fireEvent.click(screen.getByText('Continuar al escaneo'));
    await waitFor(() => expect(screen.getByLabelText('Código de barras')).toBeTruthy());
    escanear('999');
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Código nuevo 999/));
    expect(screen.getByText(/elige el producto para vincularlo/)).toBeTruthy();
  });
});
