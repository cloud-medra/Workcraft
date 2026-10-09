// @vitest-environment jsdom
// Listado Usuario con centro de costo: columna, filtro, indicador de permisos
// personalizados, asignación masiva y activar/inactivar por la Cloud
// Function (que protege al último administrador).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const llamadas = [];
let respuesta = async () => ({ data: { actualizados: 2, ok: true } });
vi.mock('firebase/functions', () => ({ httpsCallable: (_f, nombre) => async (datos) => { llamadas.push({ nombre, datos }); return respuesta(nombre, datos); } }));
const USUARIOS = [
  { id: 'yo', nombreCompleto: 'Admin', nombreUsuario: 'admin', email: 'a@x.cl', rol: 'admin' },
  { id: 'ana', nombreCompleto: 'Ana Lab', nombreUsuario: 'ana', email: 'ana@x.cl', rol: 'operador', centroCostoId: 'lab', excepciones: { agregados: ['v|/x'], quitados: [] } },
  { id: 'luis', nombreCompleto: 'Luis Lab', nombreUsuario: 'luis', email: 'luis@x.cl', rol: 'operador', centroCostoId: 'lab', excepciones: { agregados: [], quitados: [] } },
];
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(), query: vi.fn(), orderBy: vi.fn(), doc: vi.fn(), deleteDoc: vi.fn(),
  onSnapshot: (_q, siguiente) => { siguiente({ docs: USUARIOS.map((u) => ({ id: u.id, data: () => u })) }); return () => {}; },
}));
vi.mock('../../../../firebaseConfig', () => ({ db: {}, functions: {} }));
const showToast = vi.fn();
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => ({ showToast }) }));
const confirmAction = vi.fn();
vi.mock('../../../../context/ModalContext', () => ({ useModal: () => ({ confirmAction }) }));
vi.mock('../../../../hooks/useCatalogo', () => ({
  useCatalogo: () => ({ datos: [{ id: 'lab', nombre: 'UNIDAD DE LABORATORIO', estado: 'ACTIVO' }, { id: 'prev', nombre: 'UNIDAD DE PREVENCIÓN', estado: 'ACTIVO', usarEnGestiones: false }] }),
}));

const { default: ListadoUsuario } = await import('./ListadoUsuario');

beforeEach(() => { llamadas.length = 0; confirmAction.mockClear(); showToast.mockClear(); });
afterEach(cleanup);
const fila = (nombre) => screen.getByText(nombre).closest('tr');

describe('Listado Usuario: centro de costo', () => {
  it('muestra la columna, el indicador de personalizados y filtra por centro', () => {
    render(<ListadoUsuario />);
    expect(screen.getByRole('columnheader', { name: 'Centro de costo' })).toBeInTheDocument();
    expect(within(fila('Ana Lab')).getByText('UNIDAD DE LABORATORIO')).toBeInTheDocument();
    expect(within(fila('Ana Lab')).getByText(/Personalizado \+1\/−0/)).toBeInTheDocument();
    expect(within(fila('Luis Lab')).queryByText(/Personalizado/)).not.toBeInTheDocument();
    expect(within(fila('Admin')).getByText('Sin centro')).toBeInTheDocument();

    const filtro = screen.getByLabelText('Filtrar por centro de costo');
    fireEvent.change(filtro, { target: { value: 'sin' } });
    expect(screen.queryByText('Ana Lab')).not.toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    fireEvent.change(filtro, { target: { value: 'lab' } });
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.getByText('Luis Lab')).toBeInTheDocument();
  });

  it('asigna un centro de costo a varios usuarios seleccionados (incluye centros "solo usuarios")', async () => {
    render(<ListadoUsuario />);
    fireEvent.click(screen.getByLabelText('Seleccionar Ana Lab'));
    fireEvent.click(screen.getByLabelText('Seleccionar Luis Lab'));
    const barra = screen.getByRole('region', { name: 'Asignación masiva' });
    expect(barra).toHaveTextContent('2 seleccionado(s)');
    fireEvent.click(within(barra).getByText('Elegir centro…'));
    fireEvent.click(screen.getByText('UNIDAD DE PREVENCIÓN'));
    expect(confirmAction).toHaveBeenCalledWith('Asignar centro de costo', expect.stringContaining('a 2 usuario(s)'), expect.any(Function), expect.any(Object));
    await act(async () => { await confirmAction.mock.calls[0][2](); });
    expect(llamadas[0]).toEqual({ nombre: 'asignarCentroCostoMasivo', datos: { uids: ['ana', 'luis'], centroCostoId: 'prev' } });
    expect(screen.queryByRole('region', { name: 'Asignación masiva' })).not.toBeInTheDocument();
  });

  it('activar/inactivar pasa por la función y muestra su error (último administrador)', async () => {
    respuesta = async () => { const e = new Error('No se puede: es el último administrador activo del sistema.'); e.code = 'functions/failed-precondition'; throw e; };
    render(<ListadoUsuario />);
    await act(async () => { fireEvent.click(within(fila('Admin')).getByTitle('Inactivar usuario')); });
    expect(llamadas[0]).toEqual({ nombre: 'guardarPermisosUsuario', datos: { uid: 'yo', datos: { activo: false } } });
    expect(showToast).toHaveBeenCalledWith('No se puede: es el último administrador activo del sistema.', 'error');
  });
});
