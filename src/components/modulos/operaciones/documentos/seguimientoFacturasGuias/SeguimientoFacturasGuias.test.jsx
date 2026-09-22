// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import SeguimientoFacturasGuias from './SeguimientoFacturasGuias';

const mockGetDocs = vi.fn();
const mockWhere = vi.fn((...args) => ({ _type: 'where', args }));

vi.mock('../../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('../../../../../hooks/useGranularPermission', () => ({
  useGranularPermission: () => ({ hasPermission: () => true })
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, ...seg) => ({ _type: 'collection', path: seg.join('/') })),
  collectionGroup: vi.fn((_db, nombre) => ({ _type: 'collectionGroup', nombre })),
  query: vi.fn((ref, ...c) => ({ ...ref, _c: c })),
  where: (...args) => mockWhere(...args),
  orderBy: vi.fn(),
  limit: vi.fn(),
  documentId: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args)
}));

const docsDeIds = (ids, dataFn = () => ({})) => ({ docs: ids.map((id) => ({ id, ref: { path: `x/${id}` }, data: () => dataFn(id) })) });

describe('SeguimientoFacturasGuias', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
    mockWhere.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('muestra primero el selector de tipo de seguimiento', () => {
    render(<SeguimientoFacturasGuias />);
    expect(screen.getByText('Seguimiento de Facturas')).toBeInTheDocument();
    expect(screen.getByText('Seguimiento de Guías')).toBeInTheDocument();
    expect(screen.queryByText('Año')).not.toBeInTheDocument();
  });

  // El comportamiento exacto del filtro de servidor (estado vs. numero_guia)
  // ya está cubierto a fondo, con datos y timing controlados, en
  // useDocumentosSistemaPeriodo.test.js. Acá solo se verifica que, al elegir
  // cada criterio, los filtros aparecen (año habilitado) — el detalle de
  // qué where() exacto arma cada uno se prueba a nivel de hook, no de DOM.
  it('al elegir "Facturas", se muestra la barra de filtros con el año habilitado', async () => {
    mockGetDocs.mockResolvedValue(docsDeIds([]));
    render(<SeguimientoFacturasGuias />);

    fireEvent.click(screen.getByText('Seguimiento de Facturas'));
    const selectAnio = await screen.findByDisplayValue('Año');
    expect(selectAnio).toBeEnabled();
  });

  it('al elegir "Guías", se muestra la barra de filtros con el año habilitado', async () => {
    mockGetDocs.mockResolvedValue(docsDeIds([]));
    render(<SeguimientoFacturasGuias />);

    fireEvent.click(screen.getByText('Seguimiento de Guías'));
    const selectAnio = await screen.findByDisplayValue('Año');
    expect(selectAnio).toBeEnabled();
  });

  it('el botón "Volver" regresa al selector inicial', async () => {
    mockGetDocs.mockResolvedValue(docsDeIds([]));
    render(<SeguimientoFacturasGuias />);

    fireEvent.click(screen.getByText('Seguimiento de Facturas'));
    await screen.findByText('Año');

    fireEvent.click(screen.getByTitle('Volver'));
    expect(screen.getByText('Seguimiento de Guías')).toBeInTheDocument();
    expect(screen.queryByText('Año')).not.toBeInTheDocument();
  });

  it('los selects de Mes y Empresa no muestran una opción "Todos"/"Todas"', async () => {
    mockGetDocs.mockResolvedValue(docsDeIds([]));
    render(<SeguimientoFacturasGuias />);
    fireEvent.click(screen.getByText('Seguimiento de Facturas'));
    await screen.findByText('Año');

    expect(screen.queryByText(/\(Todos\)/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\(Todas\)/)).not.toBeInTheDocument();
  });
});
