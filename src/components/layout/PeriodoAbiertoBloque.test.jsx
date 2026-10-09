// @vitest-environment jsdom
// Bloque "Período abierto" del sidebar: con período, varía por módulo, sin
// período, cargando, sidebar colapsado y enlace solo para admin/dev.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

let estado = { docs: [], cargando: true, error: null };
vi.mock('../../hooks/usePeriodoAbiertoStore', () => ({ usePeriodosAbiertos: () => estado }));

const { default: PeriodoAbiertoBloque } = await import('./PeriodoAbiertoBloque');

afterEach(cleanup);
const p = (modulo, mes, anio = '2026') => ({ id: `${anio}_${mes}_${modulo}`, modulo, mes, anio, estado: 'ABIERTO' });
const bloque = () => screen.getByLabelText(/^Período abierto:/);

describe('Bloque "Período abierto"', () => {
  it('con período: etiqueta y mes del período abierto (todos los módulos en el mismo)', () => {
    estado = { docs: [p('implantes', 'octubre'), p('consignacion', 'octubre')], cargando: false, error: null };
    render(<PeriodoAbiertoBloque />);
    expect(screen.getByText('Período abierto')).toBeInTheDocument();
    expect(screen.getByText('Octubre 2026')).toBeInTheDocument();
    expect(bloque()).toHaveAttribute('data-estado', 'abierto');
    expect(bloque()).toHaveAttribute('title', 'Período abierto: Octubre 2026');
    expect(screen.queryByText(/varía por módulo/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument(); // informativo
  });

  it('si los módulos están en meses distintos: el más reciente, "varía por módulo" y el detalle en el tooltip', () => {
    estado = { docs: [p('implantes', 'octubre'), p('consignacion', 'septiembre'), p('laboratorio', 'diciembre', '2025')], cargando: false, error: null };
    render(<PeriodoAbiertoBloque />);
    expect(bloque()).toHaveTextContent('Octubre 2026 · varía por módulo');
    expect(bloque().getAttribute('title')).toBe('Período abierto: Octubre 2026\nConsignación: Septiembre 2026\nImplantes: Octubre 2026\nLaboratorio: Diciembre 2025');
  });

  it('sin período abierto: aviso suave', () => {
    estado = { docs: [], cargando: false, error: null };
    render(<PeriodoAbiertoBloque />);
    expect(screen.getByText('Sin período abierto')).toBeInTheDocument();
    expect(bloque()).toHaveAttribute('data-estado', 'sin-periodo');
    expect(screen.getByText('Sin período abierto').className).toMatch(/amber/);
  });

  it('cargando: placeholder del mismo alto, sin texto de período', () => {
    estado = { docs: [], cargando: true, error: null };
    const { container } = render(<PeriodoAbiertoBloque />);
    expect(bloque()).toHaveAttribute('aria-busy', 'true');
    expect(bloque()).toHaveAttribute('data-estado', 'cargando');
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('Sin período abierto')).not.toBeInTheDocument();
  });

  it('sidebar colapsado: solo el ícono, con el período en el tooltip', () => {
    estado = { docs: [p('implantes', 'octubre')], cargando: false, error: null };
    render(<PeriodoAbiertoBloque colapsado />);
    expect(screen.queryByText('Octubre 2026')).not.toBeInTheDocument();
    expect(screen.queryByText('Período abierto')).not.toBeInTheDocument();
    expect(bloque()).toHaveAttribute('title', 'Período abierto: Octubre 2026');
  });

  it('con onAbrir (admin/dev) es un botón que abre Control Mensual', () => {
    estado = { docs: [p('implantes', 'octubre')], cargando: false, error: null };
    const onAbrir = vi.fn();
    render(<PeriodoAbiertoBloque onAbrir={onAbrir} variante="menu" />);
    fireEvent.click(screen.getByRole('button', { name: /Período abierto: Octubre 2026/ }));
    expect(onAbrir).toHaveBeenCalled();
  });

  it('si no se puede leer: "Período no disponible", sin aviso de "sin período"', () => {
    estado = { docs: [], cargando: false, error: new Error('x') };
    render(<PeriodoAbiertoBloque />);
    expect(screen.getByText('Período no disponible')).toBeInTheDocument();
  });
});
