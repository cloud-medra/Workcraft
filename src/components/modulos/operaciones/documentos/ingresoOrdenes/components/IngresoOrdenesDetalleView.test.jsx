// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import IngresoOrdenesDetalleView from './IngresoOrdenesDetalleView';

const grupoBase = () => ({
  groupId: '500100||Empresa A||2026-09-20',
  admision: '500100',
  paciente: 'Juan Pérez',
  medico: 'Dr. Soto',
  proveedor: 'Empresa A',
  fecha_cx: new Date(2026, 8, 20),
  totalItems: 2,
  items: [
    { id: '1', refPath: 'x/1', codigo: 'COD-1', descripcion: 'Placa', oc: '' },
    { id: '2', refPath: 'x/2', codigo: 'COD-2', descripcion: 'Tornillo', oc: '' }
  ]
});

describe('IngresoOrdenesDetalleView — pestaña Información', () => {
  it('muestra el contenedor "Detalle de Orden" con Admisión y Paciente', () => {
    render(<IngresoOrdenesDetalleView grupo={grupoBase()} />);
    expect(screen.getByText('Detalle de Orden')).toBeInTheDocument();
    expect(screen.getByText('Admisión')).toBeInTheDocument();
    expect(screen.getByText('500100')).toBeInTheDocument();
    expect(screen.getByText('Paciente')).toBeInTheDocument();
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('NO muestra el campo OC si ningún ítem del grupo tiene OC', () => {
    render(<IngresoOrdenesDetalleView grupo={grupoBase()} />);
    expect(screen.queryByText('OC')).not.toBeInTheDocument();
  });

  it('muestra el campo OC (con su valor) si al menos un ítem del grupo tiene OC', () => {
    const grupo = grupoBase();
    grupo.items[1].oc = 'OC-12345';
    render(<IngresoOrdenesDetalleView grupo={grupo} />);
    expect(screen.getByText('OC')).toBeInTheDocument();
    expect(screen.getByText('OC-12345')).toBeInTheDocument();
  });
});
