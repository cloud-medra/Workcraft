// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(), deleteApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), createUserWithEmailAndPassword: vi.fn(), signOut: vi.fn() }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), serverTimestamp: vi.fn() }));
vi.mock('../../../../firebaseConfig', () => ({ db: {}, auth: {}, firebaseConfig: {} }));
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));

const { default: CrearUsuario } = await import('./CrearUsuario');

afterEach(cleanup);

describe('Crear Usuario (mismo marco que Editar usuario)', () => {
  it('pide crear la cuenta antes de los permisos y avisa cambios sin guardar', () => {
    render(<CrearUsuario />);
    expect(screen.getByRole('heading', { name: 'Nuevo usuario' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Permisos/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Crear cuenta/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Pérez' } });
    expect(screen.getByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument();
    expect(screen.getByText('Tienes cambios sin guardar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Cambios sin guardar');
    fireEvent.click(screen.getByText('Salir sin guardar'));
    expect(screen.getByRole('heading', { name: 'Nuevo usuario' })).toBeInTheDocument();
    expect(screen.queryByText('Tienes cambios sin guardar')).not.toBeInTheDocument();
  });
});
