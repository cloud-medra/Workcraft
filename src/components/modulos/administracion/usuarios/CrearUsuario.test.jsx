// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(), deleteApp: vi.fn() }));
vi.mock('firebase/auth', () => ({ getAuth: vi.fn(), createUserWithEmailAndPassword: vi.fn(async () => ({ user: { uid: 'nuevo' } })), signOut: vi.fn() }));
const setDoc = vi.fn(async () => {});
const LAB = '/laboratorio/codigoLaboratorio';
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, col, id) => `${col}/${id}`), getDoc: vi.fn(), setDoc: (...a) => setDoc(...a), updateDoc: vi.fn(), serverTimestamp: vi.fn(), collection: vi.fn(),
  onSnapshot: (_ref, siguiente) => { siguiente({ docs: [{ id: 'lab__operador', data: () => ({ permisos: { laboratorio: [LAB] }, permisosGranulares: { [LAB]: {} } }) }] }); return () => {}; },
}));
const llamadas = [];
vi.mock('firebase/functions', () => ({ httpsCallable: (_f, nombre) => async (datos) => { llamadas.push({ nombre, datos }); return { data: { ok: true } }; } }));
vi.mock('../../../../firebaseConfig', () => ({ db: {}, auth: {}, firebaseConfig: {}, functions: {} }));
vi.mock('../../../../hooks/useCatalogo', () => ({
  useCatalogo: () => ({ datos: [{ id: 'lab', nombre: 'LABORATORIO', estado: 'ACTIVO' }, { id: 'vac', nombre: 'VACUNATORIO', estado: 'ACTIVO', usarEnGestiones: false }] }),
}));
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
const confirmAction = vi.fn();
vi.mock('../../../../context/ModalContext', () => ({ useModal: () => ({ confirmAction }) }));

const { default: CrearUsuario } = await import('./CrearUsuario');

afterEach(cleanup);

describe('Crear Usuario (mismo marco que Editar usuario)', () => {
  it('pide crear la cuenta antes de los permisos y avisa cambios sin guardar', () => {
    render(<CrearUsuario />);
    expect(screen.getByRole('heading', { name: 'Nuevo usuario' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Permisos/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Crear cuenta/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Volver' })).not.toBeInTheDocument();
    expect(screen.getByText('Centro de costo')).toBeInTheDocument();
    expect(screen.getByText(/Sin centro de costo, el usuario tendrá solo los permisos que le asignes/)).toBeInTheDocument();

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

describe('Crear Usuario con centro de costo', () => {
  const llenar = () => {
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Pérez' } });
    fireEvent.change(screen.getByLabelText('Nombre de usuario'), { target: { value: 'aperez' } });
    fireEvent.change(screen.getByLabelText('Correo'), { target: { value: 'ana@x.cl' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreto1' } });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'secreto1' } });
  };
  const elegirCentro = (nombre) => {
    fireEvent.click(screen.getByText('Sin centro de costo'));
    fireEvent.click(screen.getByText(nombre));
  };

  it('al elegir un centro configurado, la cuenta queda creada con sus permisos sin más pasos', async () => {
    llamadas.length = 0;
    render(<CrearUsuario />);
    llenar();
    elegirCentro('LABORATORIO');
    expect(screen.getByText(/Heredará los permisos de LABORATORIO – Operador/)).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /Crear cuenta/ })); });
    expect(setDoc).toHaveBeenCalledWith('usuarios/nuevo', expect.objectContaining({ permisos: {}, permisosGranulares: {} }));
    expect(llamadas).toEqual([{ nombre: 'guardarPermisosUsuario', datos: { uid: 'nuevo', centroCostoId: 'lab', excepciones: { agregados: [], quitados: [] } } }]);
    // Pestaña Permisos: ya tiene los del centro, heredados.
    expect(screen.getByLabelText('Habilitar Maestro Códigos')).toBeChecked();
    expect(screen.getByText('Hereda la plantilla de este centro y rol.')).toBeInTheDocument();
  });

  it('el centro + rol define la plantilla: LABORATORIO – Encargado no está configurado', () => {
    render(<CrearUsuario />);
    elegirCentro('LABORATORIO');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Rol'), { target: { value: 'encargado' } });
    expect(screen.getByRole('alert')).toHaveTextContent('LABORATORIO – Encargado de centro aún no tiene permisos configurados');
  });

  it('un centro sin configurar muestra el aviso con enlace a Permisos por centro', () => {
    const onIrAPermisosCentro = vi.fn();
    render(<CrearUsuario onIrAPermisosCentro={onIrAPermisosCentro} />);
    elegirCentro('VACUNATORIO');
    const aviso = screen.getByRole('alert');
    expect(aviso).toHaveTextContent('VACUNATORIO – Operador aún no tiene permisos configurados');
    fireEvent.click(within(aviso).getByRole('button', { name: /Configurar en Permisos por centro/ }));
    // Hay datos sin guardar (el centro elegido): pide confirmar antes de salir.
    expect(onIrAPermisosCentro).not.toHaveBeenCalled();
    expect(confirmAction).toHaveBeenCalledWith('Cambios sin guardar', expect.any(String), onIrAPermisosCentro, expect.any(Object));
  });
});
