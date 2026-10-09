// @vitest-environment jsdom
// "Notas de la admisión" en Cargas: con texto, vacío, texto largo,
// colapsado (recordado), copiar, editar y permisos por campo.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import NotasAdmision from './NotasAdmision';

beforeEach(() => localStorage.clear());
afterEach(cleanup);
const seccion = (titulo) => screen.getByRole('region', { name: titulo });
const DESC = 'Descripción / Nota Operatoria';
const OBS = 'Texto Libre / Notas Adicionales';

describe('Notas de la admisión', () => {
  it('muestra ambos textos tal cual, con sus saltos de línea, expandido por defecto', () => {
    render(<NotasAdmision descripcion={'RUPTURA MANGUITO ROTADORES\nHombro derecho'} observacion="Paciente alérgico a la penicilina" />);
    expect(screen.getByRole('button', { name: /Notas de la admisión/ })).toHaveAttribute('aria-expanded', 'true');
    const p = within(seccion(DESC)).getByText(/RUPTURA MANGUITO ROTADORES/);
    expect(p.textContent).toBe('RUPTURA MANGUITO ROTADORES\nHombro derecho');
    expect(p.className).toMatch(/whitespace-pre-wrap/);
    expect(within(seccion(OBS)).getByText('Paciente alérgico a la penicilina')).toBeInTheDocument();
    expect(screen.queryByText('Ver más')).not.toBeInTheDocument();
  });

  it('vacío o "P" (relleno de la gestión) → "Sin información", sin botón de copiar', () => {
    render(<NotasAdmision descripcion="P" observacion="   " onCopiar={vi.fn()} />);
    expect(within(seccion(DESC)).getByText('Sin información')).toBeInTheDocument();
    expect(within(seccion(OBS)).getByText('Sin información')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Copiar/ })).not.toBeInTheDocument();
  });

  it('texto largo: recortado con "Ver más" / "Ver menos" (scroll interno al expandir)', () => {
    const largo = Array.from({ length: 12 }, (_, i) => `Línea ${i + 1} de la nota operatoria`).join('\n');
    render(<NotasAdmision descripcion={largo} observacion="" />);
    const p = within(seccion(DESC)).getByText(/Línea 1 de/);
    expect(p).toHaveAttribute('data-expandido', 'false');
    expect(p.className).toMatch(/max-h-\[4\.6rem\] overflow-hidden/);
    fireEvent.click(screen.getByRole('button', { name: 'Ver más' }));
    expect(p).toHaveAttribute('data-expandido', 'true');
    expect(p.className).toMatch(/max-h-60 overflow-y-auto/);
    fireEvent.click(screen.getByRole('button', { name: 'Ver menos' }));
    expect(p).toHaveAttribute('data-expandido', 'false');
  });

  it('colapsar se recuerda en el navegador (y muestra un resumen en una línea)', () => {
    render(<NotasAdmision descripcion="ENDOPROTESIS TOTAL DE CADERA" observacion="" />);
    fireEvent.click(screen.getByRole('button', { name: /Notas de la admisión/ }));
    expect(screen.queryByRole('region', { name: DESC })).not.toBeInTheDocument();
    expect(screen.getByText('· ENDOPROTESIS TOTAL DE CADERA')).toBeInTheDocument();
    expect(localStorage.getItem('workcraft:cargas:notasAdmision:abierto')).toBe('0');
    cleanup();
    render(<NotasAdmision descripcion="ENDOPROTESIS TOTAL DE CADERA" observacion="" />);
    expect(screen.getByRole('button', { name: /Notas de la admisión/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('funciona sin localStorage (expandido por defecto)', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('bloqueado'); });
    render(<NotasAdmision descripcion="X" observacion="" />);
    expect(screen.getByRole('button', { name: /Notas de la admisión/ })).toHaveAttribute('aria-expanded', 'true');
    getItem.mockRestore();
  });

  it('copiar cada sección y "Editar en Información" solo si se entrega la acción', () => {
    const onCopiar = vi.fn();
    const onEditar = vi.fn();
    render(<NotasAdmision descripcion="DESC" observacion="OBS" onCopiar={onCopiar} onEditar={onEditar} />);
    fireEvent.click(screen.getByRole('button', { name: `Copiar ${OBS}` }));
    expect(onCopiar).toHaveBeenCalledWith('OBS');
    fireEvent.click(screen.getByRole('button', { name: /Editar en Información/ }));
    expect(onEditar).toHaveBeenCalled();
    cleanup();
    render(<NotasAdmision descripcion="DESC" observacion="OBS" onCopiar={onCopiar} />);
    expect(screen.queryByRole('button', { name: /Editar en Información/ })).not.toBeInTheDocument();
  });

  it('respeta los permisos por campo: oculta la sección sin permiso; sin ninguna, no se muestra', () => {
    render(<NotasAdmision descripcion="DESC" observacion="OBS" verObservacion={false} />);
    expect(seccion(DESC)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: OBS })).not.toBeInTheDocument();
    cleanup();
    const { container } = render(<NotasAdmision descripcion="DESC" observacion="OBS" verDescripcion={false} verObservacion={false} />);
    expect(container).toBeEmptyDOMElement();
  });
});
