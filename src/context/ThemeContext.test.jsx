// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';

const updateDoc = vi.fn(async () => {});
vi.mock('firebase/firestore', () => ({ doc: vi.fn((_db, col, id) => `${col}/${id}`), updateDoc: (...a) => updateDoc(...a) }));
vi.mock('../firebaseConfig', () => ({ db: {}, auth: { currentUser: { uid: 'u1' } } }));
vi.mock('./ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

// UserContext simulado con estado real, para ver la sincronización.
let usuarioInicial = null;
vi.mock('./UserContext', async () => {
  const { createContext, useContext } = await import('react');
  const Ctx = createContext(null);
  return {
    UserProvider: ({ children }) => {
      const [userData, setUserData] = useState(usuarioInicial);
      return <Ctx.Provider value={{ userData, setUserData }}>{children}</Ctx.Provider>;
    },
    useUser: () => useContext(Ctx)
  };
});

const { UserProvider } = await import('./UserContext');
const { ThemeProvider, useTheme } = await import('./ThemeContext');
const { default: AjusteTema } = await import('../components/modulos/general/settings/ajusteTema/AjusteTema');

let sistemaOscuro = false;
const oyentes = new Set();

const ToggleAvatar = () => {
  const { oscuro, alternarOscuro } = useTheme();
  return <button data-testid="toggle-avatar" onClick={alternarOscuro}>{oscuro ? 'Modo Claro' : 'Modo Oscuro'}</button>;
};

const montar = () => render(
  <UserProvider>
    <ThemeProvider>
      <ToggleAvatar />
      <AjusteTema />
    </ThemeProvider>
  </UserProvider>
);

const radio = (nombre) => screen.getByRole('radio', { name: new RegExp(nombre) });
const esOscuro = () => document.documentElement.classList.contains('dark');

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  updateDoc.mockClear();
  sistemaOscuro = false;
  oyentes.clear();
  usuarioInicial = { nombreCompleto: 'X', modoPantalla: 'claro' };
  window.matchMedia = vi.fn(() => ({
    get matches() { return sistemaOscuro; },
    addEventListener: (_e, cb) => oyentes.add(cb),
    removeEventListener: (_e, cb) => oyentes.delete(cb)
  }));
});
afterEach(cleanup);

describe('ThemeContext', () => {
  it('el toggle del avatar aplica el tema al instante, lo guarda y Ajustes lo refleja', async () => {
    montar();
    expect(esOscuro()).toBe(false);
    expect(radio('Modo Claro').getAttribute('aria-checked')).toBe('true');

    await act(async () => { fireEvent.click(screen.getByTestId('toggle-avatar')); });

    expect(esOscuro()).toBe(true);
    expect(radio('Modo Oscuro').getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('toggle-avatar').textContent).toBe('Modo Claro');
    expect(localStorage.getItem('medra.tema')).toBe('oscuro');
    expect(updateDoc).toHaveBeenCalledWith('usuarios/u1', { modoPantalla: 'oscuro' });
  });

  it('Ajustes cambia el tema y el toggle del avatar lo refleja', async () => {
    montar();
    await act(async () => { fireEvent.click(radio('Modo Oscuro')); });
    expect(esOscuro()).toBe(true);
    expect(screen.getByTestId('toggle-avatar').textContent).toBe('Modo Claro');

    await act(async () => { fireEvent.click(radio('Modo Claro')); });
    expect(esOscuro()).toBe(false);
    expect(updateDoc).toHaveBeenLastCalledWith('usuarios/u1', { modoPantalla: 'claro' });
  });

  it('"Según el sistema" sigue prefers-color-scheme en vivo', async () => {
    montar();
    await act(async () => { fireEvent.click(radio('Según el sistema')); });
    expect(esOscuro()).toBe(false);

    await act(async () => { sistemaOscuro = true; oyentes.forEach(cb => cb({ matches: true })); });
    expect(esOscuro()).toBe(true);
  });

  it('la preferencia de la cuenta manda sobre la guardada en el navegador', () => {
    localStorage.setItem('medra.tema', 'claro');
    usuarioInicial = { modoPantalla: 'oscuro' };
    montar();
    expect(esOscuro()).toBe(true);
    expect(localStorage.getItem('medra.tema')).toBe('oscuro');
  });

  it('sin sesión usa la preferencia guardada en el navegador', () => {
    localStorage.setItem('medra.tema', 'oscuro');
    usuarioInicial = null;
    montar();
    expect(esOscuro()).toBe(true);
  });
});
