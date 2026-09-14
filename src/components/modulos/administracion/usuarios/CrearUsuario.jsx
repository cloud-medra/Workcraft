import React, { useEffect, useRef, useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  CircleDashed,
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

// Se guarda en usuarios/{uid}.estadoCreacion. Permite saber exactamente en
// qué paso del asistente quedó cada usuario (para poder retomarlo) y qué
// ítems de configuración granular faltan por finalizar.
const ESTADO_CREACION_INICIAL = {
  paso1: false,
  paso2: false,
  itemsFinalizados: {}, // { '/ruta/subitem': true }
  completo: false,
};

const PASOS = [
  { n: 1, label: 'Datos básicos' },
  { n: 2, label: 'Módulos y permisos' },
  { n: 3, label: 'Configuración por ítem' },
];

const CrearUsuario = ({ resumeUsuarioId, onResumeConsumido }) => {
  const { showToast } = useToast();

  const [pasoActual, setPasoActual] = useState(1);
  const [usuarioId, setUsuarioId] = useState(null);
  const [formData, setFormData] = useState(ESTADO_INICIAL);
  // permisos: { moduloKey: ['/ruta/subitem1', '/ruta/subitem2', ...] }
  const [permisos, setPermisos] = useState({});
  // permisosGranulares: { '/ruta/vista': { seccionKey: { visible, elements: { elementoKey: bool } } } }
  const [permisosGranulares, setPermisosGranulares] = useState({});
  const [estadoCreacion, setEstadoCreacion] = useState(ESTADO_CREACION_INICIAL);

  const [modulosExpandidos, setModulosExpandidos] = useState({});
  const [itemAbierto, setItemAbierto] = useState(null); // path del ítem expandido en paso 3

  const [cargando, setCargando] = useState(false);
  const [cargandoResume, setCargandoResume] = useState(false);

  const resumeConsumidoRef = useRef(false);

  const modulosConPermisos = Object.entries(MODULES).filter(
    ([, modulo]) => modulo.subItems?.length
  );

  // Todas las rutas actualmente marcadas en "permisos", sin importar el módulo.
  const pathsSeleccionados = [...new Set(Object.values(permisos).flat())];

  // De esas rutas, solo las que tienen mapa de componentes (requieren config granular).
  // El resto (sin entrada en COMPONENT_MAPS) se considera "Finalizado" automáticamente
  // porque no hay nada que configurar (Opción A).
  const vistasConfigurables = pathsSeleccionados.filter((path) => COMPONENT_MAPS[path]);
  const itemsFinalizadosCount = vistasConfigurables.filter(
    (p) => estadoCreacion.itemsFinalizados[p]
  ).length;
  const itemsPendientesCount = vistasConfigurables.length - itemsFinalizadosCount;
  const totalFinalizadosGlobal =
    pathsSeleccionados.length - itemsPendientesCount; // sin config + con config finalizados

  // --- Retomar una creación en curso (viene de ListadoUsuario "Continuar creación") ---
  useEffect(() => {
    if (!resumeUsuarioId || resumeConsumidoRef.current) return;
    resumeConsumidoRef.current = true;

    (async () => {
      setCargandoResume(true);
      try {
        const snap = await getDoc(doc(db, 'usuarios', resumeUsuarioId));
        if (!snap.exists()) {
          showToast('El usuario a retomar ya no existe.', 'error');
          return;
        }
        const data = snap.data();
        const estado = { ...ESTADO_CREACION_INICIAL, ...(data.estadoCreacion || {}) };

        setUsuarioId(resumeUsuarioId);
        setFormData({
          nombreCompleto: data.nombreCompleto || '',
          nombreUsuario: data.nombreUsuario || '',
          email: data.email || '',
          password: '',
          confirmPassword: '',
          rol: data.rol || 'operador',
        });
        setPermisos(data.permisos || {});
        setPermisosGranulares(data.permisosGranulares || {});
        setEstadoCreacion(estado);
        setPasoActual(estado.paso2 ? 3 : 2);
        showToast('Retomando creación de usuario en curso.', 'info');
      } catch (error) {
        console.error('Error al retomar creación de usuario:', error);
        showToast('No se pudo cargar la creación en curso.', 'error');
      } finally {
        setCargandoResume(false);
        onResumeConsumido?.();
      }
    })();
  }, [resumeUsuarioId, onResumeConsumido, showToast]);

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

  const calcularCompleto = (itemsFinalizados, listaConfigurables) =>
    listaConfigurables.every((p) => itemsFinalizados[p]);

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

    // Si se está desmarcando todo el módulo, los ítems que ya estaban
    // "Finalizado" en el paso 3 dejan de existir como selección — se limpia
    // su estado para que no queden colgados si vuelven a marcarse.
    if (yaCompleto) {
      setEstadoCreacion((prev) => {
        const nuevosFinalizados = { ...prev.itemsFinalizados };
        let cambio = false;
        subItems.forEach((s) => {
          if (s.path in nuevosFinalizados) {
            delete nuevosFinalizados[s.path];
            cambio = true;
          }
        });
        if (!cambio) return prev;
        return { ...prev, itemsFinalizados: nuevosFinalizados, completo: false };
      });
    }
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
        const { [path]: _omit, ...resto } = prev;
        return resto;
      }
      if (prev[path]) return prev;
      const accesoTotal = generarAccesoTotal(path);
      if (!accesoTotal) return prev; // vista sin COMPONENT_MAPS, no requiere granularidad
      return { ...prev, [path]: accesoTotal };
    });

    if (existeAhora) {
      setEstadoCreacion((prev) => {
        if (!(path in prev.itemsFinalizados)) return prev;
        const { [path]: _omit, ...restoFinalizados } = prev.itemsFinalizados;
        return { ...prev, itemsFinalizados: restoFinalizados, completo: false };
      });
    }
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

  const resetWizard = () => {
    setFormData(ESTADO_INICIAL);
    setPermisos({});
    setPermisosGranulares({});
    setEstadoCreacion(ESTADO_CREACION_INICIAL);
    setModulosExpandidos({});
    setItemAbierto(null);
    setUsuarioId(null);
    setPasoActual(1);
  };

  const validarPaso1 = () => {
    if (!formData.nombreCompleto.trim()) return 'El nombre completo es obligatorio.';
    if (!formData.nombreUsuario.trim()) return 'El nombre de usuario es obligatorio.';
    if (!formData.email.trim()) return 'El correo es obligatorio.';
    if (formData.password.length < 6) return 'La contraseña debe tener al menos 6 caracteres.';
    if (formData.password !== formData.confirmPassword) return 'Las contraseñas no coinciden.';
    return '';
  };

  // --- Paso 1: crea el usuario en Auth + el documento base en Firestore ---
  const handleGuardarPaso1 = async (e) => {
    e.preventDefault();

    // Si ya existe (venimos de "Continuar creación" o ya se guardó este
    // paso en esta misma sesión), no se vuelve a crear: solo se avanza.
    if (usuarioId) {
      setPasoActual(2);
      return;
    }

    const mensajeValidacion = validarPaso1();
    if (mensajeValidacion) {
      showToast(mensajeValidacion, 'error');
      return;
    }

    setCargando(true);

    // Se crea una instancia secundaria de Firebase para poder registrar al
    // nuevo usuario SIN cerrar la sesión del administrador que está en el panel.
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
      const estadoInicial = { ...ESTADO_CREACION_INICIAL, paso1: true };

      await setDoc(doc(db, 'usuarios', nuevoUsuario.uid), {
        nombreCompleto: formData.nombreCompleto.trim(),
        nombreUsuario: formData.nombreUsuario.trim(),
        email: formData.email.trim(),
        rol: formData.rol,
        permisos: {},
        permisosGranulares: {},
        estadoCreacion: estadoInicial,
        passwordChanged: false,
        modoPantalla: 'claro',
        creadoPor: auth.currentUser?.uid || null,
        creadoEl: serverTimestamp(),
      });

      await signOut(authSecundaria);

      setUsuarioId(nuevoUsuario.uid);
      setEstadoCreacion(estadoInicial);
      showToast(`Usuario "${formData.nombreCompleto}" creado. Continúa con los permisos.`, 'success');
      setPasoActual(2);
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

  // --- Paso 2: guarda la selección de módulos/ítems ---
  const handleGuardarPaso2 = async () => {
    if (!usuarioId) return;
    setCargando(true);
    try {
      const nuevoEstado = {
        ...estadoCreacion,
        paso2: true,
        completo: calcularCompleto(estadoCreacion.itemsFinalizados, vistasConfigurables),
      };
      await updateDoc(doc(db, 'usuarios', usuarioId), {
        permisos,
        permisosGranulares,
        estadoCreacion: nuevoEstado,
      });
      setEstadoCreacion(nuevoEstado);
      showToast('Permisos guardados.', 'success');
      setPasoActual(3);
    } catch (error) {
      console.error('Error al guardar permisos:', error);
      showToast('No se pudieron guardar los permisos', 'error');
    } finally {
      setCargando(false);
    }
  };

  // --- Paso 3: finaliza la configuración granular de un ítem puntual ---
  const handleFinalizarItem = async (path) => {
    if (!usuarioId) return;
    setCargando(true);
    try {
      const nuevosItemsFinalizados = { ...estadoCreacion.itemsFinalizados, [path]: true };
      const nuevoEstado = {
        ...estadoCreacion,
        itemsFinalizados: nuevosItemsFinalizados,
        completo: calcularCompleto(nuevosItemsFinalizados, vistasConfigurables),
      };
      await updateDoc(doc(db, 'usuarios', usuarioId), {
        permisosGranulares,
        estadoCreacion: nuevoEstado,
      });
      setEstadoCreacion(nuevoEstado);
      setItemAbierto(null);
      showToast('Configuración del ítem guardada.', 'success');
    } catch (error) {
      console.error('Error al finalizar ítem:', error);
      showToast('No se pudo guardar la configuración del ítem', 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleFinalizarCreacion = () => {
    showToast(`Usuario "${formData.nombreCompleto}" creado y configurado completamente.`, 'success');
    resetWizard();
  };

  const irAPaso = (n) => {
    if (n === 1) return setPasoActual(1);
    if (n === 2 && usuarioId) return setPasoActual(2);
    if (n === 3 && usuarioId && estadoCreacion.paso2) return setPasoActual(3);
  };

  const labelEstadoPaso = (n) => {
    if (n === 1) return usuarioId ? 'Guardado con éxito' : 'Pendiente';
    if (n === 2) return estadoCreacion.paso2 ? 'Guardado con éxito' : 'Pendiente';
    if (!estadoCreacion.paso2) return 'Pendiente';
    if (vistasConfigurables.length === 0) return 'Sin ítems que configurar — Finalizado';
    return `Pendiente (${itemsPendientesCount}) · Finalizado (${itemsFinalizadosCount})`;
  };

  const iconoEstadoPaso = (n) => {
    if (n < pasoActual || (n === 1 && usuarioId) || (n === 2 && estadoCreacion.paso2)) {
      if (n === 3) {
        return estadoCreacion.completo ? (
          <CheckCircle2 size={16} className="text-green-600" />
        ) : (
          <CircleDashed size={16} className="text-amber-500" />
        );
      }
      return <CheckCircle2 size={16} className="text-green-600" />;
    }
    return <Circle size={16} className="text-gray-300 dark:text-gray-600" />;
  };

  if (cargandoResume) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* --- STEPPER --- */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
          {PASOS.map((p, idx) => {
            const clickable =
              p.n === 1 || (p.n === 2 && usuarioId) || (p.n === 3 && usuarioId && estadoCreacion.paso2);
            return (
              <React.Fragment key={p.n}>
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => irAPaso(p.n)}
                  className={`flex items-center gap-2 text-left ${
                    clickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      pasoActual === p.n
                        ? 'bg-[#2383C2] text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300'
                    }`}
                  >
                    {p.n}
                  </div>
                  <div className="flex flex-col">
                    <span
                      className={`text-xs font-bold ${
                        pasoActual === p.n
                          ? 'text-[#2383C2]'
                          : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      Paso {p.n}: {p.label}
                    </span>
                    <span className="flex items-center gap-1 text-[10.5px] text-gray-400 dark:text-gray-500">
                      {iconoEstadoPaso(p.n)}
                      {labelEstadoPaso(p.n)}
                    </span>
                  </div>
                </button>
                {idx < PASOS.length - 1 && (
                  <div className="hidden sm:block flex-1 h-px bg-gray-200 dark:bg-gray-700 mx-4" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* --- PASO 1: DATOS BÁSICOS --- */}
      {pasoActual === 1 && (
        <div className="max-w-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col gap-4">
          <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2">
              <UserPlus size={16} className="text-[#2383C2]" />
              Crear Usuario
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {usuarioId
                ? 'Este paso ya fue guardado. Puedes continuar con los permisos.'
                : 'Registra un nuevo usuario y define sus datos de acceso.'}
            </p>
          </div>

          <form onSubmit={handleGuardarPaso1} className="flex flex-col gap-3">
            <fieldset disabled={!!usuarioId} className="flex flex-col gap-3 disabled:opacity-60">
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

              {!usuarioId && (
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
              )}
            </fieldset>

            {!usuarioId && (
              <p className="text-[10px] text-gray-400 dark:text-gray-500">
                El usuario deberá cambiar esta contraseña en su primer inicio de sesión
                (queda marcado con <code className="text-gray-500 dark:text-gray-400">passwordChanged: false</code>).
              </p>
            )}

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                type="submit"
                disabled={cargando}
                className="bg-[#2383C2] hover:bg-[#1b6aa0] text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 transition-colors disabled:opacity-50 min-w-[170px] justify-center"
              >
                {cargando ? (
                  <>
                    <Spinner size="sm" color="#ffffff" />
                    <span>Creando...</span>
                  </>
                ) : usuarioId ? (
                  <>
                    <span>Continuar</span>
                    <ArrowRight size={13} />
                  </>
                ) : (
                  <>
                    <UserPlus size={13} />
                    <span>Guardar y continuar</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- PASO 2: MÓDULOS Y PERMISOS --- */}
      {pasoActual === 2 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
            <div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
                Módulos con acceso
              </span>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Selecciona los ítems visibles para {formData.nombreCompleto || 'este usuario'} dentro de cada módulo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
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
                    <div className="p-2.5 pt-0 grid grid-cols-1 gap-1">
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

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setPasoActual(1)}
              className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded"
            >
              <ArrowLeft size={13} />
              Volver
            </button>
            <button
              type="button"
              onClick={handleGuardarPaso2}
              disabled={cargando}
              className="flex items-center gap-1.5 bg-[#2383C2] hover:bg-[#1b6aa0] text-white text-xs font-bold px-4 py-2 rounded transition-colors disabled:opacity-50 min-w-[170px] justify-center"
            >
              {cargando ? (
                <>
                  <Spinner size="sm" color="#ffffff" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar y continuar</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* --- PASO 3: CONFIGURACIÓN GRANULAR POR ÍTEM --- */}
      {pasoActual === 3 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col gap-3">
          <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-[#2383C2]" />
              Configuración por ítem
            </span>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Abre cada ítem para ajustar su configuración detallada y márcalo como finalizado.
              Los ítems sin configuración adicional ya quedan listos automáticamente.
              {' '}
              <span className="font-semibold text-gray-600 dark:text-gray-300">
                {totalFinalizadosGlobal}/{pathsSeleccionados.length} finalizados.
              </span>
            </p>
          </div>

          {pathsSeleccionados.length === 0 ? (
            <div className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">
              No seleccionaste ningún módulo/ítem en el paso anterior.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {modulosConPermisos.map(([moduloKey, modulo]) => {
                const items = permisos[moduloKey] || [];
                if (items.length === 0) return null;

                return (
                  <div key={moduloKey} className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      <span className="text-[#2383C2]">{modulo.icon}</span>
                      {modulo.label}
                    </span>

                    <div className="flex flex-col gap-1.5">
                      {items.map((path) => {
                        const sub = modulo.subItems.find((s) => s.path === path);
                        const config = COMPONENT_MAPS[path];
                        const finalizado = config ? !!estadoCreacion.itemsFinalizados[path] : true;
                        const expandido = itemAbierto === path;

                        return (
                          <div
                            key={path}
                            className="border border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/40 rounded-lg overflow-hidden"
                          >
                            <button
                              type="button"
                              disabled={!config}
                              onClick={() => setItemAbierto(expandido ? null : path)}
                              className={`w-full flex items-center justify-between p-2.5 transition-colors ${
                                config
                                  ? 'hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer'
                                  : 'cursor-default'
                              }`}
                            >
                              <span className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-200">
                                <span className="opacity-70">{sub?.icon}</span>
                                {sub?.label || path}
                              </span>
                              <span className="flex items-center gap-2">
                                <span
                                  className={`flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                                    finalizado
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                  }`}
                                >
                                  {finalizado ? <CheckCircle2 size={11} /> : <CircleDashed size={11} />}
                                  {finalizado ? 'Finalizado' : 'Pendiente'}
                                </span>
                                {!config && (
                                  <span className="text-[9.5px] text-gray-400 dark:text-gray-500">
                                    (sin configuración adicional)
                                  </span>
                                )}
                                {config && (
                                  expandido ? (
                                    <ChevronDown size={14} className="text-gray-400" />
                                  ) : (
                                    <ChevronRight size={14} className="text-gray-400" />
                                  )
                                )}
                              </span>
                            </button>

                            {expandido && config && (
                              <div className="p-3 pt-0 flex flex-col gap-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {Object.entries(config.sections).map(([sectionKey, section]) => {
                                    const vistaPermisos = permisosGranulares[path];
                                    const seccionEstado = vistaPermisos?.[sectionKey];
                                    if (!seccionEstado) return null;
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

                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleFinalizarItem(path)}
                                    disabled={cargando}
                                    className="flex items-center gap-1.5 bg-[#2383C2] hover:bg-[#1b6aa0] text-white text-xs font-bold px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircle2 size={13} />
                                    Finalizar
                                  </button>
                                </div>
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
          )}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setPasoActual(2)}
              className="flex items-center gap-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded"
            >
              <ArrowLeft size={13} />
              Volver
            </button>
            <button
              type="button"
              onClick={handleFinalizarCreacion}
              disabled={!estadoCreacion.completo}
              title={!estadoCreacion.completo ? 'Finaliza todos los ítems pendientes primero' : ''}
              className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={14} />
              Finalizar creación
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrearUsuario;
