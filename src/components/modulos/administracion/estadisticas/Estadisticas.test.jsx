// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const denegados = new Set();
let rol = 'operador';
const confirmAction = vi.fn();
vi.mock('../../../../hooks/useGranularPermission', () => ({
  useGranularPermission: () => ({ hasPermission: (_r, sec, el) => !denegados.has(el ? `${sec}.${el}` : sec) })
}));
vi.mock('../../../../hooks/useColumnasPermitidas', () => ({
  useColumnasPermitidas: (_r, _s, columnas) => ({ columnasVisibles: columnas, ver: () => true })
}));
vi.mock('../../../../context/UserContext', () => ({ useUser: () => ({ userData: { rol } }) }));
vi.mock('../../../../context/ModalContext', () => ({ useModal: () => ({ confirmAction }) }));
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../../../firebaseConfig', () => ({ functions: {} }));
vi.mock('firebase/functions', () => ({ httpsCallable: vi.fn() }));
vi.mock('./exportarEstadisticas', () => ({ exportarEstadisticas: vi.fn(), filasParaExcel: (f) => f }));

const ts = (s) => ({ toDate: () => new Date(s), toMillis: () => new Date(s).getTime() });
const t = (a, m, c, e, extra) => ({ a, m, c, e, n: 1, ...extra });
const nombres = { m: { m1: 'Juan Pérez', m2: 'Ana Soto' }, c: { c1: 'Artroscopía', c2: 'Prótesis cadera' }, e: { e1: 'Acme', e2: 'Beta' } };
const DOCS = {
  'implantes_2026-10': { modulo: 'implantes', periodo: '2026-10', version: 2, definitivo: false, actualizadoEl: ts('2026-10-08T14:32:00'), nombres, t: { a: t('1', 'm1', 'c1', 'e1'), b: t('1', 'm1', 'c1', 'e2'), c: t('2', 'm2', 'c2', 'e1') } },
  'consignacion_2026-10': { modulo: 'consignacion', periodo: '2026-10', version: 2, definitivo: false, actualizadoEl: ts('2026-10-08T10:00:00'), nombres, t: { a: t('1', 'm1', 'c1', 'e1'), d: t('SINID-1', 'm1', 'c2', 'e2', { s: true }) } },
  'implantes_2026-09': { modulo: 'implantes', periodo: '2026-09', version: 1, definitivo: true, cambiosTrasCierre: 3, actualizadoEl: ts('2026-09-30T23:00:00'), nombres, t: { a: t('5', 'm1', 'c1', 'e1') } },
  'implantes_2026-10__montos': { t: { a: { $: 1500000, sp: 0 }, b: { $: 500000, sp: 2 }, c: { $: 300000, sp: 0 } }, l: { l1: { $: 1500000, p: { 500000: 2, 600000: 1 } }, l2: { $: 300000, p: { 150000: 2 } } } },
  'consignacion_2026-10__montos': { t: { a: { $: 0, sp: 0 }, d: { $: 0, sp: 0 } }, l: {} },
  'implantes_2026-10__codigos': {
    codigos: { k1: { c: 'IMP-100', d: 'Placa bloqueada' }, k2: { c: 'IMP-200', d: 'Tornillo cortical' } },
    l: { l1: { a: '1', m: 'm1', c: 'c1', e: 'e1', k: 'k1', q: 3, n: 3 }, l2: { a: '2', m: 'm2', c: 'c2', e: 'e1', k: 'k2', q: 2, n: 1 } },
  },
  'consignacion_2026-10__codigos': { codigos: {}, l: {} },
};
const leidos = [];
const leer = (id) => { leidos.push(id); return DOCS[id] || null; };
vi.mock('./estadisticasStore', () => ({
  obtenerIndice: async () => ({ periodos: { implantes: { '2026-09': { definitivo: true }, '2026-10': { definitivo: false } }, consignacion: { '2026-10': { definitivo: false } } } }),
  obtenerPeriodo: async (modulo, clave) => { const d = leer(`${modulo}_${clave}`); return d ? { ...d, piezas: [d] } : null; },
  obtenerMontos: async (base) => { const d = leer(`${base.modulo}_${base.periodo}__montos`); return d ? { ...d, modulo: base.modulo, piezas: [d] } : null; },
  obtenerCodigos: async (base) => { const d = leer(`${base.modulo}_${base.periodo}__codigos`); return d ? { ...d, modulo: base.modulo, piezas: [d] } : null; },
  invalidarPeriodo: vi.fn(),
}));

import Estadisticas from './Estadisticas';

beforeEach(() => { denegados.clear(); rol = 'operador'; leidos.length = 0; });
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const filas = () => screen.getAllByRole('row').slice(1, -1).map((r) => within(r).getAllByRole('cell').slice(0, 3).map((c) => c.textContent.trim()));

describe('Estadísticas', () => {
  it('abre en el período en curso con Todos: admisiones distintas entre módulos y comparación', async () => {
    render(<Estadisticas />);
    expect(await screen.findByRole('option', { name: 'Octubre 2026 (en curso)' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Juan Pérez' })).toBeInTheDocument();
    // Admisiones: 1 (en ambos módulos, cuenta una), 2 y una sin ID = 3
    const tarjeta = screen.getByText('Admisiones', { selector: 'span' }).closest('div').parentElement;
    expect(tarjeta).toHaveTextContent('3');
    expect(screen.getByText(/Sin ID:/)).toHaveTextContent('Sin ID: 1');
    expect(filas()).toEqual([['Juan Pérez', '2', '1'], ['Ana Soto', '1', '0']]);
    expect(screen.getByText(/Última actualización/).parentElement).toHaveTextContent('08-10-2026');
  });

  it('el detalle sale de los datos cargados, sin leer más', async () => {
    render(<Estadisticas />);
    fireEvent.click(await screen.findByRole('button', { name: 'Juan Pérez' }));
    const panel = screen.getByRole('dialog');
    expect(within(panel).getByText('Cirugías')).toBeInTheDocument();
    expect(within(panel).getByText('Artroscopía')).toBeInTheDocument();
    expect(within(panel).getByText('Beta')).toBeInTheDocument();
    await within(panel).findByText('IMP-100'); // el detalle carga los códigos una vez
    const lecturas = leidos.length;
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('tab', { name: /Empresas/ }));
    fireEvent.click(screen.getByRole('tab', { name: /Cirugías/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Prótesis cadera' }));
    expect(leidos.length).toBe(lecturas);
  });

  it('período cerrado con cambios: aviso y recalcular solo para admin', async () => {
    rol = 'admin';
    render(<Estadisticas />);
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: '2026-09' } });
    expect(await screen.findByText(/cambios posteriores/)).toHaveTextContent('Hay 3 cambios posteriores al cierre en Implantes');
    fireEvent.click(screen.getByRole('button', { name: /Recalcular período/ }));
    expect(confirmAction).toHaveBeenCalledWith('Recalcular período cerrado', expect.stringContaining('3 cambio(s)'), expect.any(Function), expect.objectContaining({ type: 'warning' }));
  });

  it('sin rol admin no aparece Recalcular; sin permiso de un módulo no se ofrece ni se lee', async () => {
    denegados.add('filtros.opt_consignacion');
    render(<Estadisticas />);
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: '2026-09' } });
    await screen.findByText(/cambios posteriores/);
    expect(screen.queryByRole('button', { name: /Recalcular/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consignación' })).not.toBeInTheDocument();
    expect(leidos.some((id) => id.startsWith('consignacion'))).toBe(false);
  });
});

describe('Estadísticas: montos y códigos', () => {
  it('con "Ver montos": tarjeta de monto con "Sin precio" y columnas de monto', async () => {
    render(<Estadisticas />);
    expect(await screen.findByText('Monto total')).toBeInTheDocument();
    expect(screen.getByText('Monto total').closest('div').parentElement).toHaveTextContent('$2.300.000');
    expect(screen.getByText(/Sin precio:/)).toHaveTextContent('Sin precio: 2');
    expect(screen.getByRole('columnheader', { name: /^Monto$/ })).toBeInTheDocument();
    expect(screen.queryByText(/venta/i)).not.toBeInTheDocument();
  });

  it('sin "Ver montos": no hay tarjeta, columnas ni lectura de montos', async () => {
    denegados.add('acciones.ver_montos');
    render(<Estadisticas />);
    await screen.findByRole('button', { name: 'Juan Pérez' });
    expect(screen.queryByText('Monto total')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /^Monto$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Monto' })).not.toBeInTheDocument();
    expect(leidos.some((id) => id.includes('__montos'))).toBe(false);
  });

  it('los códigos se leen solo al abrir la pestaña; precio promedio con variación y detalle', async () => {
    render(<Estadisticas />);
    await screen.findByRole('button', { name: 'Juan Pérez' });
    expect(leidos.some((id) => id.includes('__codigos'))).toBe(false);
    fireEvent.click(screen.getByRole('tab', { name: /Códigos/ }));
    const placa = await screen.findByRole('button', { name: 'IMP-100' });
    expect(leidos.filter((id) => id.includes('__codigos'))).toEqual(['implantes_2026-10__codigos', 'consignacion_2026-10__codigos']);
    const fila = placa.closest('tr');
    expect(fila).toHaveTextContent('Placa bloqueada');
    expect(fila).toHaveTextContent('$500.000'); // promedio 1.500.000 / 3
    expect(within(fila).getByLabelText('Precio con variación')).toBeInTheDocument();
    fireEvent.click(placa);
    const panel = screen.getByRole('dialog');
    expect(within(panel).getByText('Médicos')).toBeInTheDocument();
    expect(within(panel).getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('detalle de un médico: sección Códigos ordenada por monto', async () => {
    render(<Estadisticas />);
    fireEvent.click(await screen.findByRole('button', { name: 'Juan Pérez' }));
    const panel = screen.getByRole('dialog');
    expect(await within(panel).findByText('IMP-100')).toBeInTheDocument();
    expect(within(panel).getByText('Códigos')).toBeInTheDocument();
  });

  it('período en formato anterior: aviso para recalcular con --version-antigua', async () => {
    render(<Estadisticas />);
    fireEvent.change(await screen.findByRole('combobox'), { target: { value: '2026-09' } });
    expect(await screen.findByText(/aún no tiene montos ni códigos/)).toBeInTheDocument();
  });
});
