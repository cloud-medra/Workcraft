import { useEffect, useMemo, useRef, useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { User, AtSign, Mail, Lock, Shield, UserPlus, KeyRound, CheckCircle2, CircleDashed, RotateCcw } from 'lucide-react';

import { db, auth, firebaseConfig } from '../../../../firebaseConfig';
import { COMPONENT_MAPS } from '../../../../config/componentMaps.jsx';
import { completarPermisosGranulares, vistasConfigurables } from './permisosGranularesUtils';
import { useToast } from '../../../../context/ToastContext';
import Spinner from '../../../../components/ui/Spinner';
import MarcoEdicionUsuario, { Chip, ConfirmarSalida } from './MarcoEdicionUsuario';
import EditorPermisos from './EditorPermisos';
import { Tarjeta, CampoTexto, CampoSelect } from './CamposFormulario';
import { ROLES, esRolAccesoTotal, labelRol } from './roles';

// Crear Usuario, con el mismo marco y el mismo editor de permisos que
// Editar usuario (Listado Usuario):
//   Datos generales: crea la cuenta (Auth + documento base) — "paso 1".
//   Permisos:        EditorPermisos. "Guardar permisos" guarda la selección
//                    ("paso 2") y cada vista configurable se marca como
//                    revisada ("paso 3", itemsFinalizados). Al estar todo
//                    revisado la creación queda completa.
// usuarios/{uid}.estadoCreacion se mantiene igual que antes: Listado Usuario
// muestra las creaciones incompletas y permite retomarlas.

const ESTADO_INICIAL = {
  nombreCompleto: '',
  nombreUsuario: '',
  email: '',
  password: '',
  confirmPassword: '',
  rol: 'operador',
};

const ESTADO_CREACION_INICIAL = {
  paso1: false,
  paso2: false,
  itemsFinalizados: {}, // { '/ruta/subitem': true }
  completo: false,
};

const SIN_PERMISOS = { permisos: {}, permisosGranulares: {} };

const CrearUsuario = ({ resumeUsuarioId, onResumeConsumido }) => {
  const { showToast } = useToast();

  const [tab, setTab] = useState('datos');
  const [usuarioId, setUsuarioId] = useState(null);
  const [formData, setFormData] = useState(ESTADO_INICIAL);
  // permisos: { moduloKey: ['/ruta/subitem1', ...] }
  const [permisos, setPermisos] = useState({});
  // permisosGranulares: { '/ruta/vista': { seccionKey: { visible, elements: { elementoKey: bool } } } }
  const [permisosGranulares, setPermisosGranulares] = useState({});
  // Últimos permisos guardados en Firestore (para "cambios sin guardar").
  const [guardado, setGuardado] = useState(SIN_PERMISOS);
  const [estadoCreacion, setEstadoCreacion] = useState(ESTADO_CREACION_INICIAL);
  const [editorKey, setEditorKey] = useState(0);

  const [cargando, setCargando] = useState(false);
  const [cargandoResume, setCargandoResume] = useState(false);
  const [confirmarDescartar, setConfirmarDescartar] = useState(false);

  const resumeConsumidoRef = useRef(false);

  // Vistas y pestañas configurables incluidas (las que se marcan como revisadas).
  const configurables = vistasConfigurables(permisos, permisosGranulares, COMPONENT_MAPS);
  const itemsFinalizadosCount = configurables.filter((p) => estadoCreacion.itemsFinalizados[p]).length;

  const datosSinGuardar = !usuarioId && Object.entries(formData).some(([k, v]) => v !== ESTADO_INICIAL[k]);
  const permisosSinGuardar = useMemo(
    () => Boolean(usuarioId) && JSON.stringify({ permisos, permisosGranulares }) !== JSON.stringify(guardado),
    [usuarioId, permisos, permisosGranulares, guardado]
  );
  const hayCambios = datosSinGuardar || permisosSinGuardar;

  useEffect(() => {
    if (!hayCambios) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

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
        const granulares = completarPermisosGranulares(data.permisosGranulares || {}, COMPONENT_MAPS);
        setPermisosGranulares(granulares);
        setEstadoCreacion(estado);
        setGuardado({ permisos: data.permisos || {}, permisosGranulares: granulares });
        setTab('permisos');
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


  const calcularCompleto = (itemsFinalizados, listaConfigurables) =>
    listaConfigurables.every((p) => itemsFinalizados[p]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Cambios del editor (lógica pura compartida): lo que se quita deja de
  // estar "revisado".
  const onCambiarPermisos = (nuevo, { quitadas = [] } = {}) => {
    setPermisos(nuevo.permisos);
    setPermisosGranulares(nuevo.permisosGranulares);
    if (quitadas.length) {
      setEstadoCreacion((prev) => {
        const quedan = { ...prev.itemsFinalizados };
        let cambio = false;
        quitadas.forEach((p) => { if (p in quedan) { delete quedan[p]; cambio = true; } });
        return cambio ? { ...prev, itemsFinalizados: quedan, completo: false } : prev;
      });
    }
  };

  const resetWizard = () => {
    setFormData(ESTADO_INICIAL);
    setPermisos({});
    setPermisosGranulares({});
    setGuardado(SIN_PERMISOS);
    setEstadoCreacion(ESTADO_CREACION_INICIAL);
    setUsuarioId(null);
    setTab('datos');
    setEditorKey((k) => k + 1);
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
    e?.preventDefault();

    // Si ya existe (venimos de "Continuar creación" o ya se guardó este
    // paso en esta misma sesión), no se vuelve a crear: solo se avanza.
    if (usuarioId) {
      setTab('permisos');
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
      setTab('permisos');
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

  // Guarda la selección de vistas y la configuración ("paso 2"), y
  // opcionalmente marca una vista como revisada ("paso 3").
  const guardarPermisos = async (revisada) => {
    if (!usuarioId) return false;
    setCargando(true);
    try {
      const itemsFinalizados = revisada
        ? { ...estadoCreacion.itemsFinalizados, [revisada]: true }
        : estadoCreacion.itemsFinalizados;
      const nuevoEstado = {
        ...estadoCreacion,
        paso2: true,
        itemsFinalizados,
        completo: calcularCompleto(itemsFinalizados, configurables),
      };
      await updateDoc(doc(db, 'usuarios', usuarioId), {
        permisos,
        permisosGranulares,
        estadoCreacion: nuevoEstado,
      });
      setEstadoCreacion(nuevoEstado);
      setGuardado({ permisos, permisosGranulares });
      showToast(revisada ? 'Vista marcada como revisada.' : 'Permisos guardados.', 'success');
      return true;
    } catch (error) {
      console.error('Error al guardar permisos:', error);
      showToast('No se pudieron guardar los permisos', 'error');
      return false;
    } finally {
      setCargando(false);
    }
  };

  const handleFinalizarCreacion = () => {
    showToast(`Usuario "${formData.nombreCompleto}" creado y configurado completamente.`, 'success');
    resetWizard();
  };

  const cancelar = () => (hayCambios ? setConfirmarDescartar(true) : resetWizard());

  if (cargandoResume) {
    return (
      <div className="w-full flex items-center justify-center py-16">
        <Spinner size="md" />
      </div>
    );
  }

  const accesoTotal = esRolAccesoTotal(formData.rol);
  const estadoChip = !usuarioId
    ? <Chip tono="gris">Cuenta sin crear</Chip>
    : estadoCreacion.completo && estadoCreacion.paso2
      ? <Chip tono="verde" icon={CheckCircle2}>Configuración completa</Chip>
      : <Chip tono="ambar" icon={CircleDashed}>{itemsFinalizadosCount}/{configurables.length} vistas revisadas</Chip>;

  return (
    <>
      <ConfirmarSalida
        abierto={confirmarDescartar}
        guardando={cargando}
        onGuardarYSalir={usuarioId ? async () => { if (await guardarPermisos()) { setConfirmarDescartar(false); resetWizard(); } } : undefined}
        onSalir={() => { setConfirmarDescartar(false); resetWizard(); }}
        onSeguir={() => setConfirmarDescartar(false)}
      />
      <MarcoEdicionUsuario
        migas={<><span className="uppercase tracking-wider font-semibold">Usuarios</span><span>/</span><span>Crear usuario</span></>}
        nombre={formData.nombreCompleto}
        detalle={formData.email}
        chips={<><Chip tono="azul" icon={Shield}>{labelRol(formData.rol)}</Chip>{estadoChip}</>}
        hayCambios={hayCambios}
        guardando={cargando}
        onCancelar={cancelar}
        onGuardar={tab === 'datos' ? (usuarioId ? () => setTab('permisos') : handleGuardarPaso1) : () => guardarPermisos()}
        textoGuardar={tab === 'datos' ? (usuarioId ? 'Ir a permisos' : 'Crear cuenta') : 'Guardar permisos'}
        puedeGuardar={tab === 'datos' ? true : permisosSinGuardar || !estadoCreacion.paso2}
        accionesExtra={usuarioId && estadoCreacion.completo && estadoCreacion.paso2 && !permisosSinGuardar && (
          <button
            type="button"
            onClick={handleFinalizarCreacion}
            className="h-8 px-3.5 rounded-md border border-green-600 text-green-700 dark:text-green-400 text-[12px] font-semibold inline-flex items-center gap-1.5 hover:bg-green-50 dark:hover:bg-green-950/30"
          >
            <RotateCcw size={13} /> Finalizar y crear otro
          </button>
        )}
        tabs={[
          { id: 'datos', label: 'Datos generales', icon: UserPlus },
          { id: 'permisos', label: 'Permisos', icon: KeyRound, deshabilitada: !usuarioId, motivo: 'Primero crea la cuenta en Datos generales' },
        ]}
        tabActiva={tab}
        onTab={setTab}
      >
        {tab === 'datos' ? (
          <div className="h-full overflow-y-auto">
            <form onSubmit={handleGuardarPaso1} className="max-w-3xl">
              <Tarjeta
                titulo="Datos de la cuenta"
                descripcion={usuarioId
                  ? 'La cuenta ya fue creada. Continúa en la pestaña Permisos (o retómala luego desde Listado Usuario).'
                  : 'Registra al usuario y define sus datos de acceso. Luego podrás asignar sus permisos.'}
              >
                <fieldset disabled={!!usuarioId} className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                  <CampoTexto id="nombreCompleto" name="nombreCompleto" label="Nombre completo" icon={User} value={formData.nombreCompleto} onChange={handleChange} placeholder="Ej: Juana Pérez Soto" />
                  <CampoTexto id="nombreUsuario" name="nombreUsuario" label="Nombre de usuario" icon={AtSign} value={formData.nombreUsuario} onChange={handleChange} placeholder="Ej: jperez" />
                  <CampoTexto id="email" name="email" type="email" label="Correo" icon={Mail} value={formData.email} onChange={handleChange} placeholder="ejemplo@medra.cl" ayuda="Será el correo de ingreso al sistema." />
                  <CampoSelect id="rol" name="rol" label="Rol" icon={Shield} opciones={ROLES} value={formData.rol} onChange={handleChange}
                    ayuda={accesoTotal ? 'Acceso total: no se aplican los permisos granulares.' : 'Los permisos se asignan en la pestaña Permisos.'} />
                  {!usuarioId && (
                    <>
                      <CampoTexto id="password" name="password" type="password" label="Contraseña" icon={Lock} value={formData.password} onChange={handleChange} placeholder="Mínimo 6 caracteres" autoComplete="new-password" />
                      <CampoTexto id="confirmPassword" name="confirmPassword" type="password" label="Confirmar contraseña" icon={Lock} value={formData.confirmPassword} onChange={handleChange} placeholder="Repite la contraseña" autoComplete="new-password" />
                    </>
                  )}
                </fieldset>
                {/* Enter en el formulario crea la cuenta (igual que el botón del encabezado). */}
                <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
              </Tarjeta>
            </form>
          </div>
        ) : (
          <EditorPermisos
            key={editorKey}
            estado={{ permisos, permisosGranulares }}
            onCambiar={onCambiarPermisos}
            accesoTotalPorRol={accesoTotal}
            insigniaVista={(path) => (configurables.includes(path) ? (
              estadoCreacion.itemsFinalizados[path]
                ? <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0"><CheckCircle2 size={10} /> Revisada</span>
                : <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0"><CircleDashed size={10} /> Por revisar</span>
            ) : null)}
            pieVista={(path) => (configurables.includes(path) && !estadoCreacion.itemsFinalizados[path] ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => guardarPermisos(path)}
                  disabled={cargando}
                  className="h-8 px-3.5 rounded-md bg-[#2383C2] hover:bg-[#1d6fa5] text-white text-[12px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> Guardar y marcar como revisada
                </button>
              </div>
            ) : null)}
          />
        )}
      </MarcoEdicionUsuario>
    </>
  );
};

export default CrearUsuario;
