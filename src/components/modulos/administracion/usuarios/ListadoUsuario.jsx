import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

// ⚠️ Ajusta estas rutas según dónde ubiques finalmente este archivo dentro de
// components/modulos/... (mismo nivel de anidamiento que CrearUsuario.jsx).
import { db } from '../../../../firebaseConfig';
import { COMPONENT_MAPS } from '../../../../config/componentMaps.jsx';
import { MODULES } from '../../../../config/modulesConfig.jsx';

import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import Spinner from '../../../../components/ui/Spinner';
import EditarPermisosUsuarioDrawer from './EditarPermisosUsuarioDrawer';

import {
  Users,
  Search,
  Shield,
  Power,
  Pencil,
  CircleCheck,
  CircleX,
  CircleDashed,
  PlayCircle,
  Trash2,
  Layers,
} from 'lucide-react';

// TODO: mantener sincronizado con la lista de roles de CrearUsuario.jsx.
const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'dev', label: 'Desarrollador' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'operador', label: 'Operador' },
];

const ListadoUsuarios = ({ onContinuarCreacion }) => {
  const { showToast } = useToast();
  const { confirmAction } = useModal();

  const [usuarios, setUsuarios] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const [usuarioEditandoId, setUsuarioEditandoId] = useState(null);

  const [actualizandoEstadoId, setActualizandoEstadoId] = useState(null);
  const [cancelandoId, setCancelandoId] = useState(null);

  // --- Suscripción en tiempo real a la colección de usuarios ---
  useEffect(() => {
    const q = query(collection(db, 'usuarios'), orderBy('nombreCompleto'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setUsuarios(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCargandoLista(false);
      },
      (error) => {
        console.error('Error al escuchar usuarios:', error);
        showToast('No se pudo cargar el listado de usuarios', 'error');
        setCargandoLista(false);
      }
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const estaActivo = (usuario) => usuario.activo !== false;

  // La creación de un usuario se hace en 3 pasos (ver CrearUsuario.jsx). Los
  // usuarios creados ANTES de este wizard no tienen "estadoCreacion" y se
  // consideran completos (legado). Solo se marca incompleta una creación que
  // tiene "estadoCreacion" y aún no llegó a completo:true.
  const creacionIncompleta = (usuario) =>
    !!usuario.estadoCreacion && usuario.estadoCreacion.completo !== true;

  const labelPasoIncompleto = (usuario) => {
    const estado = usuario.estadoCreacion || {};
    if (!estado.paso2) return 'Paso 2 pendiente';
    const totalSeleccionado = [...new Set(Object.values(usuario.permisos || {}).flat())];
    const configurables = totalSeleccionado.filter((path) => COMPONENT_MAPS[path]);
    const finalizados = configurables.filter((path) => estado.itemsFinalizados?.[path]).length;
    return `Paso 3: ${finalizados}/${configurables.length} ítems`;
  };

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return usuarios.filter((u) => {
      const coincideTexto =
        !texto ||
        u.nombreCompleto?.toLowerCase().includes(texto) ||
        u.nombreUsuario?.toLowerCase().includes(texto) ||
        u.email?.toLowerCase().includes(texto);

      const coincideRol = filtroRol === 'todos' || u.rol === filtroRol;

      const coincideEstado =
        filtroEstado === 'todos' ||
        (filtroEstado === 'activos' && estaActivo(u)) ||
        (filtroEstado === 'inactivos' && !estaActivo(u));

      return coincideTexto && coincideRol && coincideEstado;
    });
  }, [usuarios, busqueda, filtroRol, filtroEstado]);

  // --- Activar / Inactivar (acción rápida, sin entrar a modo edición) ---
  const toggleActivoUsuario = async (usuario) => {
    setActualizandoEstadoId(usuario.id);
    try {
      await updateDoc(doc(db, 'usuarios', usuario.id), {
        activo: !estaActivo(usuario),
      });
      showToast(
        `Usuario "${usuario.nombreCompleto}" ${estaActivo(usuario) ? 'inactivado' : 'activado'}`,
        'success'
      );
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      showToast('No se pudo cambiar el estado del usuario', 'error');
    } finally {
      setActualizandoEstadoId(null);
    }
  };

  // --- Cancelar una creación incompleta (borra solo el documento en Firestore) ---
  const cancelarCreacionUsuario = (usuario) => {
    confirmAction(
      'Cancelar creación de usuario',
      `Se eliminará el registro de "${usuario.nombreCompleto || usuario.email}" y todo el progreso del asistente. ` +
        'La cuenta de acceso (correo/contraseña) podría seguir existiendo en el sistema de autenticación, ' +
        'ya que no puede eliminarse automáticamente desde aquí.',
      async () => {
        setCancelandoId(usuario.id);
        try {
          await deleteDoc(doc(db, 'usuarios', usuario.id));
          showToast('Creación cancelada.', 'success');
        } catch (error) {
          console.error('Error al cancelar creación de usuario:', error);
          showToast('No se pudo cancelar la creación', 'error');
        } finally {
          setCancelandoId(null);
        }
      },
      { confirmText: 'Cancelar creación', type: 'danger' }
    );
  };

  // --- Abrir / cerrar el drawer de edición de permisos ---
  const abrirEdicion = (usuario) => {
    setUsuarioEditandoId((actual) => (actual === usuario.id ? null : usuario.id));
  };

  const usuarioEditando = usuarios.find((u) => u.id === usuarioEditandoId) || null;

  const modulosAsignados = (usuario) => {
    const claves = Object.keys(usuario.permisos || {}).filter((k) => (usuario.permisos[k] || []).length > 0);
    const labels = claves.map((k) => MODULES[k]?.label || k);
    return { cantidad: claves.length, labels };
  };

  const iniciales = (nombre = '') =>
    nombre
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('');

  return (
    <div className="w-full flex flex-col gap-4">
      {/* --- CABECERA / FILTROS --- */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2.5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2">
        <h3 className="text-xs font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wide flex items-center gap-1.5 shrink-0">
          <Users size={15} className="text-[#2383C2]" />
          Usuarios
          <span className="text-[10px] font-normal normal-case text-gray-400">
            ({usuariosFiltrados.length})
          </span>
        </h3>

        <div className="flex flex-1 flex-col sm:flex-row gap-1.5 sm:ml-2">
          <div className="relative flex items-center flex-1 min-w-[160px]">
            <Search className="absolute ml-2 text-gray-400" size={13} />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, usuario o correo..."
              className="w-full text-xs py-1.5 pl-7 pr-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
            />
          </div>

          <select
            value={filtroRol}
            onChange={(e) => setFiltroRol(e.target.value)}
            className="text-xs py-1.5 px-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
          >
            <option value="todos">Todos los roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="text-xs py-1.5 px-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
          >
            <option value="todos">Todos los estados</option>
            <option value="activos">Solo activos</option>
            <option value="inactivos">Solo inactivos</option>
          </select>
        </div>
      </div>

      {/* --- LISTADO --- */}
      {cargandoLista ? (
        <div className="flex items-center justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-10">
          No se encontraron usuarios con estos filtros.
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
                <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8 text-center">#</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Nombre Completo</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Usuario</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Email</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Rol</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Módulos asignados</th>
                  <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Estado</th>
                  <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario, index) => {
                  const activo = estaActivo(usuario);
                  const enEdicion = usuarioEditandoId === usuario.id;
                  const rolLabel = ROLES.find((r) => r.value === usuario.rol)?.label || usuario.rol;
                  const incompleta = creacionIncompleta(usuario);
                  const { cantidad: cantidadModulos, labels: labelsModulos } = modulosAsignados(usuario);

                  return (
                    <tr
                      key={usuario.id}
                      onClick={() => (incompleta ? null : abrirEdicion(usuario))}
                      className={`border-l-2 transition-colors ${
                        incompleta
                          ? 'border-transparent bg-amber-50/60 dark:bg-amber-900/10'
                          : `cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/40 ${
                              enEdicion ? 'border-[#2383C2] bg-[#2383C2]/5' : 'border-transparent'
                            }`
                      }`}
                    >
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold text-center">
                        {index + 1}
                      </td>

                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-[#2383C2]/10 text-[#2383C2] text-[9px] font-bold flex items-center justify-center shrink-0">
                            {iniciales(usuario.nombreCompleto) || '?'}
                          </div>
                          <span className="truncate">{usuario.nombreCompleto || 'Sin nombre'}</span>
                        </div>
                      </td>

                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                        @{usuario.nombreUsuario}
                      </td>

                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                        {usuario.email}
                      </td>

                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70">
                        <span className="flex items-center gap-1 w-fit text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          <Shield size={10} className="text-[#2383C2]" />
                          {rolLabel}
                        </span>
                      </td>

                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70">
                        <span
                          title={labelsModulos.join(', ') || 'Sin módulos asignados'}
                          className="flex items-center gap-1 w-fit text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        >
                          <Layers size={10} className="text-[#2383C2]" />
                          {cantidadModulos}
                        </span>
                      </td>

                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70">
                        {incompleta ? (
                          <span className="flex items-center gap-1 w-fit text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            <CircleDashed size={10} />
                            Incompleta · {labelPasoIncompleto(usuario)}
                          </span>
                        ) : (
                          <span
                            className={`flex items-center gap-1 w-fit text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              activo
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {activo ? <CircleCheck size={10} /> : <CircleX size={10} />}
                            {activo ? 'Activo' : 'Inactivo'}
                          </span>
                        )}
                      </td>

                      <td className="py-1 px-2 border-b border-gray-200 dark:border-gray-700 text-center">
                        <div className="flex justify-center items-center gap-2">
                          {incompleta ? (
                            <>
                              <button
                                type="button"
                                title="Continuar creación"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onContinuarCreacion?.(usuario.id);
                                }}
                                className="text-[#2383C2] hover:text-[#1d6fa5] transition"
                              >
                                <PlayCircle size={13} />
                              </button>
                              <button
                                type="button"
                                title="Cancelar creación"
                                disabled={cancelandoId === usuario.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelarCreacionUsuario(usuario);
                                }}
                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition disabled:opacity-50"
                              >
                                {cancelandoId === usuario.id ? <Spinner size="sm" /> : <Trash2 size={13} />}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                title={activo ? 'Inactivar usuario' : 'Activar usuario'}
                                disabled={actualizandoEstadoId === usuario.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleActivoUsuario(usuario);
                                }}
                                className={`transition disabled:opacity-50 ${
                                  activo
                                    ? 'text-gray-500 hover:text-red-500 dark:text-gray-400'
                                    : 'text-gray-500 hover:text-green-600 dark:text-gray-400'
                                }`}
                              >
                                {actualizandoEstadoId === usuario.id ? <Spinner size="sm" /> : <Power size={13} />}
                              </button>

                              <button
                                type="button"
                                title="Editar acceso"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  abrirEdicion(usuario);
                                }}
                                className={`transition ${
                                  enEdicion
                                    ? 'text-[#2383C2]'
                                    : 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                                }`}
                              >
                                <Pencil size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drawer de edición de rol / módulos / configuración detallada */}
      <EditarPermisosUsuarioDrawer
        isOpen={!!usuarioEditando}
        usuario={usuarioEditando}
        onClose={() => setUsuarioEditandoId(null)}
      />
    </div>
  );
};

export default ListadoUsuarios;
