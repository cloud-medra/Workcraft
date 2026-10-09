// @vitest-environment jsdom
// Maestros → Descripciones ocultas: listado con filas, buscador normalizado,
// filtro Todas / Ocultas / Visibles, orden por cantidad de filas y switches
// por módulo (con permiso).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const ENTRADAS = [
  { id: 'CESAREA', descripcion: 'CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMIA', filas: 40, ocultaImplantes: true, ocultaDocumentos: false },
  { id: 'RODILLA', descripcion: 'ARTROSCOPIA RODILLA', filas: 120 },
  { id: 'HOMBRO', descripcion: 'ARTROSCOPIA HOMBRO', filas: 8, ocultaImplantes: false, ocultaDocumentos: false },
];
const escrituras = [];
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...ruta) => ruta.join('/'),
  doc: (_db, ...ruta) => ruta.join('/'),
  serverTimestamp: () => 'ahora',
  onSnapshot: (_ref, siguiente) => { siguiente({ docs: ENTRADAS.map((e) => ({ id: e.id, data: () => e })) }); return () => {}; },
  updateDoc: async (ref, datos) => { escrituras.push({ ref, datos }); },
}));
vi.mock('../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('../../../../context/UserContext', () => ({ useUser: () => ({ userData: { uid: 'u1', nombreCompleto: 'Ana' } }) }));
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
let denegados = new Set();
vi.mock('../../../../hooks/useGranularPermission', () => ({
  useGranularPermission: () => ({ hasPermission: (_r, s, el) => !denegados.has(`${s}.${el}`) }),
}));
vi.mock('../../../../hooks/useColumnasPermitidas', () => ({ useColumnasPermitidas: () => ({ ver: () => true }) }));

const { default: DescripcionesOcultas } = await import('./DescripcionesOcultas');

beforeEach(() => { escrituras.length = 0; denegados = new Set(); });
afterEach(cleanup);
const filas = () => screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td').textContent);

describe('Descripciones ocultas', () => {
  it('lista con columnas, ordena por filas y filtra Todas / Ocultas / Visibles; busca sin tildes', () => {
    render(<DescripcionesOcultas />);
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Descripción', 'Filas', 'Ocultar en Implantes', 'Ocultar en Documentos']);
    expect(filas()).toEqual(['ARTROSCOPIA RODILLA', 'CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMIA', 'ARTROSCOPIA HOMBRO']);
    fireEvent.click(screen.getByRole('button', { name: 'Ordenar por cantidad de filas' }));
    expect(filas()).toEqual(['ARTROSCOPIA HOMBRO', 'CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMIA', 'ARTROSCOPIA RODILLA']);
    fireEvent.change(screen.getByLabelText('Filtrar descripciones'), { target: { value: 'ocultas' } });
    expect(filas()).toEqual(['CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMIA']);
    fireEvent.change(screen.getByLabelText('Filtrar descripciones'), { target: { value: 'visibles' } });
    expect(filas()).toEqual(['ARTROSCOPIA HOMBRO', 'ARTROSCOPIA RODILLA']);
    fireEvent.change(screen.getByLabelText('Filtrar descripciones'), { target: { value: 'todas' } });
    fireEvent.change(screen.getByLabelText('Buscar descripción'), { target: { value: 'cesárea  c/s' } });
    expect(filas()).toEqual(['CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMIA']);
  });

  it('un switch por módulo: ocultar en Documentos y volver a mostrar en Implantes', async () => {
    render(<DescripcionesOcultas />);
    const cesarea = screen.getByText('CESAREA C/S SALPINGOLIGADURA O SALPINGECTOMIA').closest('tr');
    const [impl, docs] = within(cesarea).getAllByRole('switch');
    expect(impl).toHaveAttribute('aria-checked', 'true');
    expect(docs).toHaveAttribute('aria-checked', 'false');
    await act(async () => { fireEvent.click(docs); });
    expect(escrituras[0]).toMatchObject({ ref: 'maestros_descripciones_reporte/CESAREA', datos: { ocultaDocumentos: true, actualizadoPor: 'Ana' } });
    await act(async () => { fireEvent.click(impl); });
    expect(escrituras[1].datos).toMatchObject({ ocultaImplantes: false });
    // Una descripción nueva (sin switches guardados) se ve como visible.
    const nueva = screen.getByText('ARTROSCOPIA RODILLA').closest('tr');
    within(nueva).getAllByRole('switch').forEach((s) => expect(s).toHaveAttribute('aria-checked', 'false'));
  });

  it('sin permiso de edición, los switches quedan deshabilitados', () => {
    denegados = new Set(['tabla_datos.action_editar']);
    render(<DescripcionesOcultas />);
    screen.getAllByRole('switch').forEach((s) => expect(s).toBeDisabled());
  });
});
