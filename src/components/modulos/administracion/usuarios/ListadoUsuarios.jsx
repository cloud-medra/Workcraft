import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';

// ⚠️ Ajusta estas rutas según dónde ubiques finalmente este archivo dentro de
// components/modulos/... (mismo nivel de anidamiento que CrearUsuario.jsx).
import { db } from '../../../../firebaseConfig';
import { MODULES } from '../../../../config/modulesConfig.jsx';
import { COMPONENT_MAPS } from '../../../../config/componentMaps.jsx';

import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../../components/ui/Spinner';

import {
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Power,
  Pencil,
  Save,
  X,
  SlidersHorizontal,
  CircleCheck,
  CircleX,
} from 'lucide-react';

// TODO: mantener sincronizado con la lista de roles de CrearUsuario.jsx.
const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'dev', label: 'Desarrollador' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'operador', label: 'Operador' },
];

const clonar = (obj) => (obj ? JSON.parse(JSON.stringify(obj)) : {});

const ListadoUsuarios = () => {
  const { showToast } = useToast();

  const [usuarios, setUsuarios] = useState([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  const [usuarioExpandidoId, setUsuarioExpandidoId] = useState(null);
  const [edicion, setEdicion] = useState(null); // { rol, permisos, permisosGranulares }
  const [vistasExpandidas, setVistasExpandidas] = useState({});

  const [guardando, setGuardando] = useState(false);
  const [actualizandoEstadoId, setActualizandoEstadoId] = useState(null);

  const modulosConPermisos = Object.entries(MODULES).filter(
    ([, modulo]) => modulo.subItems?.length
  );

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

  // --- Entrar / salir de modo edición ---
  const iniciarEdicion = (usuario) => {
    setUsuarioExpandidoId(usuario.id);
    setEdicion({
      rol: usuario.rol || 'operador',
      permisos: clonar(usuario.permisos),
      permisosGranulares: clonar(usuario.permisosGranulares),
    });
    setVistasExpandidas({});
  };

  const cancelarEdicion = () => {
    setUsuarioExpandidoId(null);
    setEdicion(null);
    setVistasExpandidas({});
  };

  // --- Helpers de permisos (mismo comportamiento que CrearUsuario.jsx) ---
  const generarAccesoTotal = (path) => {
    const config = COMPONENT_MAPS[path];
    if (!config) return null;
    const secciones = {};
    Object.entries(config.sections).forEach(([sectionKey, section]) => {
      const elementos = {};
      Object.keys(section.elements || {}).forEach((elKey) => {
        elementos[elKey] = true;
      });
      secciones[sectionKey] = { visible: true, elements: elementos };
    });
    return secciones;
  };

  const handleRolChange = (e) => {
    const { value } = e.target;
    setEdicion((prev) => ({ ...prev, rol: value }));
  };

  const toggleModuloCompleto = (moduloKey, subItems) => {
    const total = subItems.length;
    const yaCompleto = (edicion.permisos[moduloKey]?.length || 0) === total;

    setEdicion((prev) => {
      const nuevosPermisos = {
        ...prev.permisos,
        [moduloKey]: yaCompleto ? [] : subItems.map((s) => s.path),
      };

      const nuevosGranulares = { ...prev.permisosGranulares };
      subItems.forEach((s) => {
        if (yaCompleto) {
          delete nuevosGranulares[s.path];
        } else if (!nuevosGranulares[s.path]) {
          const accesoTotal = generarAccesoTotal(s.path);
          if (accesoTotal) nuevosGranulares[s.path] = accesoTotal;
        }
      });

      return { ...prev, permisos: nuevosPermisos, permisosGranulares: nuevosGranulares };
    });
  };

  const toggleSubItem = (moduloKey, path) => {
    setEdicion((prev) => {
      const actuales = prev.permisos[moduloKey] || [];
      const existeAhora = actuales.includes(path);
      const nuevosPermisos = {
        ...prev.permisos,
        [moduloKey]: existeAhora
          ? actuales.filter((p) => p !== path)
          : [...actuales, path],
      };

      let nuevosGranulares = prev.permisosGranulares;
      if (existeAhora) {
        const { [path]: _omit, ...resto } = prev.permisosGranulares;
        nuevosGranulares = resto;
      } else if (!prev.permisosGranulares[path]) {
        const accesoTotal = generarAccesoTotal(path);
        if (accesoTotal) {
          nuevosGranulares = { ...prev.permisosGranulares, [path]: accesoTotal };
        }
      }

      return { ...prev, permisos: nuevosPermisos, permisosGranulares: nuevosGranulares };
    });
  };

  const toggleVistaExpandida = (path) => {
    setVistasExpandidas((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const toggleSeccionVisible = (path, sectionKey) => {
    setEdicion((prev) => {
      const vista = prev.permisosGranulares[path];
      if (!vista) return prev;
      const seccion = vista[sectionKey];
      return {
        ...prev,
        permisosGranulares: {
          ...prev.permisosGranulares,
          [path]: { ...vista, [sectionKey]: { ...seccion, visible: !seccion.visible } },
        },
      };
    });
  };

  const toggleElementoVisible = (path, sectionKey, elementKey) => {
    setEdicion((prev) => {
      const vista = prev.permisosGranulares[path];
      if (!vista) return prev;
      const seccion = vista[sectionKey];
      return {
        ...prev,
        permisosGranulares: {
          ...prev.permisosGranulares,
          [path]: {
            ...vista,
            [sectionKey]: {
              ...seccion,
              elements: { ...seccion.elements, [elementKey]: !seccion.elements[elementKey] },
            },
          },
        },
      };
    });
  };

  const pathsSeleccionadosEdicion = edicion
    ? [...new Set(Object.values(edicion.permisos).flat())]
    : [];
  const vistasConfigurablesEdicion = pathsSeleccionadosEdicion.filter(
    (path) => COMPONENT_MAPS[path]
  );

  // --- Guardar cambios de edición ---
  const guardarCambios = async () => {
    if (!usuarioExpandidoId || !edicion) return;
    setGuardando(true);
    try {
      await updateDoc(doc(db, 'usuarios', usuarioExpandidoId), {
        rol: edicion.rol,
        permisos: edicion.permisos,
        permisosGranulares: edicion.permisosGranulares,
      });
      showToast('Cambios guardados correctamente', 'success');
      cancelarEdicion();
    } catch (error) {
      console.error('Error al guardar cambios del usuario:', error);
      showToast('No se pudieron guardar los cambios', 'error');
    } finally {
      setGuardando(false);
    }
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
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm divide-y divide-gray-100 dark:divide-gray-700 overflow-hidden">
          {usuariosFiltrados.map((usuario) => {
            const activo = estaActivo(usuario);
            const enEdicion = usuarioExpandidoId === usuario.id && edicion;
            const rolLabel = ROLES.find((r) => r.value === usuario.rol)?.label || usuario.rol;

            return (
              <div key={usuario.id}>
                {/* Fila principal */}
                <div
                  onClick={() => (enEdicion ? cancelarEdicion() : iniciarEdicion(usuario))}
                  className="flex items-center justify-between gap-3 px-3 py-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-[#2383C2]/10 text-[#2383C2] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {iniciales(usuario.nombreCompleto) || '?'}
                    </div>
                    <div className="min-w-0 flex items-baseline gap-1.5">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-100 truncate">
                        {usuario.nombreCompleto || 'Sin nombre'}
                      </p>
                      <p className="text-[10.5px] text-gray-400 dark:text-gray-500 truncate hidden md:block">
                        @{usuario.nombreUsuario} · {usuario.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      <Shield size={10} className="text-[#2383C2]" />
                      {rolLabel}
                    </span>

                    <span
                      className={`hidden sm:flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        activo
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {activo ? <CircleCheck size={10} /> : <CircleX size={10} />}
                      {activo ? 'Activo' : 'Inactivo'}
                    </span>

                    <button
                      type="button"
                      title={activo ? 'Inactivar usuario' : 'Activar usuario'}
                      disabled={actualizandoEstadoId === usuario.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleActivoUsuario(usuario);
                      }}
                      className={`p-1 rounded transition-colors disabled:opacity-50 ${
                        activo
                          ? 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                      }`}
                    >
                      {actualizandoEstadoId === usuario.id ? (
                        <Spinner size="sm" />
                      ) : (
                        <Power size={13} />
                      )}
                    </button>

                    <button
                      type="button"
                      title="Editar permisos"
                      onClick={(e) => {
                        e.stopPropagation();
                        enEdicion ? cancelarEdicion() : iniciarEdicion(usuario);
                      }}
                      className={`p-1 rounded transition-colors ${
                        enEdicion
                          ? 'text-white bg-[#2383C2]'
                          : 'text-gray-400 hover:text-[#2383C2] hover:bg-[#2383C2]/10'
                      }`}
                    >
                      {enEdicion ? <ChevronDown size={13} /> : <Pencil size={13} />}
                    </button>
                  </div>
                </div>

                {/* Panel de edición */}
                {enEdicion && (
                  <div className="border-t border-gray-100 dark:border-gray-700 p-3 flex flex-col gap-3 bg-gray-50/60 dark:bg-gray-900/30">
                    {/* Rol */}
                    <div className="max-w-xs">
                      <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                        Rol
                      </label>
                      <div className="relative flex items-center">
                        <Shield className="absolute ml-2 text-gray-400" size={14} />
                        <select
                          value={edicion.rol}
                          onChange={handleRolChange}
                          className="w-full text-xs p-2 pl-7 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2] appearance-none"
                        >
                          {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Módulos e ítems */}
                    <div>
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                        Módulos con acceso
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 mt-1.5">
                        {modulosConPermisos.map(([moduloKey, modulo]) => {
                          const seleccionados = edicion.permisos[moduloKey] || [];
                          const total = modulo.subItems.length;
                          const completo = seleccionados.length === total;
                          const parcial = seleccionados.length > 0 && !completo;

                          return (
                            <div
                              key={moduloKey}
                              className="flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900/40 overflow-hidden"
                            >
                              {/* Cabecera del bloque */}
                              <label className="flex items-center justify-between gap-2 px-2.5 py-2 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 cursor-pointer">
                                <span className="flex items-center gap-1.5 text-[11px] font-bold text-gray-700 dark:text-gray-200 min-w-0">
                                  <span className="text-[#2383C2] shrink-0">{modulo.icon}</span>
                                  <span className="truncate">{modulo.label}</span>
                                </span>
                                <span className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full ${
                                      completo
                                        ? 'bg-[#2383C2]/10 text-[#2383C2]'
                                        : parcial
                                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                                    }`}
                                  >
                                    {seleccionados.length}/{total}
                                  </span>
                                  <input
                                    type="checkbox"
                                    checked={completo}
                                    onChange={() => toggleModuloCompleto(moduloKey, modulo.subItems)}
                                    className="accent-[#2383C2]"
                                  />
                                </span>
                              </label>

                              {/* Ítems del módulo */}
                              <div className="flex flex-col p-1.5 gap-0.5">
                                {modulo.subItems.map((sub) => (
                                  <label
                                    key={sub.path}
                                    className="flex items-center gap-1.5 text-[10.5px] text-gray-600 dark:text-gray-300 px-1.5 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={seleccionados.includes(sub.path)}
                                      onChange={() => toggleSubItem(moduloKey, sub.path)}
                                      className="accent-[#2383C2] shrink-0"
                                    />
                                    <span className="opacity-60 shrink-0">{sub.icon}</span>
                                    <span className="truncate">{sub.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Permisos granulares por vista */}
                    {vistasConfigurablesEdicion.length > 0 && (
                      <div>
                        <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
                          <SlidersHorizontal size={13} className="text-[#2383C2]" />
                          Configuración detallada por vista
                        </span>

                        <div className="flex flex-col gap-2 mt-1.5">
                          {vistasConfigurablesEdicion.map((path) => {
                            const config = COMPONENT_MAPS[path];
                            const vistaPermisos = edicion.permisosGranulares[path];
                            if (!config || !vistaPermisos) return null;

                            const expandida = !!vistasExpandidas[path];

                            return (
                              <div
                                key={path}
                                className="border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 rounded-lg overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleVistaExpandida(path)}
                                  className="w-full flex items-center justify-between p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                                >
                                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                                    {config.label}
                                  </span>
                                  {expandida ? (
                                    <ChevronDown size={14} className="text-gray-400" />
                                  ) : (
                                    <ChevronRight size={14} className="text-gray-400" />
                                  )}
                                </button>

                                {expandida && (
                                  <div className="p-3 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(config.sections).map(([sectionKey, section]) => {
                                      const seccionEstado = vistaPermisos[sectionKey];
                                      return (
                                        <div
                                          key={sectionKey}
                                          className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 p-2.5"
                                        >
                                          <label className="flex items-center gap-2 text-[11px] font-bold text-gray-700 dark:text-gray-200 pb-1.5 mb-1.5 border-b border-gray-100 dark:border-gray-700 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              checked={seccionEstado.visible}
                                              onChange={() => toggleSeccionVisible(path, sectionKey)}
                                              className="accent-[#2383C2]"
                                            />
                                            {section.label}
                                          </label>

                                          <div className="flex flex-col gap-1 pl-1">
                                            {Object.entries(section.elements || {}).map(([elKey, el]) => (
                                              <label
                                                key={elKey}
                                                className={`flex items-center gap-2 text-[10.5px] p-1 rounded cursor-pointer ${
                                                  seccionEstado.visible
                                                    ? 'text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900/40'
                                                    : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                                                }`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  disabled={!seccionEstado.visible}
                                                  checked={!!seccionEstado.elements[elKey]}
                                                  onChange={() => toggleElementoVisible(path, sectionKey, elKey)}
                                                  className="accent-[#2383C2]"
                                                />
                                                {el.label}
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
                      <button
                        type="button"
                        onClick={cancelarEdicion}
                        disabled={guardando}
                        className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded"
                      >
                        <X size={13} />
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={guardarCambios}
                        disabled={guardando}
                        className="flex items-center gap-1.5 bg-[#2383C2] hover:bg-[#1b6aa0] text-white text-xs font-bold px-4 py-2 rounded transition-colors disabled:opacity-50 min-w-[140px] justify-center"
                      >
                        {guardando ? (
                          <>
                            <Spinner size="sm" color="#ffffff" />
                            <span>Guardando...</span>
                          </>
                        ) : (
                          <>
                            <Save size={13} />
                            <span>Guardar cambios</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ListadoUsuarios;