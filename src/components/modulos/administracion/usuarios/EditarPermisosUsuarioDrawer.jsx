import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';

import { db } from '../../../../firebaseConfig';
import { MODULES } from '../../../../config/modulesConfig.jsx';
import { COMPONENT_MAPS } from '../../../../config/componentMaps.jsx';

import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../../components/ui/Spinner';

import {
  X,
  Save,
  Shield,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  CheckCircle2,
  CircleDashed,
  UserCog,
} from 'lucide-react';

// TODO: mantener sincronizado con la lista de roles de CrearUsuario.jsx.
const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'dev', label: 'Desarrollador' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'operador', label: 'Operador' },
];

const clonar = (obj) => (obj ? JSON.parse(JSON.stringify(obj)) : {});

/**
 * Drawer lateral para editar el rol, los módulos/ítems con acceso y la
 * configuración detallada de un usuario YA EXISTENTE. Reemplaza al panel
 * que antes se desplegaba inline dentro del listado.
 *
 * El estado "Pendiente de revisión" de un ítem es EFÍMERO: solo existe
 * mientras el drawer está abierto, para señalar ítems recién agregados en
 * esta misma sesión de edición (con configuración por defecto sin revisar
 * todavía). No se persiste en Firestore ni bloquea el guardado.
 */
// Wrapper sin hooks: solo decide SI se monta el drawer. Montar una instancia
// nueva por cada apertura (en vez de reutilizar una misma instancia y
// "resetearla" con un efecto) es lo que garantiza que el borrador de edición
// siempre arranque limpio con los datos más recientes del usuario, sin
// necesidad de sincronizar estado con un setState dentro de un useEffect.
const EditarPermisosUsuarioDrawer = ({ isOpen, usuario, onClose }) => {
  if (!isOpen || !usuario) return null;
  return (
    <EditarPermisosUsuarioDrawerContenido
      key={usuario.id}
      usuario={usuario}
      onClose={onClose}
    />
  );
};

const EditarPermisosUsuarioDrawerContenido = ({ usuario, onClose }) => {
  const { showToast } = useToast();

  const [edicion, setEdicion] = useState(() => ({
    rol: usuario.rol || 'operador',
    permisos: clonar(usuario.permisos),
    permisosGranulares: clonar(usuario.permisosGranulares),
  }));
  const [modulosExpandidos, setModulosExpandidos] = useState({});
  const [vistasExpandidas, setVistasExpandidas] = useState({});
  const [pendientesRevision, setPendientesRevision] = useState(() => new Set());
  const [guardando, setGuardando] = useState(false);

  const modulosConPermisos = Object.entries(MODULES).filter(
    ([, modulo]) => modulo.subItems?.length
  );

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

  const cerrar = () => {
    if (guardando) return;
    onClose?.();
  };

  const handleRolChange = (e) => {
    const { value } = e.target;
    setEdicion((prev) => ({ ...prev, rol: value }));
  };

  const toggleExpandido = (moduloKey) => {
    setModulosExpandidos((prev) => ({ ...prev, [moduloKey]: !prev[moduloKey] }));
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

    setPendientesRevision((prev) => {
      const next = new Set(prev);
      subItems.forEach((s) => {
        if (yaCompleto) {
          next.delete(s.path);
        } else if (COMPONENT_MAPS[s.path] && !edicion.permisosGranulares[s.path]) {
          // Solo se marca "pendiente de revisión" si antes no tenía config
          // (recién se está agregando ahora, con acceso total por defecto).
          next.add(s.path);
        }
      });
      return next;
    });
  };

  const toggleSubItem = (moduloKey, path) => {
    const actuales = edicion.permisos[moduloKey] || [];
    const existeAhora = actuales.includes(path);

    setEdicion((prev) => {
      const arr = prev.permisos[moduloKey] || [];
      const nuevos = existeAhora ? arr.filter((p) => p !== path) : [...arr, path];
      const nuevosPermisos = { ...prev.permisos, [moduloKey]: nuevos };

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

    setPendientesRevision((prev) => {
      const next = new Set(prev);
      if (existeAhora) {
        next.delete(path);
      } else if (COMPONENT_MAPS[path]) {
        next.add(path);
      }
      return next;
    });
  };

  const toggleVistaExpandida = (path) => {
    const abriendo = !vistasExpandidas[path];
    setVistasExpandidas((prev) => ({ ...prev, [path]: !prev[path] }));
    if (abriendo) {
      // Abrir el panel de un ítem cuenta como "revisarlo".
      setPendientesRevision((prev) => {
        if (!prev.has(path)) return prev;
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
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

  const guardarCambios = async () => {
    setGuardando(true);
    try {
      await updateDoc(doc(db, 'usuarios', usuario.id), {
        rol: edicion.rol,
        permisos: edicion.permisos,
        permisosGranulares: edicion.permisosGranulares,
      });
      showToast('Cambios guardados correctamente', 'success');
      onClose?.();
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
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-[1px] transition-opacity flex justify-end">
      {/* Overlay: clickear afuera cierra el drawer (salvo mientras guarda). */}
      <div className="absolute inset-0" onClick={cerrar} />

      {/* Panel deslizable */}
      <div className="relative w-full max-w-md bg-white dark:bg-gray-800 h-full shadow-2xl flex flex-col border-l border-gray-200 dark:border-gray-700 z-10 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#2383C2]/10 text-[#2383C2] text-[11px] font-bold flex items-center justify-center shrink-0">
              {iniciales(usuario.nombreCompleto) || '?'}
            </div>
            <div className="min-w-0">
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate flex items-center gap-1.5">
                <UserCog size={13} className="text-[#2383C2] shrink-0" />
                Editar acceso
              </h3>
              <p className="text-[10.5px] text-gray-500 dark:text-gray-400 truncate">
                {usuario.nombreCompleto || 'Sin nombre'}
              </p>
            </div>
          </div>
          <button
            onClick={cerrar}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-4">
          {/* Rol */}
          <div>
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
              Módulos e ítems con acceso
            </span>
            <div className="flex flex-col gap-1.5 mt-1.5">
              {modulosConPermisos.map(([moduloKey, modulo]) => {
                const seleccionados = edicion.permisos[moduloKey] || [];
                const total = modulo.subItems.length;
                const completo = seleccionados.length === total;
                const parcial = seleccionados.length > 0 && !completo;
                const expandido = !!modulosExpandidos[moduloKey];

                return (
                  <div
                    key={moduloKey}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/40 overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpandido(moduloKey)}
                      className="w-full flex items-center justify-between p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                    >
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
                          onClick={(e) => e.stopPropagation()}
                          onChange={() => toggleModuloCompleto(moduloKey, modulo.subItems)}
                          className="accent-[#2383C2]"
                        />
                        {expandido ? (
                          <ChevronDown size={14} className="text-gray-400" />
                        ) : (
                          <ChevronRight size={14} className="text-gray-400" />
                        )}
                      </span>
                    </button>

                    {expandido && (
                      <div className="flex flex-col p-1.5 pt-0 gap-0.5">
                        {modulo.subItems.map((sub) => (
                          <label
                            key={sub.path}
                            className="flex items-center gap-1.5 text-[10.5px] text-gray-600 dark:text-gray-300 px-1.5 py-1 rounded hover:bg-white dark:hover:bg-gray-800 cursor-pointer"
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuración detallada por ítem */}
          <div>
            <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide flex items-center gap-1.5">
              <SlidersHorizontal size={13} className="text-[#2383C2]" />
              Configuración detallada
            </span>

            <div className="flex flex-col gap-3 mt-1.5">
              {modulosConPermisos.map(([moduloKey, modulo]) => {
                const items = edicion.permisos[moduloKey] || [];
                if (items.length === 0) return null;

                return (
                  <div key={moduloKey} className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <span className="text-[#2383C2]">{modulo.icon}</span>
                      {modulo.label}
                    </span>

                    <div className="flex flex-col gap-1.5">
                      {items.map((path) => {
                        const sub = modulo.subItems.find((s) => s.path === path);
                        const config = COMPONENT_MAPS[path];
                        const vistaPermisos = edicion.permisosGranulares[path];
                        const pendiente = pendientesRevision.has(path);
                        const expandida = !!vistasExpandidas[path];

                        return (
                          <div
                            key={path}
                            className="border border-gray-100 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 rounded-lg overflow-hidden"
                          >
                            <button
                              type="button"
                              disabled={!config || !vistaPermisos}
                              onClick={() => toggleVistaExpandida(path)}
                              className={`w-full flex items-center justify-between p-2.5 transition-colors ${
                                config
                                  ? 'hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer'
                                  : 'cursor-default'
                              }`}
                            >
                              <span className="flex items-center gap-2 text-[11.5px] font-bold text-gray-700 dark:text-gray-200 min-w-0">
                                <span className="opacity-70 shrink-0">{sub?.icon}</span>
                                <span className="truncate">{sub?.label || path}</span>
                              </span>
                              <span className="flex items-center gap-1.5 shrink-0">
                                {config ? (
                                  <span
                                    className={`flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                                      pendiente
                                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                    }`}
                                  >
                                    {pendiente ? <CircleDashed size={11} /> : <CheckCircle2 size={11} />}
                                    {pendiente ? 'Pendiente de revisión' : 'Configurado'}
                                  </span>
                                ) : (
                                  <span className="text-[9.5px] text-gray-400 dark:text-gray-500">
                                    Sin configuración adicional
                                  </span>
                                )}
                                {config && (
                                  expandida ? (
                                    <ChevronDown size={14} className="text-gray-400" />
                                  ) : (
                                    <ChevronRight size={14} className="text-gray-400" />
                                  )
                                )}
                              </span>
                            </button>

                            {expandida && config && vistaPermisos && (
                              <div className="p-2.5 pt-0 grid grid-cols-1 gap-2">
                                {Object.entries(config.sections).map(([sectionKey, section]) => {
                                  const seccionEstado = vistaPermisos[sectionKey];
                                  if (!seccionEstado) return null;
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
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3.5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-2 shrink-0 bg-gray-50 dark:bg-gray-900">
          <button
            type="button"
            onClick={cerrar}
            disabled={guardando}
            className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded disabled:opacity-50"
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
    </div>
  );
};

export default EditarPermisosUsuarioDrawer;
