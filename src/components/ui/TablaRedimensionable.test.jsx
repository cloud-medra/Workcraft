// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { TablaRedimensionable } from './TablaRedimensionable';

afterEach(cleanup);

const COLUMNAS = [
  { key: 'ref', label: 'Referencia', ancho: 120, min: 60, celda: f => f.ref },
  { key: 'desc', label: 'Desc. Auto', ancho: 150, min: 80, celda: f => f.desc },
  { key: 'badge', label: 'Estado', ancho: 90, min: 50, celda: f => <span>{f.estado}</span> },
  { key: 'total', label: 'Total', ancho: 80, min: 50, celda: f => f.total }
];
const FILAS = [{ id: 'a', ref: 'R-1', desc: 'TORNILLO DE TITANIO MUY LARGO 3.5MM', estado: 'CARGADO', total: 10 }];
const anchos = { ref: 120, desc: 150, badge: 90, total: 80 };

describe('TablaRedimensionable', () => {
  it('aplica los anchos al colgroup y el total al ancho de la tabla', () => {
    const { container } = render(<TablaRedimensionable columnas={COLUMNAS} filas={FILAS} anchos={anchos} onResize={() => {}} />);
    const cols = container.querySelectorAll('col');
    expect(cols[1]).toHaveStyle({ width: '150px' });
    expect(container.querySelector('table')).toHaveStyle({ width: '440px', tableLayout: 'fixed' });
  });

  it('corta el texto con "..." y muestra el texto completo como tooltip; los badges no llevan tooltip', () => {
    render(<TablaRedimensionable columnas={COLUMNAS} filas={FILAS} anchos={anchos} onResize={() => {}} />);
    const celda = screen.getByText(FILAS[0].desc);
    expect(celda).toHaveClass('truncate');
    expect(celda).toHaveAttribute('title', FILAS[0].desc);
    expect(screen.getByText('CARGADO').closest('td')).not.toHaveAttribute('title');
  });

  it('arrastrar la manija llama onResize respetando el mínimo', () => {
    const onResize = vi.fn();
    const { container } = render(<TablaRedimensionable columnas={COLUMNAS} filas={FILAS} anchos={anchos} onResize={onResize} />);
    const manija = container.querySelectorAll('th [title^="Arrastra"]')[1];
    fireEvent.mouseDown(manija, { button: 0, clientX: 300 });
    fireEvent.mouseMove(document, { clientX: 100, buttons: 1 });
    fireEvent.mouseUp(document);
    expect(onResize).toHaveBeenLastCalledWith('desc', 80);
  });

  it('pie: la etiqueta ocupa las columnas anteriores a la del total', () => {
    render(
      <TablaRedimensionable columnas={COLUMNAS} filas={FILAS} anchos={anchos} onResize={() => {}}
        pie={{ etiqueta: 'Suma:', columna: 'total', valor: '$10' }} />
    );
    expect(screen.getByText('Suma:')).toHaveAttribute('colspan', '3');
    expect(screen.getByText('$10')).toBeInTheDocument();
  });

  it('sin filas muestra el mensaje vacío', () => {
    render(<TablaRedimensionable columnas={COLUMNAS} filas={[]} anchos={anchos} onResize={() => {}} vacio="Nada" />);
    expect(screen.getByText('Nada')).toBeInTheDocument();
  });
});
