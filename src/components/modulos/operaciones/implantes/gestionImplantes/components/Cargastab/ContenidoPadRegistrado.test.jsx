// @vitest-environment jsdom
// Edición de líneas de "Contenido del PAD" ya registradas en el formulario
// de cotización: editar, cancelar (botón y Escape), Enter guarda,
// validaciones y bloqueo.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import ContenidoPadRegistrado from './ContenidoPadRegistrado';
import { validarContenidoPad, deBorrador, aBorrador } from './contenidoPadHelpers';
import { construirItemContenidoPadDesdeFila } from './PadContenidoRow';
import { anchosConExtra } from './cargasHelpers';

// El autocompletado de referencia usa el catálogo en Firestore: no aplica acá.
vi.mock('./useAutocompleteReferencia', () => ({
  useAutocompleteReferencia: () => ({
    sugerencias: [], buscando: false, mostrarSug: false, setMostrarSug: () => {},
    containerRef: { current: null }, portalRef: { current: null }, skipNext: { current: false },
  }),
}));

afterEach(cleanup);

const filas = () => [
  { tempId: 't1', referencia: 'TORNILLO 3.5', cantidad: 1, lote: 'L-1', vencimiento: '2027-05-01', descriptorAuto: 'Tornillo cortical', codigo: 'X' },
  { tempId: 't2', referencia: 'PLACA LCP', cantidad: 2, lote: 'Sin lote', vencimiento: 'Sin fecha', descriptorAuto: '' },
];
const filaDe = (referencia) => screen.getByText(referencia).closest('tr');
const editor = () => screen.getByRole('group', { name: /^Editar / });
const campo = (label) => within(editor()).getByText(label).parentElement.querySelector('input');

describe('Contenido del PAD registrado: edición en línea', () => {
  it('editar la cantidad de 1 a 3 sin borrar la línea (conserva lote, vencimiento y descripción)', () => {
    const onActualizar = vi.fn();
    render(<ContenidoPadRegistrado filas={filas()} onActualizar={onActualizar} onEliminar={vi.fn()} />);
    fireEvent.click(within(filaDe('TORNILLO 3.5')).getByRole('button', { name: 'Editar TORNILLO 3.5' }));
    expect(campo('Cant.')).toHaveValue(1);
    fireEvent.change(campo('Cant.'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
    expect(onActualizar).toHaveBeenCalledWith('t1', expect.objectContaining({
      referencia: 'TORNILLO 3.5', cantidad: 3, lote: 'L-1', vencimiento: '2027-05-01', descriptorAuto: 'Tornillo cortical',
    }));
    expect(screen.queryByRole('group', { name: /^Editar / })).not.toBeInTheDocument();
  });

  it('"Sin lote" / "Sin fecha" se editan como vacío y vuelven a quedar así', () => {
    const onActualizar = vi.fn();
    render(<ContenidoPadRegistrado filas={filas()} onActualizar={onActualizar} onEliminar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar PLACA LCP' }));
    expect(campo('Lote')).toHaveValue('');
    fireEvent.keyDown(campo('Cant.'), { key: 'Enter' }); // Enter guarda
    expect(onActualizar).toHaveBeenCalledWith('t2', expect.objectContaining({ lote: 'Sin lote', vencimiento: 'Sin fecha', cantidad: 2 }));
  });

  it('Cancelar y Escape descartan los cambios', () => {
    const onActualizar = vi.fn();
    render(<ContenidoPadRegistrado filas={filas()} onActualizar={onActualizar} onEliminar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar TORNILLO 3.5' }));
    fireEvent.change(campo('Cant.'), { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/ }));
    expect(within(filaDe('TORNILLO 3.5')).getByText('1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar TORNILLO 3.5' }));
    fireEvent.change(campo('Lote'), { target: { value: 'OTRO' } });
    fireEvent.keyDown(campo('Lote'), { key: 'Escape' });
    expect(screen.queryByRole('group', { name: /^Editar / })).not.toBeInTheDocument();
    expect(onActualizar).not.toHaveBeenCalled();
  });

  it('mismas validaciones que al registrar: no guarda con cantidad 0 ni sin referencia', () => {
    const onActualizar = vi.fn();
    render(<ContenidoPadRegistrado filas={filas()} onActualizar={onActualizar} onEliminar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar TORNILLO 3.5' }));
    fireEvent.change(campo('Cant.'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('La cantidad debe ser mayor a 0');
    fireEvent.change(campo('Referencia contenido'), { target: { value: '  ' } });
    fireEvent.change(campo('Cant.'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar/ }));
    expect(screen.getByRole('alert')).toHaveTextContent('La referencia es obligatoria');
    expect(onActualizar).not.toHaveBeenCalled();
    // Fecha con formato inválido (p. ej. pegada a mano).
    expect(validarContenidoPad({ referencia: 'X', cantidad: '1', vencimiento: '31/12/2026' })).toEqual({ vencimiento: true });
    expect(validarContenidoPad({ referencia: 'X', cantidad: '1', vencimiento: '' })).toEqual({});
  });

  it('con el bloque imputado (bloqueado) no se puede editar ni quitar; durante una edición, tampoco las otras líneas', () => {
    const { rerender } = render(<ContenidoPadRegistrado filas={filas()} onActualizar={vi.fn()} onEliminar={vi.fn()} deshabilitado />);
    expect(screen.getByRole('button', { name: 'Editar TORNILLO 3.5' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Editar TORNILLO 3.5' })).toHaveAttribute('title', 'Bloqueado: desbloquea el candado para editar');
    expect(screen.getByRole('button', { name: 'Quitar PLACA LCP' })).toBeDisabled();
    rerender(<ContenidoPadRegistrado filas={filas()} onActualizar={vi.fn()} onEliminar={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar TORNILLO 3.5' }));
    expect(screen.getByRole('button', { name: 'Editar PLACA LCP' })).toBeDisabled();
  });

  it('lo editado es lo que se guarda como ítem del PAD (precio 0, código sin OC)', () => {
    const fila = deBorrador({ ...aBorrador(filas()[0]), cantidad: '3' });
    const item = construirItemContenidoPadDesdeFila(fila, 'pad-1', { numCotizacion: 'COT-1', totalCotizacion: 1000, periodoAnio: '2026', periodoMes: 'octubre' });
    expect(item).toMatchObject({ padPadreId: 'pad-1', cantidad: 3, lote: 'L-1', precio: 0, totalItem: 0, estadoCarga: 'PAD' });
  });
});

describe('ancho de la tabla de ítems', () => {
  it('el espacio sobrante se reparte entre Desc. Auto, Referencia, Clase y Tipo', () => {
    const base = { descriptorAuto: 130, referencia: 130, clase: 50, tipo: 50, codigo: 70 };
    const r = anchosConExtra(base, 300);
    expect(r.codigo).toBe(70);
    expect(r.descriptorAuto).toBe(250);
    expect(r.referencia + r.clase + r.tipo + r.descriptorAuto - 360).toBeLessThanOrEqual(300);
    expect(r.clase).toBeGreaterThan(50);
    expect(anchosConExtra(base, -20)).toBe(base); // no cabe: sin cambios (scroll)
  });
});
