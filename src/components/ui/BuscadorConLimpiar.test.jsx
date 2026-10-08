// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { BuscadorConLimpiar } from './BuscadorConLimpiar';

const Prueba = () => {
  const [v, setV] = useState('');
  return <BuscadorConLimpiar value={v} onChange={setV} placeholder="Buscar" />;
};
afterEach(cleanup);

describe('BuscadorConLimpiar', () => {
  it('la X aparece solo con texto; al hacer clic borra y deja el foco en el campo', () => {
    render(<Prueba />);
    const input = screen.getByPlaceholderText('Buscar');
    expect(screen.queryByRole('button', { name: 'Limpiar búsqueda' })).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: 'ana' } });
    const x = screen.getByRole('button', { name: 'Limpiar búsqueda' });
    expect(x).toHaveAttribute('title', 'Limpiar búsqueda');
    fireEvent.click(x);
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(screen.queryByRole('button', { name: 'Limpiar búsqueda' })).not.toBeInTheDocument();
  });
  it('Escape en el campo borra la búsqueda', () => {
    render(<Prueba />);
    const input = screen.getByPlaceholderText('Buscar');
    fireEvent.change(input, { target: { value: '123' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
  });
});
