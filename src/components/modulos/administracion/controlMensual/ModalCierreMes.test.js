// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import ModalCierreMes from './ModalCierreMes';

afterEach(cleanup);

const SOLICITUD = { mesId: 'septiembre', modulos: ['implantes'] };

const montar = (onConfirmar = vi.fn(async () => ({ ok: true, mensaje: 'Mes Septiembre 2026 cerrado correctamente.' }))) => {
  const onCancelar = vi.fn();
  render(<ModalCierreMes solicitud={SOLICITUD} anio="2026" onCancelar={onCancelar} onConfirmar={onConfirmar} />);
  return { onCancelar, onConfirmar };
};

const irAlPaso2 = () => fireEvent.click(screen.getByRole('button', { name: 'Sí, continuar' }));
const escribir = (anio, mes) => {
  fireEvent.change(screen.getByPlaceholderText('AAAA'), { target: { value: anio } });
  fireEvent.change(screen.getByPlaceholderText('MM'), { target: { value: mes } });
};
const botonConfirmar = () => screen.getByRole('button', { name: 'Confirmar cierre' });

describe('ModalCierreMes', () => {
  it('paso 1: pregunta por el mes y año; Cancelar cierra sin ejecutar nada', () => {
    const { onCancelar, onConfirmar } = montar();
    expect(screen.getByText('¿Deseas cerrar el mes de Septiembre 2026?')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancelar).toHaveBeenCalled();
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('paso 2: campos vacíos, sin autocompletar, y "Confirmar cierre" deshabilitado hasta completar ambos', () => {
    montar();
    irAlPaso2();
    const anio = screen.getByPlaceholderText('AAAA');
    const mes = screen.getByPlaceholderText('MM');
    expect(anio.value).toBe('');
    expect(mes.value).toBe('');
    expect(anio.getAttribute('autocomplete')).toBe('off');
    expect(mes.getAttribute('autocomplete')).toBe('off');

    expect(botonConfirmar().disabled).toBe(true);
    escribir('2026', '');
    expect(botonConfirmar().disabled).toBe(true);
    escribir('2026', '9');
    expect(botonConfirmar().disabled).toBe(false);
  });

  it('si el año/mes no coinciden, muestra el error y NO ejecuta el cierre', () => {
    const { onConfirmar } = montar();
    irAlPaso2();
    escribir('2026', '08');
    fireEvent.click(botonConfirmar());
    expect(screen.getByRole('alert').textContent).toContain('El mes ingresado no coincide con el mes a cerrar. Verifica e intenta nuevamente.');
    expect(onConfirmar).not.toHaveBeenCalled();
  });

  it('pasos 3 y 4: muestra "Cerrando mes…" con todo deshabilitado, y luego el éxito', async () => {
    let resolver;
    const onConfirmar = vi.fn(() => new Promise(r => { resolver = r; }));
    montar(onConfirmar);
    irAlPaso2();
    escribir('2026', '09');
    fireEvent.click(botonConfirmar());

    expect(onConfirmar).toHaveBeenCalledWith({ anioIngresado: '2026', mesIngresado: '09' });
    expect(screen.getByText('Cerrando mes Septiembre 2026...')).toBeTruthy();
    expect(botonConfirmar().disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Cancelar' }).disabled).toBe(true);
    expect(screen.getByPlaceholderText('AAAA').disabled).toBe(true);

    await act(async () => { resolver({ ok: true, mensaje: 'Mes Septiembre 2026 cerrado correctamente.' }); });
    expect(screen.getByRole('status').textContent).toContain('Mes Septiembre 2026 cerrado correctamente.');
  });

  it('un doble clic / doble envío ejecuta el cierre una sola vez', async () => {
    const onConfirmar = vi.fn(() => new Promise(() => {}));
    montar(onConfirmar);
    irAlPaso2();
    escribir('2026', '09');
    const form = botonConfirmar().closest('form');
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onConfirmar).toHaveBeenCalledTimes(1);
  });

  it('si el servidor rechaza el cierre, muestra su mensaje', async () => {
    montar(vi.fn(async () => ({ ok: false, mensaje: 'No tienes permiso para cerrar el período de: implantes.' })));
    irAlPaso2();
    escribir('2026', '09');
    await act(async () => { fireEvent.click(botonConfirmar()); });
    expect(screen.getByRole('alert').textContent).toContain('No tienes permiso para cerrar el período de: implantes.');
  });
});
