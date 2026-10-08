// @vitest-environment jsdom
// Edición desde Listado Usuario (EditarUsuario, pantalla completa) con los
// mapas de permisos REALES: un usuario existente, guardado antes de las
// acciones y columnas nuevas, se edita (quitar una pestaña de Control
// Procesos, una acción y una columna de Maestros → Códigos), se guarda, se
// vuelve a abrir y se verifica que los permisos se apliquen en tiempo real.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

const updateDoc = vi.fn(async () => {});
vi.mock('firebase/firestore', () => ({ doc: vi.fn((_db, col, id) => `${col}/${id}`), updateDoc: (...a) => updateDoc(...a) }));
vi.mock('../../../../firebaseConfig', () => ({ db: {} }));
vi.mock('../../../../context/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
let usuarioSesion = null;
vi.mock('../../../../context/UserContext', () => ({ useUser: () => ({ userData: usuarioSesion }) }));

const { default: EditarUsuario } = await import('./EditarUsuario');
const { useGranularPermission } = await import('../../../../hooks/useGranularPermission');
const { useColumnasPermitidas } = await import('../../../../hooks/useColumnasPermitidas');

const CP = '/laboratorio/archivosControlLaboratorio';
const PESTANAS = ['documentosRecibidos', 'iniciarProcesos', 'vinculacionCodigos', 'vinculacionOrdenes',
  'solicitudDiferencias', 'documentosListos', 'documentosImputados', 'documentosEdicion'];

// Usuario guardado con la estructura ANTERIOR: pestañas sin secciones,
// Con Código sin acciones/columnas, y Laboratorio Códigos en el menú sin
// entrada granular (estaba fuera del mapa).
const usuarioExistente = () => ({
  id: 'u1',
  nombreCompleto: 'Usuario Prueba',
  nombreUsuario: 'uprueba',
  email: 'u@prueba.cl',
  rol: 'operador',
  permisos: {
    laboratorio: [CP, '/laboratorio/codigoLaboratorio'],
    maestros: ['/maestros/codigosMaestros'],
  },
  permisosGranulares: {
    [CP]: { filtros_busqueda: { visible: true, elements: { input_busqueda: true } } },
    ...Object.fromEntries(PESTANAS.map((p) => [`${CP}/${p}`, {}])),
    '/maestros/codigosMaestros': {},
    '/maestros/codigosMaestros/conCodigo': {
      tabla_datos: { visible: true, elements: {} },
      barra_busqueda: { visible: false, elements: {} }, // restricción previa: debe conservarse
    },
    '/maestros/codigosMaestros/pendientes': {},
  },
});

const bloque = (aria) => screen.getByLabelText(aria).closest('.rounded-lg');
const expandir = (aria) => fireEvent.click(within(bloque(aria)).getByRole('button', { name: 'Expandir' }));
const casilla = (contenedor, texto) => within(contenedor).getByText(texto).closest('label').querySelector('input');

beforeEach(() => updateDoc.mockClear());
afterEach(cleanup);

describe('Listado Usuario → Editar usuario (pantalla completa)', () => {
  it('muestra lo nuevo marcado, guarda solo lo cambiado y se aplica al entrar', async () => {
    const usuario = usuarioExistente();
    const onVolver = vi.fn();
    render(<EditarUsuario usuario={usuario} onVolver={onVolver} />);

    // Encabezado fijo con identidad del usuario; sin cambios todavía.
    expect(screen.getByRole('heading', { name: 'Usuario Prueba' })).toBeInTheDocument();
    expect(screen.getByText('u@prueba.cl')).toBeInTheDocument();
    expect(screen.queryByText('Tienes cambios sin guardar')).not.toBeInTheDocument();
    // Laboratorio Códigos estaba sin configurar: se completa y se puede guardar ya.
    expect(screen.getByRole('button', { name: /Guardar cambios/ })).toBeEnabled();

    // Columna izquierda: módulos con contador; arranca en el primero con permisos (Laboratorio).
    const nav = screen.getByRole('navigation', { name: 'Módulos' });
    expect(within(nav).getByText('Laboratorio')).toBeInTheDocument();
    expect(within(bloque('Habilitar Maestro Códigos')).getByText('Pendiente de revisión')).toBeInTheDocument();

    // 1) Quitar la pestaña "Vinculación de Órdenes" de Control Procesos.
    expandir('Habilitar Control Procesos');
    ['Documentos Recibidos', 'Ingreso de Folios', 'Vinculación de Códigos', 'Vinculación de Órdenes',
      'Solicitud Diferencias', 'Documentos Listos', 'Documentos Imputados', 'Edición']
      .forEach((p) => expect(screen.getByLabelText(`Habilitar Pestaña: ${p}`)).toBeChecked());
    const vincOrd = screen.getByLabelText('Habilitar Pestaña: Vinculación de Órdenes');
    expect(vincOrd).toBeChecked();
    fireEvent.click(vincOrd);
    expect(vincOrd).not.toBeChecked();
    expect(screen.getByText('Tienes cambios sin guardar')).toBeInTheDocument();

    // 2) Maestros → Códigos → Con Código: acciones y columnas nuevas MARCADAS por defecto.
    fireEvent.click(within(nav).getByText('Maestros'));
    expandir('Habilitar Codigos');
    expandir('Habilitar Pestaña: Con Código (TabConCodigo.jsx)');
    const conCodigo = bloque('Habilitar Pestaña: Con Código (TabConCodigo.jsx)');
    expect(within(conCodigo).getByText('Marcar todo')).toBeInTheDocument();
    const eliminar = casilla(conCodigo, 'Eliminar');
    expect(eliminar).toBeChecked();
    expect(casilla(conCodigo, 'Editar')).toBeChecked();
    // Columnas: sub-bloque cerrado por defecto.
    expect(within(conCodigo).queryByText('Precio Neto')).not.toBeInTheDocument();
    fireEvent.click(within(conCodigo).getByText('Columnas de la tabla'));
    expect(within(conCodigo).getByText('14/14')).toBeInTheDocument();
    expect(casilla(conCodigo, 'Precio Neto')).toBeChecked();

    fireEvent.click(eliminar);
    fireEvent.click(casilla(conCodigo, 'Precio Neto'));
    expect(within(conCodigo).getByText('13/14')).toBeInTheDocument();

    // 3) Datos generales: cambiar el nombre.
    fireEvent.click(screen.getByRole('tab', { name: /Datos generales/ }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Usuario Editado' } });
    expect(screen.getByLabelText('Correo')).toBeDisabled();

    // Salir con cambios pide confirmación.
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Cambios sin guardar');
    fireEvent.click(screen.getByText('Seguir editando'));
    expect(onVolver).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Guardar cambios/ }));
    await vi.waitFor(() => expect(updateDoc).toHaveBeenCalledTimes(1));
    const [, guardado] = updateDoc.mock.calls[0];
    const g = guardado.permisosGranulares;

    expect(guardado.nombreCompleto).toBe('Usuario Editado');
    expect(guardado.rol).toBe('operador');
    // Lo desmarcado queda guardado como quitado.
    expect(g[`${CP}/vinculacionOrdenes`]).toBeUndefined();
    expect(g['/maestros/codigosMaestros/conCodigo'].tabla_datos.elements.action_eliminar).toBe(false);
    expect(g['/maestros/codigosMaestros/conCodigo'].tabla_datos.elements.col_precioNeto).toBe(false);
    // Lo no tocado se conserva (incluida una restricción previa) y lo nuevo queda permitido.
    expect(g['/maestros/codigosMaestros/conCodigo'].barra_busqueda.visible).toBe(false);
    expect(g['/maestros/codigosMaestros/conCodigo'].tabla_datos.elements.action_editar).toBe(true);
    expect(g[CP].filtros_busqueda.elements.input_busqueda).toBe(true);
    expect(g[`${CP}/documentosRecibidos`].tabla_documentos.elements.btn_eliminar).toBe(true);
    expect(g['/laboratorio/codigoLaboratorio'].tabla.elements.btn_eliminar).toBe(true);
    expect(guardado.permisos).toEqual(usuario.permisos);
    await vi.waitFor(() => expect(screen.queryByText('Tienes cambios sin guardar')).not.toBeInTheDocument());

    // Volver a abrir con lo guardado: lo quitado sigue quitado.
    cleanup();
    const reabierto = { ...usuario, ...guardado };
    render(<EditarUsuario usuario={reabierto} onVolver={() => {}} />);
    expect(screen.getByRole('button', { name: /Guardar cambios/ })).toBeDisabled();
    expandir('Habilitar Control Procesos');
    expect(screen.getByLabelText('Habilitar Pestaña: Vinculación de Órdenes')).not.toBeChecked();
    expect(within(bloque('Habilitar Maestro Códigos')).queryByText('Pendiente de revisión')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('navigation', { name: 'Módulos' })).getByText('Maestros'));
    expandir('Habilitar Codigos');
    expandir('Habilitar Pestaña: Con Código (TabConCodigo.jsx)');
    const conCodigo2 = bloque('Habilitar Pestaña: Con Código (TabConCodigo.jsx)');
    expect(casilla(conCodigo2, 'Eliminar')).not.toBeChecked();
    fireEvent.click(within(conCodigo2).getByText('Columnas de la tabla'));
    expect(casilla(conCodigo2, 'Precio Neto')).not.toBeChecked();

    // Al entrar con ese usuario, se aplica.
    usuarioSesion = reabierto;
    const { result } = renderHook(() => useGranularPermission());
    expect(result.current.hasAccesoProceso(`${CP}/vinculacionOrdenes`)).toBe(false);
    expect(result.current.hasAccesoProceso(`${CP}/documentosRecibidos`)).toBe(true);
    expect(result.current.hasPermission('/maestros/codigosMaestros/conCodigo', 'tabla_datos', 'action_eliminar')).toBe(false);
    expect(result.current.hasPermission('/laboratorio/codigoLaboratorio', 'tabla', 'btn_eliminar')).toBe(true);
    const { result: cols } = renderHook(() =>
      useColumnasPermitidas('/maestros/codigosMaestros/conCodigo', 'tabla_datos', [{ key: 'codigo' }, { key: 'precioNeto' }]));
    expect(cols.current.columnasVisibles.map((c) => c.key)).toEqual(['codigo']);
  });

  it('el buscador filtra módulos y vistas por cualquier permiso', () => {
    render(<EditarUsuario usuario={usuarioExistente()} onVolver={() => {}} />);
    const nav = screen.getByRole('navigation', { name: 'Módulos' });
    fireEvent.change(screen.getByLabelText('Buscar permisos'), { target: { value: 'vinculacion de ordenes' } });
    const visibles = within(nav).getAllByRole('button').map((b) => b.textContent);
    expect(visibles.some((t) => t.startsWith('Laboratorio'))).toBe(true);
    expect(visibles.some((t) => t.startsWith('Maestros'))).toBe(false);
    expect(screen.getByLabelText('Habilitar Control Procesos')).toBeInTheDocument();
    expect(screen.queryByLabelText('Habilitar Registro Empresas')).not.toBeInTheDocument();
  });
});
