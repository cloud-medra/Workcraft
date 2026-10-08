// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';

// App.jsx importa pantallas que usan Firebase; para probar solo la
// redirección se simulan esos módulos.
vi.mock('./firebaseConfig', () => ({ db: {}, auth: {}, firebaseConfig: {} }));
vi.mock('./components/LoginForm', () => ({ default: () => null }));
vi.mock('./pages/Dashboard', () => ({ default: () => null }));
vi.mock('./pages/auth/CambiarPassword', () => ({ default: () => null }));
vi.mock('./pages/TestPage', () => ({ default: () => null }));
vi.mock('./context/UserContext', () => ({ UserProvider: ({ children }) => children, useUser: () => ({}) }));

const { RedirigirDashboard } = await import('./App');

const Destino = () => {
  const { pathname, search, hash } = useLocation();
  return <p>{`${pathname}${search}${hash}`}</p>;
};

const visitar = (url) => render(
  <MemoryRouter initialEntries={[url]}>
    <Routes>
      <Route path="/plataforma/*" element={<Destino />} />
      <Route path="/dashboard/*" element={<RedirigirDashboard />} />
    </Routes>
  </MemoryRouter>
);

afterEach(cleanup);

describe('/dashboard → /plataforma', () => {
  it('redirige la ruta antigua', () => {
    visitar('/dashboard');
    expect(screen.getByText('/plataforma')).toBeInTheDocument();
  });

  it('conserva subruta, query y hash', () => {
    visitar('/dashboard/algo?x=1#seccion');
    expect(screen.getByText('/plataforma/algo?x=1#seccion')).toBeInTheDocument();
  });
});
