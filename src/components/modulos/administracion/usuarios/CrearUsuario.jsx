import React, { useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// ⚠️ Ajusta estas rutas según dónde ubiques finalmente este archivo dentro de
// components/modulos/... (mismo nivel de anidamiento que NotasAdmin.jsx).
import { db, auth, firebaseConfig } from '../../../../firebaseConfig';
import { MODULES } from '../../../../config/modulesConfig.jsx';
import { COMPONENT_MAPS } from '../../../../config/componentMaps.jsx';

import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../../components/ui/Spinner';

import {
  UserPlus,
  User,
  AtSign,
  Mail,
  Lock,
  Shield,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';

// TODO: ajusta esta lista a los roles reales que maneja el sistema.
const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'dev', label: 'Desarrollador' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'operador', label: 'Operador' },
];

const ESTADO_INICIAL = {
  nombreCompleto: '',
  nombreUsuario: '',
  email: '',
  password: '',
  confirmPassword: '',
  rol: 'operador',
};

const CrearUsuario = () => {
  const { showToast } = useToast();

  const [formData, setFormData] = useState(ESTADO_INICIAL);
  // permisos: { moduloKey: ['/ruta/subitem1', '/ruta/subitem2', ...] }
  // Misma forma que ya lee Dashboard.jsx (userData.permisos[mKey]) — define
  // qué ítems ve el usuario en el menú lateral.
  const [permisos, setPermisos] = useState({});
  // permisosGranulares: { '/ruta/vista': { seccionKey: { visible, elements: { elementoKey: bool } } } }
  // Misma forma que lee useGranularPermission — define qué ve/hace el
  // usuario DENTRO de cada vista. Se genera automáticamente (con acceso
  // total) apenas se marca un ítem que tenga entrada en COMPONENT_MAPS.
  const [permisosGranulares, setPermisosGranulares] = useState({});
  const [modulosExpandidos, setModulosExpandidos] = useState({});
  const [vistasExpandidas, setVistasExpandidas] = useState({});
  const [cargando, setCargando] = useState(false);

  const modulosConPermisos = Object.entries(MODULES).filter(
    ([, modulo]) => modulo.subItems?.length
  );

  // Todas las rutas actualmente marcadas en "permisos", sin importar el módulo.
  const pathsSeleccionados = [...new Set(Object.values(permisos).flat())];

  // De esas rutas, solo las que tienen mapa de componentes (requieren config granular).
  const vistasConfigurables = pathsSeleccionados.filter((path) => COMPONENT_MAPS[path]);

  // 🔍 DEBUG TEMPORAL — borra este bloque una vez que confirmes que funciona.
  console.log('permisos:', permisos);
  console.log('pathsSeleccionados:', pathsSeleccionados);
  console.log('keys en COMPONENT_MAPS:', Object.keys(COMPONENT_MAPS));
  console.log('vistasConfigurables:', vistasConfigurables);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleExpandido = (moduloKey) => {
    setModulosExpandidos((prev) => ({ ...prev, [moduloKey]: !prev[moduloKey] }));
  };

  const toggleModuloCompleto = (moduloKey, subItems) => {
    const total = subItems.length;
    const yaCompleto = (permisos[moduloKey]?.length || 0) === total;

    setPermisos((prev) => ({
      ...prev,
      [moduloKey]: yaCompleto ? [] : subItems.map((s) => s.path),
    }));

    setPermisosGranulares((prev) => {
      const copia = { ...prev };
      subItems.forEach((s) => {
        if (yaCompleto) {
          delete copia[s.path];
        } else if (!copia[s.path]) {
          const accesoTotal = generarAccesoTotal(s.path);
          if (accesoTotal) copia[s.path] = accesoTotal;
        }
      });
      return copia;
    });
  };

  const toggleSubItem = (moduloKey, path) => {
    const actuales = permisos[moduloKey] || [];
    const existeAhora = actuales.includes(path);

    setPermisos((prev) => {
      const arr = prev[moduloKey] || [];
      const nuevos = existeAhora ? arr.filter((p) => p !== path) : [...arr, path];
      return { ...prev, [moduloKey]: nuevos };
    });

    setPermisosGranulares((prev) => {
      if (existeAhora) {
        // Se está desmarcando el ítem -> se elimina su configuración granular.
        const { [path]: _omit, ...resto } = prev;
        return resto;
      }
      if (prev[path]) return prev;
      const accesoTotal = generarAccesoTotal(path);
      if (!accesoTotal) return prev; // vista sin COMPONENT_MAPS, no requiere granularidad
      return { ...prev, [path]: accesoTotal };
    });
  };

  const toggleVistaExpandida = (path) => {
    setVistasExpandidas((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const toggleSeccionVisible = (path, sectionKey) => {
    setPermisosGranulares((prev) => {
      const vista = prev[path];
      if (!vista) return prev;
      const seccion = vista[sectionKey];
      return {
        ...prev,
        [path]: { ...vista, [sectionKey]: { ...seccion, visible: !seccion.visible } },
      };
    });
  };

  const toggleElementoVisible = (path, sectionKey, elementKey) => {
    setPermisosGranulares((prev) => {
      const vista = prev[path];
      if (!vista) return prev;
      const seccion = vista[sectionKey];
      return {
        ...prev,
        [path]: {
          ...vista,
          [sectionKey]: {
            ...seccion,
            elements: { ...seccion.elements, [elementKey]: !seccion.elements[elementKey] },
          },
        },
      };
    });
  };

  const resetFormulario = () => {
    setFormData(ESTADO_INICIAL);
    setPermisos({});
    setPermisosGranulares({});
    setModulosExpandidos({});
    setVistasExpandidas({});
  };

  const validar = () => {
    if (!formData.nombreCompleto.trim()) return 'El nombre completo es obligatorio.';
    if (!formData.nombreUsuario.trim()) return 'El nombre de usuario es obligatorio.';
    if (!formData.email.trim()) return 'El correo es obligatorio.';
    if (formData.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (formData.password !== formData.confirmPassword) return 'Las contraseñas no coinciden.';
    return '';
  };

  const handleGuardarUsuario = async (e) => {
    e.preventDefault();

    const mensajeValidacion = validar();
    if (mensajeValidacion) {
      showToast(mensajeValidacion, 'error');
      return;
    }

    setCargando(true);

    // Se crea una instancia secundaria de Firebase para poder registrar al
    // nuevo usuario SIN cerrar la sesión del administrador que está en el panel
    // (createUserWithEmailAndPassword inicia sesión automáticamente con el
    // usuario recién creado si se usa la instancia "auth" principal).
    const nombreAppSecundaria = `crear-usuario-${Date.now()}`;
    const appSecundaria = initializeApp(firebaseConfig, nombreAppSecundaria);
    const authSecundaria = getAuth(appSecundaria);

    try {
      const credenciales = await createUserWithEmailAndPassword(
        authSecundaria,
        formData.email.trim(),
        formData.password
      );
      const nuevoUsuario = credenciales.user;

      await setDoc(doc(db, 'usuarios', nuevoUsuario.uid), {
        nombreCompleto: formData.nombreCompleto.trim(),
        nombreUsuario: formData.nombreUsuario.trim(),
        email: formData.email.trim(),
        rol: formData.rol,
        permisos,
        permisosGranulares,
        passwordChanged: false,
        modoPantalla: 'claro',
        creadoPor: auth.currentUser?.uid || null,
        creadoEl: serverTimestamp(),
      });

      await signOut(authSecundaria);

      showToast(`Usuario "${formData.nombreCompleto}" creado correctamente`, 'success');
      resetFormulario();
    } catch (error) {
      console.error('Error al crear usuario:', error);
      if (error.code === 'auth/email-already-in-use') {
        showToast('Ese correo ya está registrado', 'error');
      } else if (error.code === 'auth/invalid-email') {
        showToast('El correo ingresado no es válido', 'error');
      } else if (error.code === 'auth/weak-password') {
        showToast('La contraseña es demasiado débil', 'error');
      } else {
        showToast('Ocurrió un error al crear el usuario', 'error');
      }
    } finally {
      await deleteApp(appSecundaria);
      setCargando(false);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* --- DATOS BÁSICOS --- */}
      <div className="lg:col-span-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col gap-4">
        <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2">
            <UserPlus size={16} className="text-[#2383C2]" />
            Crear Usuario
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Registra un nuevo usuario y define sus datos de acceso.
          </p>
        </div>

        <form onSubmit={handleGuardarUsuario} className="flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Nombre completo
            </label>
            <div className="relative flex items-center">
              <User className="absolute ml-2 text-gray-400" size={14} />
              <input
                name="nombreCompleto"
                value={formData.nombreCompleto}
                onChange={handleChange}
                placeholder="Ej: Juana Pérez Soto"
                className="w-full text-xs p-2 pl-7 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Nombre de usuario
            </label>
            <div className="relative flex items-center">
              <AtSign className="absolute ml-2 text-gray-400" size={14} />
              <input
                name="nombreUsuario"
                value={formData.nombreUsuario}
                onChange={handleChange}
                placeholder="Ej: jperez"
                className="w-full text-xs p-2 pl-7 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Correo
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute ml-2 text-gray-400" size={14} />
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="ejemplo@medra.cl"
                className="w-full text-xs p-2 pl-7 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Rol
            </label>
            <div className="relative flex items-center">
              <Shield className="absolute ml-2 text-gray-400" size={14} />
              <select
                name="rol"
                value={formData.rol}
                onChange={handleChange}
                className="w-full text-xs p-2 pl-7 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2] appearance-none"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Contraseña
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute ml-2 text-gray-400" size={14} />
                <input
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="********"
                  className="w-full text-xs p-2 pl-7 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Confirmar
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute ml-2 text-gray-400" size={14} />
                <input
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="********"
                  className="w-full text-xs p-2 pl-7 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 dark:text-gray-500">
            El usuario deberá cambiar esta contraseña en su primer inicio de sesión
            (queda marcado con <code className="text-gray-500 dark:text-gray-400">passwordChanged: false</code>).
          </p>

          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={resetFormulario}
              disabled={cargando}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded"
            >
              Limpiar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="bg-[#2383C2] hover:bg-[#1b6aa0] text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 transition-colors disabled:opacity-50 min-w-[140px] justify-center"
            >
              {cargando ? (
                <>
                  <Spinner size="sm" color="#ffffff" />
                  <span>Creando...</span>
                </>
              ) : (
                <>
                  <UserPlus size={13} />
                  <span>Crear Usuario</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* --- MÓDULOS Y PERMISOS (nivel módulo / ítem) --- */}
      <div className="lg:col-span-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
          <div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
              Módulos con acceso
            </span>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Selecciona los ítems visibles para este usuario dentro de cada módulo.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {modulosConPermisos.map(([moduloKey, modulo]) => {
            const seleccionados = permisos[moduloKey] || [];
            const total = modulo.subItems.length;
            const expandido = !!modulosExpandidos[moduloKey];

            return (
              <div
                key={moduloKey}
                className="border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/40 rounded-lg overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleExpandido(moduloKey)}
                  className="w-full flex items-center justify-between p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-200">
                    <span className="text-[#2383C2]">{modulo.icon}</span>
                    {modulo.label}
                    <span className="text-[10px] font-normal text-gray-400">
                      ({seleccionados.length}/{total})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label
                      className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={seleccionados.length === total}
                        onChange={() => toggleModuloCompleto(moduloKey, modulo.subItems)}
                        className="accent-[#2383C2]"
                      />
                      Todo
                    </label>
                    {expandido ? (
                      <ChevronDown size={14} className="text-gray-400" />
                    ) : (
                      <ChevronRight size={14} className="text-gray-400" />
                    )}
                  </div>
                </button>

                {expandido && (
                  <div className="p-2.5 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {modulo.subItems.map((sub) => (
                      <label
                        key={sub.path}
                        className="flex items-center gap-2 text-[11px] text-gray-600 dark:text-gray-300 p-1.5 rounded hover:bg-white dark:hover:bg-gray-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={seleccionados.includes(sub.path)}
                          onChange={() => toggleSubItem(moduloKey, sub.path)}
                          className="accent-[#2383C2]"
                        />
                        <span className="opacity-70">{sub.icon}</span>
                        {sub.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- CONFIGURACIÓN GRANULAR POR VISTA --- */}
      {vistasConfigurables.length > 0 && (
        <div className="lg:col-span-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col gap-3">
          <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-[#2383C2]" />
              Configuración detallada por vista
            </span>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Por defecto, cada vista marcada tiene acceso total. Desmarca lo que este
              usuario NO debe ver ni poder hacer.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {vistasConfigurables.map((path) => {
              const config = COMPONENT_MAPS[path];
              const vistaPermisos = permisosGranulares[path];
              if (!config || !vistaPermisos) return null;

              const expandida = !!vistasExpandidas[path];

              return (
                <div
                  key={path}
                  className="border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/40 rounded-lg overflow-hidden"
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
                            className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-2.5"
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
                                      ? 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/40'
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
    </div>
  );
};

export default CrearUsuario;