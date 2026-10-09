// @vitest-environment jsdom
// Reporte Info → columna "Gestión implante": badge por estado, filtro con
// contador (admisiones distintas), exportación a Excel y enlace "Abrir" a
// Implantes (una gestión → su detalle; varias → filtrado por admisión).
// Descripciones ocultas: consulta por módulo, "Mostrar ocultas", contadores,
// exportación, acción rápida y excepción de admisiones con gestión.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const RUTA_200 = 'implantes_gestiones/2026/mes/10/dia/05/admision/200/empresa/ACME/detalles/g1';
const MARCAS = {
  200: { estado: 'gestionada', cantidad: 1, itemsPendientes: 2, gestiones: { [RUTA_200.replaceAll('/', '|')]: {} } },
  300: { estado: 'cargada', cantidad: 2, itemsPendientes: 0, gestiones: { 'a|1': {}, 'a|2': {} } },
  400: { estado: 'imputada', cantidad: 1, itemsPendientes: 0, gestiones: { 'b|1': {} } },
};
const VISIBLE = { ocultaImplantes: false, ocultaDocumentos: false, descripcionOcultaImplantes: false };
// r2: CESAREA oculta en Implantes, pero su admisión tiene gestión (aviso).
// r6: CESAREA oculta en Implantes (sin gestión); visible en Documentos.
const REGISTROS = [
  { id: 'r1', Fecha: '2026-10-05', 'Admisión': 100, Paciente: 'ANA', 'Descripción': 'RODILLA', ...VISIBLE },
  { id: 'r2', Fecha: '2026-10-05', 'Admisión': 200, Paciente: 'BETO', 'Descripción': 'CESAREA', ...VISIBLE, descripcionOcultaImplantes: true },
  { id: 'r3', Fecha: '2026-10-04', 'Admisión': 300, Paciente: 'CARLA', 'Descripción': 'RODILLA', ...VISIBLE },
  { id: 'r4', Fecha: '2026-10-04', 'Admisión': '300', Paciente: 'CARLA', 'Descripción': 'Rodilla', ...VISIBLE },
  { id: 'r5', Fecha: '2026-10-03', 'Admisión': 400, Paciente: 'DANI', 'Descripción': 'HOMBRO', ...VISIBLE },
  { id: 'r6', Fecha: '2026-10-04', 'Admisión': 500, Paciente: 'EVA', 'Descripción': 'CESAREA', ...VISIBLE, ocultaImplantes: true, descripcionOcultaImplantes: true },
];
const filtrar = (ref) => {
  const w = ref.filtros?.[0];
  return w ? REGISTROS.filter((r) => r[w.campo] === w.valor) : REGISTROS;
};
const consultasRegistros = [];
const escrituras = [];
const lecturasMarcas = [];
const docs = (lista) => ({ docs: lista.map(({ id, ...d }) => ({ id, data: () => d })) });
vi.mock('firebase/firestore', () => ({
  collection: (_db, ...ruta) => ruta.join('/'),
  doc: (_db, ...ruta) => ruta.join('/'),
  query: (c, ...filtros) => ({ c, filtros }),
  where: (campo, _op, valor) => ({ campo, valor }),
  documentId: () => '__id__',
  writeBatch: vi.fn(), serverTimestamp: () => 'ahora',
  updateDoc: async (ref, datos) => { escrituras.push({ ref, datos }); },
  getDoc: async () => ({ exists: () => true, data: () => ({ filas: 7 }) }),
  getCountFromServer: async (ref) => ({ data: () => ({ count: filtrar(ref).length }) }),
  getDocs: async (ref) => {
    const ruta = typeof ref === 'string' ? ref : ref.c;
    if (ruta === 'documentos_reportesInfo') return docs([{ id: '2026' }]);
    if (ruta === 'documentos_reportesInfo/2026/meses') return docs([{ id: 'octubre' }]);
    if (ruta.endsWith('/registros')) { consultasRegistros.push(ref.filtros[0]); return docs(filtrar(ref)); }
    if (ruta === 'admisiones_gestionadas_implantes') {
      const ids = ref.filtros[0].valor;
      lecturasMarcas.push(ids);
      return docs(ids.filter((id) => MARCAS[id]).map((id) => ({ id, ...MARCAS[id] })));
    }
    throw new Error(`ruta inesperada ${ruta}`);
  },
}));
vi.mock('../../../../../firebaseConfig', () => ({ db: {}, auth: {} }));
vi.mock('react-dropzone', () => ({ useDropzone: () => ({ getRootProps: () => ({}), getInputProps: () => ({}), isDragActive: false }) }));
const excel = { filas: null, archivo: null };
vi.mock('xlsx', () => ({
  utils: { json_to_sheet: (f) => { excel.filas = f; return {}; }, book_new: () => ({}), book_append_sheet: () => {} },
  writeFile: (_l, nombre) => { excel.archivo = nombre; },
  read: vi.fn(),
}));
let usuario;
vi.mock('../../../../../context/UserContext', () => ({ useUser: () => ({ userData: usuario }) }));
// showToast estable: cargarPrimeraPagina depende de él.
const toast = { showToast: vi.fn() };
vi.mock('../../../../../context/ToastContext', () => ({ useToast: () => toast }));
let denegados;
vi.mock('../../../../../hooks/useGranularPermission', () => ({
  useGranularPermission: () => ({ hasPermission: (_r, s, el) => !denegados.has(`${s}.${el}`) }),
}));
let columnasOcultas;
vi.mock('../../../../../hooks/useColumnasPermitidas', () => ({
  useColumnasPermitidas: (_r, _t, cols) => ({ columnasVisibles: cols.filter((c) => !columnasOcultas.has(c.key)), ver: (k) => !columnasOcultas.has(k) }),
}));

const { default: ReportesInfo } = await import('./ReportesInfo');

beforeEach(() => {
  lecturasMarcas.length = 0; excel.filas = null; excel.archivo = null;
  denegados = new Set(); columnasOcultas = new Set();
  consultasRegistros.length = 0; escrituras.length = 0;
  usuario = { uid: 'u1', rol: 'usuario', permisos: { implantes: ['/implantes/gestionImplantes', '/implantes/reportesInfo'] } };
});
afterEach(cleanup);

const montar = async (props = {}, pathVista = '/implantes/reportesInfo') => {
  render(<ReportesInfo pathVista={pathVista} {...props} />);
  const [anio, mes] = screen.getAllByRole('combobox');
  await waitFor(() => expect(within(anio).getByText('2026')).toBeInTheDocument());
  fireEvent.change(anio, { target: { value: '2026' } });
  await waitFor(() => expect(within(mes).getByText('octubre')).toBeInTheDocument());
  fireEvent.change(mes, { target: { value: 'octubre' } });
  await waitFor(() => expect(document.querySelector('[data-estado="imputada"]')).toBeInTheDocument());
};
const estados = () => [...document.querySelectorAll('tbody [data-estado]')].map((b) => b.dataset.estado);

describe('Reporte Info → Gestión implante', () => {
  it('muestra el badge de cada admisión con su tooltip, leyendo solo las admisiones del mes', async () => {
    await montar();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toContain('Gestión implante');
    expect(estados()).toEqual(['pendiente', 'gestionada', 'cargada', 'cargada', 'imputada']);
    expect(lecturasMarcas).toEqual([['100', '200', '300', '400']]);
    const gestionada = document.querySelector('tbody [data-estado="gestionada"]');
    expect(gestionada).toHaveTextContent('Gestionada');
    expect(gestionada.title).toMatch(/faltan 2 ítem/);
    expect(document.querySelector('tbody [data-estado="pendiente"]').title).toBe('Sin gestión en Implantes');
    expect(document.querySelector('tbody [data-estado="imputada"] svg')).toBeInTheDocument(); // candado
  });

  it('marcar "Revisado" no vuelve a leer las marcas', async () => {
    await montar();
    const consultas = lecturasMarcas.length;
    const fila = document.querySelector('tbody [data-estado="pendiente"]').closest('tr');
    fireEvent.change(within(fila).getByRole('combobox'), { target: { value: 'Revisado' } });
    await waitFor(() => expect(within(fila).getByRole('combobox')).toHaveValue('Revisado'));
    expect(lecturasMarcas.length).toBe(consultas);
  });

  it('filtra por estado con contador de admisiones distintas', async () => {
    await montar();
    const filtro = screen.getByLabelText('Filtrar por gestión implante');
    expect([...filtro.options].map((o) => o.textContent)).toEqual([
      'Gestión implante (Todas)', 'Pendiente (1 adm.)', 'Gestionada (1 adm.)', 'Cargada (1 adm.)', 'Imputada (1 adm.)',
    ]);
    fireEvent.change(filtro, { target: { value: 'cargada' } });
    expect(estados()).toEqual(['cargada', 'cargada']);
    fireEvent.change(filtro, { target: { value: 'pendiente' } });
    expect(estados()).toEqual(['pendiente']);
  });

  it('exporta a Excel lo filtrado con estado, gestiones e ítems pendientes', async () => {
    await montar();
    fireEvent.change(screen.getByLabelText('Filtrar por gestión implante'), { target: { value: 'gestionada' } });
    fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));
    expect(excel.archivo).toBe('reportes_info_2026_octubre.xlsx');
    expect(excel.filas).toHaveLength(1);
    expect(excel.filas[0]).toMatchObject({ 'Admisión': 200, 'Gestión implante': 'Gestionada', Gestiones: 1, 'Ítems pendientes': 2 });
  });

  it('sin el permiso de exportar no aparece el botón; sin la columna, ni el badge ni el filtro', async () => {
    denegados = new Set(['cabecera_acciones.btn_exportar']);
    columnasOcultas = new Set(['gestionImplante']);
    render(<ReportesInfo pathVista="/documentos/reportesInfo" />);
    await waitFor(() => expect(within(screen.getAllByRole('combobox')[0]).getByText('2026')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Exportar Excel/ })).toBeNull();
    expect(screen.queryByLabelText('Filtrar por gestión implante')).toBeNull();
    expect(screen.queryAllByRole('columnheader').map((h) => h.textContent)).not.toContain('Gestión implante');
  });

  it('"Abrir": una gestión → su detalle; varias → filtrado por admisión', async () => {
    const onAbrir = vi.fn();
    await montar({ onAbrirGestionImplante: onAbrir });
    const botones = screen.getAllByRole('button', { name: 'Abrir la gestión en Implantes' });
    expect(botones).toHaveLength(4); // la pendiente no tiene enlace
    fireEvent.click(botones[0]);
    expect(onAbrir).toHaveBeenLastCalledWith({ admision: '200', refPath: RUTA_200 });
    fireEvent.click(botones[1]);
    expect(onAbrir).toHaveBeenLastCalledWith({ admision: '300' });
  });

  it('sin acceso a Gestiones no se muestra el enlace', async () => {
    usuario = { uid: 'u2', rol: 'usuario', permisos: { documentos: ['/documentos/reportesInfo'] } };
    await montar({ onAbrirGestionImplante: vi.fn() });
    expect(screen.queryByRole('button', { name: 'Abrir la gestión en Implantes' })).toBeNull();
  });
});

const ids = () => [...document.querySelectorAll('tbody tr')].map((tr) => within(tr).queryByText(/ANA|BETO|CARLA|DANI|EVA/)?.textContent);
const fila = (paciente) => screen.getAllByText(paciente)[0].closest('tr');
const pie = () => document.querySelector('.border-t.p-2') || document.body;

describe('Reporte Info → Descripciones ocultas', () => {
  it('Implantes consulta solo las visibles y cuenta las ocultas; no cuentan en los contadores', async () => {
    await montar();
    expect(consultasRegistros).toContainEqual({ campo: 'ocultaImplantes', valor: false });
    expect(ids()).toEqual(['ANA', 'BETO', 'CARLA', 'CARLA', 'DANI']);
    expect(screen.getByRole('switch', { name: /Mostrar ocultas \(1\)/ })).not.toBeChecked();
    expect(pie()).toHaveTextContent('Ocultas: 1');
    expect(pie()).toHaveTextContent('Pendiente: 5');
  });

  it('"Mostrar ocultas" las muestra atenuadas, con etiqueta y sin "Revisado"; los contadores no cambian', async () => {
    await montar();
    fireEvent.click(screen.getByRole('switch', { name: /Mostrar ocultas/ }));
    await waitFor(() => expect(screen.getByText('EVA')).toBeInTheDocument());
    const eva = fila('EVA');
    expect(eva).toHaveAttribute('data-oculta', 'true');
    expect(within(eva).getByText('Oculta')).toBeInTheDocument();
    expect(within(eva).getByText('No requiere')).toBeInTheDocument();
    expect(within(eva).queryByRole('combobox')).toBeNull();
    expect(pie()).toHaveTextContent('Pendiente: 5');
    expect([...screen.getByLabelText('Filtrar por gestión implante').options].map((o) => o.textContent)).toContain('Pendiente (1 adm.)');
    expect(consultasRegistros).toContainEqual({ campo: 'ocultaImplantes', valor: true });
  });

  it('la exportación excluye las ocultas salvo con "Mostrar ocultas"', async () => {
    await montar();
    fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));
    expect(excel.filas).toHaveLength(5);
    fireEvent.click(screen.getByRole('switch', { name: /Mostrar ocultas/ }));
    await waitFor(() => expect(screen.getByText('EVA')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Exportar Excel/ }));
    expect(excel.filas).toHaveLength(6);
    expect(excel.filas.find((f) => f.Paciente === 'EVA')).toMatchObject({ Oculta: 'Sí', Revisado: 'No requiere' });
  });

  it('Documentos consulta su propio campo: la oculta en Implantes sí se ve, sin aviso', async () => {
    await montar({}, '/documentos/reportesInfo');
    expect(consultasRegistros).toContainEqual({ campo: 'ocultaDocumentos', valor: false });
    expect(ids()).toContain('EVA');
    expect(document.querySelector('[data-aviso="gestion"]')).toBeNull();
  });

  it('excepción: descripción oculta con gestión en Implantes se muestra con aviso', async () => {
    await montar();
    expect(within(fila('BETO')).getByTitle(/la admisión tiene gestión/)).toBeInTheDocument();
    expect(within(fila('BETO')).queryByRole('button', { name: 'Ocultar esta descripción' })).toBeNull();
  });

  it('"Ocultar esta descripción": confirma con las filas afectadas, oculta en el módulo y deja visibles las que tienen gestión', async () => {
    await montar();
    fireEvent.click(within(fila('ANA')).getByRole('button', { name: 'Ocultar esta descripción' }));
    const dialogo = screen.getByRole('dialog', { name: 'Ocultar descripción' });
    await waitFor(() => expect(dialogo).toHaveTextContent('Afecta 7 fila(s) en total (3 en este mes)'));
    expect(dialogo).toHaveTextContent('2 fila(s) de este mes tienen gestión en Implantes');
    fireEvent.click(within(dialogo).getByRole('button', { name: /Ocultar/ }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(escrituras[0]).toMatchObject({ ref: 'maestros_descripciones_reporte/RODILLA', datos: { ocultaImplantes: true } });
    expect(escrituras[0].datos).not.toHaveProperty('ocultaDocumentos');
    expect(ids()).toEqual(['BETO', 'CARLA', 'CARLA', 'DANI']);
    expect(within(fila('CARLA')).getByTitle(/la admisión tiene gestión/)).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Mostrar ocultas \(2\)/ })).toBeInTheDocument();
  });

  it('sin permiso no hay switch ni acción rápida', async () => {
    denegados = new Set(['filas_ocultas.switch_mostrarOcultas', 'filas_ocultas.action_ocultarDescripcion']);
    await montar();
    expect(screen.queryByRole('switch', { name: /Mostrar ocultas/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Ocultar esta descripción' })).toBeNull();
  });
});
