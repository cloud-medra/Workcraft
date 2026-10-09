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
const nombres = { m: { m1: 'Juan Pérez', m2: 'Ana Soto', m3: 'Pedro Rojas' }, c: { c1: 'Artroscopía', c2: 'Prótesis cadera' }, e: { e1: 'Acme', e2: 'Beta' } };
const DOCS = {
  'implantes_2026-10': { modulo: 'implantes', periodo: '2026-10', version: 2, definitivo: false, actualizadoEl: ts('2026-10-08T14:32:00'), nombres, t: { a: t('1', 'm1', 'c1', 'e1'), b: t('1', 'm1', 'c1', 'e2'), c: t('2', 'm2', 'c2', 'e1') } },
  'consignacion_2026-10': { modulo: 'consignacion', periodo: '2026-10', version: 2, definitivo: false, actualizadoEl: ts('2026-10-08T10:00:00'), nombres, t: { a: t('1', 'm1', 'c1', 'e1'), d: t('SINID-1', 'm1', 'c2', 'e2', { s: true }) } },
  // Enero se compara con diciembre del año anterior.
  'implantes_2026-01': { modulo: 'implantes', periodo: '2026-01', version: 1, definitivo: true, actualizadoEl: ts('2026-01-31T23:00:00'), nombres, t: { a: t('7', 'm1', 'c1', 'e1') } },
  'implantes_2025-12': { modulo: 'implantes', periodo: '2025-12', version: 1, definitivo: true, actualizadoEl: ts('2025-12-31T23:00:00'), nombres, t: { a: t('8', 'm3', 'c1', 'e1') } },
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
  obtenerIndice: async () => ({ periodos: { implantes: { '2025-12': { definitivo: true }, '2026-01': { definitivo: true }, '2026-09': { definitivo: true }, '2026-10': { definitivo: false } }, consignacion: { '2026-10': { definitivo: false } } } }),
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
    expect(await screen.findByRole('option', { name: 'Octubre (en curso)' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Mes' })).toHaveValue('2026-10');
    expect(screen.getByRole('button', { name: 'Comparar con mes anterior' })).toHaveAttribute('aria-pressed', 'true');
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
    fireEvent.change(await screen.findByRole('combobox', { name: 'Mes' }), { target: { value: '2026-09' } });
    expect(await screen.findByText(/cambios posteriores/)).toHaveTextContent('Hay 3 cambios posteriores al cierre en Implantes');
    fireEvent.click(screen.getByRole('button', { name: /Recalcular período/ }));
    expect(confirmAction).toHaveBeenCalledWith('Recalcular período cerrado', expect.stringContaining('3 cambio(s)'), expect.any(Function), expect.objectContaining({ type: 'warning' }));
  });

  it('sin rol admin no aparece Recalcular; sin permiso de un módulo no se ofrece ni se lee', async () => {
    denegados.add('filtros.opt_consignacion');
    render(<Estadisticas />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Mes' }), { target: { value: '2026-09' } });
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
    fireEvent.change(await screen.findByRole('combobox', { name: 'Mes' }), { target: { value: '2026-09' } });
    expect(await screen.findByText(/aún no tiene montos ni códigos/)).toBeInTheDocument();
  });
});

describe('Estadísticas: panel de detalle redimensionable', () => {
  beforeEach(() => localStorage.clear());

  it('el panel restaura el ancho guardado, lo cambia con el teclado y lo recuerda', async () => {
    localStorage.setItem('workcraft:anchoPanel:anonimo:estadisticas', '500');
    render(<Estadisticas />);
    fireEvent.click(await screen.findByRole('button', { name: 'Juan Pérez' }));
    const manija = within(screen.getByRole('dialog')).getByRole('separator', { name: 'Ancho del panel' });
    expect(manija).toHaveAttribute('aria-valuenow', '500');
    fireEvent.keyDown(manija, { key: 'ArrowLeft' });
    expect(manija).toHaveAttribute('aria-valuenow', '516');
    expect(localStorage.getItem('workcraft:anchoPanel:anonimo:estadisticas')).toBe('516');
  });

  it('el detalle se abre aparte (el Top 10 sigue visible), con columnas redimensionables, y cierra con el fondo', async () => {
    render(<Estadisticas />);
    fireEvent.click(await screen.findByRole('button', { name: 'Juan Pérez' }));
    const panel = screen.getByRole('dialog');
    expect(screen.getByText(/^Top 10/)).toBeInTheDocument();
    expect(within(panel).queryByText(/^Top 10/)).not.toBeInTheDocument();
    expect(within(panel).getAllByTitle(/Arrastra para redimensionar/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Estadísticas: año, mes y modo', () => {
  const opciones = (nombre) => within(screen.getByRole('combobox', { name: nombre })).getAllByRole('option').map((o) => o.textContent);
  const encabezados = () => screen.getAllByRole('columnheader').map((h) => h.textContent);

  it('solo ofrece años y meses con datos, según el filtro de módulo; al cambiar de año toma el mes más reciente', async () => {
    render(<Estadisticas />);
    await screen.findByRole('button', { name: 'Juan Pérez' });
    expect(opciones('Año')).toEqual(['2026', '2025']);
    expect(opciones('Mes')).toEqual(['Octubre (en curso)', 'Septiembre', 'Enero']);
    fireEvent.change(screen.getByRole('combobox', { name: 'Año' }), { target: { value: '2025' } });
    expect(opciones('Mes')).toEqual(['Diciembre']);
    expect(screen.getByRole('combobox', { name: 'Mes' })).toHaveValue('2025-12');
    // Consignación solo tiene octubre 2026.
    fireEvent.click(screen.getByRole('button', { name: 'Consignación' }));
    expect(opciones('Año')).toEqual(['2026']);
    expect(opciones('Mes')).toEqual(['Octubre (en curso)']);
  });

  it('enero se compara con diciembre del año anterior', async () => {
    render(<Estadisticas />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Mes' }), { target: { value: '2026-01' } });
    expect(await screen.findByRole('button', { name: 'Pedro Rojas' })).toBeInTheDocument();
    expect(encabezados()).toEqual(expect.arrayContaining(['Enero 2026', 'Diciembre 2025']));
    expect(filas()).toEqual([['Juan Pérez', '1', '0'], ['Pedro Rojas', '0', '1']]);
    expect(leidos).toContain('implantes_2025-12');
  });

  it('"Solo un mes" quita lo comparativo y las filas en 0; volver a comparar y "Mes actual" lo restauran', async () => {
    render(<Estadisticas />);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Mes' }), { target: { value: '2026-01' } });
    await screen.findByRole('button', { name: 'Pedro Rojas' });
    fireEvent.click(screen.getByRole('columnheader', { name: /Diferencia/ }).querySelector('button'));
    leidos.length = 0;
    fireEvent.click(screen.getByRole('button', { name: 'Solo un mes' }));
    await screen.findByRole('button', { name: 'Juan Pérez' });
    expect(screen.queryByRole('button', { name: 'Pedro Rojas' })).not.toBeInTheDocument();
    expect(encabezados()).not.toEqual(expect.arrayContaining(['Diciembre 2025']));
    expect(screen.queryByRole('columnheader', { name: /Diferencia|Variación|Monto anterior|Dif\. monto|Var\. monto/ })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Enero 2026/ })).toHaveAttribute('aria-sort', 'descending');
    expect(screen.queryByText(/Diciembre 2025:/)).not.toBeInTheDocument(); // línea "mes anterior" de las tarjetas
    expect(screen.queryByText('Diciembre 2025')).not.toBeInTheDocument(); // leyenda del Top 10
    expect(leidos).not.toContain('implantes_2025-12'); // sin comparación no se lee el mes anterior

    fireEvent.click(screen.getByRole('button', { name: 'Comparar con mes anterior' }));
    expect(await screen.findByRole('button', { name: 'Pedro Rojas' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Diciembre 2025/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Mes' })).toHaveValue('2026-01');

    fireEvent.click(screen.getByRole('button', { name: 'Solo un mes' }));
    fireEvent.click(screen.getByRole('button', { name: /Mes actual/ }));
    expect(screen.getByRole('combobox', { name: 'Mes' })).toHaveValue('2026-10');
    expect(screen.getByRole('button', { name: 'Comparar con mes anterior' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('columnheader', { name: /Septiembre 2026/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mes actual/ })).toBeDisabled();
  });

  it('el detalle en "Solo un mes" no muestra comparación', async () => {
    render(<Estadisticas />);
    await screen.findByRole('button', { name: 'Juan Pérez' });
    fireEvent.click(screen.getByRole('button', { name: 'Solo un mes' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Juan Pérez' }));
    const panel = screen.getByRole('dialog');
    expect(within(panel).queryByText(/Septiembre 2026/)).not.toBeInTheDocument();
    expect(within(panel).queryByRole('columnheader', { name: /Variación/ })).not.toBeInTheDocument();
  });
});
