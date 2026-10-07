// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import CampoEscaneo from './CampoEscaneo';

afterEach(cleanup);

const escribir = (input, texto) => fireEvent.change(input, { target: { value: texto } });

describe('CampoEscaneo', () => {
  it('detecta la lectura al recibir Enter y limpia el campo', () => {
    const onLectura = vi.fn();
    render(<CampoEscaneo onLectura={onLectura} />);
    const input = screen.getByLabelText('Código de barras');

    escribir(input, '7801234567894');
    expect(onLectura).not.toHaveBeenCalled();
    const evento = fireEvent.keyDown(input, { key: 'Enter' });

    expect(evento).toBe(false); // preventDefault: el Enter no envía nada
    expect(onLectura).toHaveBeenCalledWith('7801234567894');
    expect(input.value).toBe('');
  });

  it('el Enter no envía un formulario que lo rodee', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(<form onSubmit={onSubmit}><CampoEscaneo onLectura={() => {}} /></form>);
    const input = screen.getByLabelText('Código de barras');
    escribir(input, 'ABC');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Enter con el campo vacío no lee nada; Tab vacío deja navegar', () => {
    const onLectura = vi.fn();
    render(<CampoEscaneo onLectura={onLectura} />);
    const input = screen.getByLabelText('Código de barras');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(fireEvent.keyDown(input, { key: 'Tab' })).toBe(true);
    expect(onLectura).not.toHaveBeenCalled();
  });

  it('se puede escribir a mano y leer con el botón', () => {
    const onLectura = vi.fn();
    render(<CampoEscaneo onLectura={onLectura} />);
    escribir(screen.getByLabelText('Código de barras'), 'MANUAL-1');
    fireEvent.click(screen.getByRole('button', { name: /leer/i }));
    expect(onLectura).toHaveBeenCalledWith('MANUAL-1');
  });

  it('muestra el mensaje de la señal', () => {
    render(<CampoEscaneo onLectura={() => {}} senal="nuevo" mensaje="Código nuevo" />);
    expect(screen.getByRole('status').textContent).toBe('Código nuevo');
  });
});
