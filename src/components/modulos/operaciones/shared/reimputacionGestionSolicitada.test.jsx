// @vitest-environment jsdom
// Editar una gestión YA SOLICITADA de Implantes o Hemodinamia no debe
// cambiar el período donde está imputada: la resincronización, el borrado
// de ítems y el candado usan el período de solicitud, no el de carga.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const escrituras = [];
const abiertos = new Set();
let docGestion = null;

vi.mock('firebase/firestore', () => {
  const ruta = (...partes) => ({ path: partes.filter((p) => typeof p === 'string').join('/') });
  return {
    collection: (_db, ...p) => ruta(...p),
    collectionGroup: () => ({}),
    doc: (base, ...p) => (base && base.path && p.length === 0 ? { path: `${base.path}/nuevo${escrituras.length}`, id: `nuevo${escrituras.length}` } : base && base.path ? ruta(base.path, ...p) : ruta(...p)),
    query: () => ({}), where: () => ({}), orderBy: () => ({}), limit: () => ({}), documentId: () => '__name__',
    getDocs: async () => ({ empty: true, docs: [], size: 0 }),
    addDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(),
    serverTimestamp: () => 'ts',
    writeBatch: () => ({
      set: (ref, data, opts) => escrituras.push({ op: 'set', path: ref.path, data, opts }),
      update: (ref, data) => escrituras.push({ op: 'update', path: ref.path, data }),
      delete: (ref) => escrituras.push({ op: 'delete', path: ref.path }),
      commit: async () => {},
    }),
  };
});
vi.mock('../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('../../../../hooks/useVisibleSnapshot', () => ({
  onSnapshotVisible: (_ref, cb) => { cb({ exists: () => true, id: 'g1', ref: { path: docGestion.refPath }, data: () => docGestion.data }); return () => {}; },
}));
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../../../context/ModalContext', () => ({ useModal: () => ({ confirmAction: vi.fn() }) }));
vi.mock('../../../../context/UserContext', () => ({ useUser: () => ({ userData: { nombreCompleto: 'Ana' } }) }));
const abierto = async (anio, mes) => abiertos.has(`${anio}_${mes}`);
vi.mock('../implantes/gestionImplantes/components/Cargastab/verificacionPeriodoBloque', () => ({ periodoEstaAbierto: (a, m) => abierto(a, m) }));
vi.mock('../hemodinamia/gestionHemodinamia/components/Cargastab/verificacionPeriodoBloque', () => ({ periodoEstaAbierto: (a, m) => abierto(a, m) }));
vi.mock('../implantes/gestionImplantes/utils/registrarLogImplantes', () => ({ registrarLogImplantes: vi.fn() }));
vi.mock('../hemodinamia/gestionHemodinamia/utils/registrarLogHemodinamia', () => ({ registrarLogHemodinamia: vi.fn() }));

import { useGestionesImplantesData } from '../implantes/gestionImplantes/hooks/useGestionesImplantesData';
import { useGestionesHemodinamiaData } from '../hemodinamia/gestionHemodinamia/hooks/useGestionesHemodinamiaData';

const MODULOS = [
  { nombre: 'Implantes', hook: useGestionesImplantesData, raiz: 'implantes_gestiones', imputadas: 'implantes_imputadas' },
  { nombre: 'Hemodinamia', hook: useGestionesHemodinamiaData, raiz: 'hemodinamia_gestiones', imputadas: 'hemodinamia_imputadas' },
];

// Ítems cargados en SEPTIEMBRE; el bloque se solicitó en OCTUBRE.
const it1 = { id: 'it1', referencia: 'R1', cantidad: 1, periodoAnio: '2026', periodoMes: 'septiembre' };
const it2 = { id: 'it2', referencia: 'R2', cantidad: 1, periodoAnio: '2026', periodoMes: 'septiembre' };

const preparar = (raiz, solicitud) => {
  docGestion = {
    refPath: `${raiz}/2026/mes/09/dia/15/admision/100/empresa/ACME/detalles/g1`,
    data: { gestionId: '100', agendaId: '100', fecha: '2026-09-15', empresa: 'ACME', nombre: 'ANA', cotizaciones: [{ items: [it1, it2] }], ...solicitud },
  };
};

const guardar = async (hook, registro) => {
  const { result } = renderHook(() => hook({ refPath: docGestion.refPath }));
  await waitFor(() => expect(result.current.implantes).toHaveLength(1));
  await act(async () => {
    await result.current.guardarDesdeDetalle({
      admisionId: '100',
      paciente: { nombre: 'ANA' },
      registrosActualizados: [{ id: 'g1', gestionId: '100', empresa: 'ACME', fecha: '2026-09-15', solicitud: 'SOLICITADO', cotizaciones: [{ items: [{ ...it1, cantidad: 3 }, it2] }], ...registro }],
    }, { toastExito: false });
  });
};

const imputadasEscritas = (col) => escrituras.filter((e) => e.path.startsWith(col));

beforeEach(() => { escrituras.length = 0; abiertos.clear(); });

describe.each(MODULOS)('$nombre: editar una gestión ya solicitada', ({ hook, raiz, imputadas }) => {
  it('resincroniza en el período de SOLICITUD (texto legado "Octubre 2026"), no en el de carga', async () => {
    abiertos.add('2026_octubre').add('2026_septiembre');
    preparar(raiz, { solicitud: 'SOLICITADO', periodo: 'Octubre 2026' });
    await guardar(hook);
    const rutas = imputadasEscritas(imputadas).map((e) => `${e.op} ${e.path}`);
    expect(rutas).toEqual([
      `set ${imputadas}/2026/meses/octubre/documentos/it1`,
      `set ${imputadas}/2026/meses/octubre/documentos/it2`,
    ]);
    expect(imputadasEscritas(imputadas)[0].data).toMatchObject({ periodoAnio: '2026', periodoMes: 'octubre', cantidad: 3 });
  });

  it('con el campo estructurado; borrar un ítem lo quita del período de solicitud', async () => {
    abiertos.add('2026_octubre');
    preparar(raiz, { solicitud: 'SOLICITADO', periodo: 'Octubre 2026', periodoSolicitudAnio: '2026', periodoSolicitudMes: 'octubre' });
    await guardar(hook, { cotizaciones: [{ items: [it1] }], itemsEliminados: [it2] });
    const rutas = imputadasEscritas(imputadas).map((e) => `${e.op} ${e.path}`);
    expect(rutas).toEqual([
      `set ${imputadas}/2026/meses/octubre/documentos/it1`,
      `delete ${imputadas}/2026/meses/octubre/documentos/it2`,
    ]);
  });

  it('si el período de solicitud está cerrado no se escribe nada (aunque el de carga esté abierto)', async () => {
    abiertos.add('2026_septiembre');
    preparar(raiz, { solicitud: 'SOLICITADO', periodo: 'Octubre 2026' });
    await guardar(hook);
    expect(imputadasEscritas(imputadas).filter((e) => e.op === 'set')).toEqual([]);
  });

  it('al cambiar de ruta (otra fecha) conserva los datos de la solicitud y sigue imputando en octubre', async () => {
    abiertos.add('2026_octubre');
    preparar(raiz, { solicitud: 'SOLICITADO', periodo: 'Octubre 2026', solicitadoPor: 'Luis', fechaSolicitud: 'f1', periodoSolicitudAnio: '2026', periodoSolicitudMes: 'octubre' });
    await guardar(hook, { fecha: '2026-09-20' });
    const nuevo = escrituras.find((e) => e.op === 'set' && e.path.startsWith(`${raiz}/2026/mes/09/dia/20`));
    expect(nuevo.data).toMatchObject({ solicitud: 'SOLICITADO', periodo: 'Octubre 2026', solicitadoPor: 'Luis', fechaSolicitud: 'f1', periodoSolicitudAnio: '2026', periodoSolicitudMes: 'octubre' });
    expect(imputadasEscritas(imputadas).every((e) => e.path.includes('/meses/octubre/'))).toBe(true);
  });

  it('un bloque no solicitado no toca las imputaciones', async () => {
    abiertos.add('2026_septiembre');
    preparar(raiz, { solicitud: 'PENDIENTE' });
    await guardar(hook, { solicitud: 'PENDIENTE' });
    expect(imputadasEscritas(imputadas).filter((e) => e.op === 'set')).toEqual([]);
  });
});
