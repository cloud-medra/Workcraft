import { useEffect, useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { User, AtSign, Mail, Shield, UserCog, KeyRound, SlidersHorizontal, Layers, CircleDashed } from 'lucide-react';

import { db } from '../../../../firebaseConfig';
import { COMPONENT_MAPS } from '../../../../config/componentMaps.jsx';
import { useToast } from '../../../../context/ToastContext';
import MarcoEdicionUsuario, { Chip, ConfirmarSalida } from './MarcoEdicionUsuario';
import EditorPermisos from './EditorPermisos';
import { Tarjeta, CampoTexto, CampoSelect, CampoEstado } from './CamposFormulario';
import { ROLES, esRolAccesoTotal, labelRol } from './roles';
import { completarPermisosGranulares, completarVistasDelMenu, resumenRestricciones } from './permisosGranularesUtils';

// Edición de un usuario existente desde Listado Usuario, a pantalla completa
// (reemplaza al listado, igual que las vistas de detalle del sistema).
// Pestañas: Datos generales | Permisos (EditorPermisos, el mismo de Crear
// Usuario). Solo cambia la presentación: los permisos se completan y guardan
// igual que antes (completarPermisosGranulares / completarVistasDelMenu y un
// único updateDoc con permisos + permisosGranulares completos).

const clonar = (obj) => (obj ? JSON.parse(JSON.stringify(obj)) : {});

// JSON con claves ordenadas: quitar y volver a poner una pestaña cambia el
// orden de las claves, pero no es un cambio real.
const estable = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]]))
  : x));

const estadoInicial = (usuario) => {
  const permisos = clonar(usuario.permisos);
  const completar = (g) => completarPermisosGranulares(g, COMPONENT_MAPS);
  // Lo que el usuario puede hacer hoy queda marcado: acciones/columnas/
  // secciones nuevas en true y vistas del menú aún sin configuración
  // completadas (se marcan "pendiente de revisión").
  const { permisosGranulares, agregadas } = completarVistasDelMenu(permisos, completar(clonar(usuario.permisosGranulares)), COMPONENT_MAPS);
  return {
    datos: {
      nombreCompleto: usuario.nombreCompleto || '',
      nombreUsuario: usuario.nombreUsuario || '',
      rol: usuario.rol || 'operador',
      activo: usuario.activo !== false,
    },
    permisos: { permisos, permisosGranulares: completar(permisosGranulares) },
    agregadas,
  };
};

const EditarUsuario = ({ usuario, onVolver }) => {
  const { showToast } = useToast();
  const [inicial, setInicial] = useState(() => estadoInicial(usuario));
  const [datos, setDatos] = useState(inicial.datos);
  const [permisos, setPermisos] = useState(inicial.permisos);
  const [pendientes, setPendientes] = useState(() => new Set(inicial.agregadas));
  const [tab, setTab] = useState('permisos');
  const [guardando, setGuardando] = useState(false);
  const [confirmarSalida, setConfirmarSalida] = useState(false);
  const [errores, setErrores] = useState({});

  const hayCambios = useMemo(
    () => estable(datos) !== estable(inicial.datos) || estable(permisos) !== estable(inicial.permisos),
    [datos, permisos, inicial]
  );

  useEffect(() => {
    if (!hayCambios) return undefined;
    const avisar = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', avisar);
    return () => window.removeEventListener('beforeunload', avisar);
  }, [hayCambios]);

  const validar = () => {
    const e = {};
    if (!datos.nombreCompleto.trim()) e.nombreCompleto = 'El nombre completo es obligatorio.';
    if (!datos.nombreUsuario.trim()) e.nombreUsuario = 'El nombre de usuario es obligatorio.';
    setErrores(e);
    if (Object.keys(e).length) setTab('datos');
    return Object.keys(e).length === 0;
  };

  const guardar = async () => {
    if (!validar()) return false;
    setGuardando(true);
    try {
      const datosLimpios = { ...datos, nombreCompleto: datos.nombreCompleto.trim(), nombreUsuario: datos.nombreUsuario.trim() };
      await updateDoc(doc(db, 'usuarios', usuario.id), {
        ...datosLimpios,
        permisos: permisos.permisos,
        permisosGranulares: permisos.permisosGranulares,
      });
      setInicial({ datos: datosLimpios, permisos, agregadas: [] });
      setDatos(datosLimpios);
      showToast('Cambios guardados correctamente', 'success');
      return true;
    } catch (error) {
      console.error('Error al guardar cambios del usuario:', error);
      showToast('No se pudieron guardar los cambios', 'error');
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const salir = () => (hayCambios ? setConfirmarSalida(true) : onVolver());
  const cancelar = () => {
    if (!hayCambios) return onVolver();
    setConfirmarSalida(true);
  };

  const onCambiarPermisos = (nuevo, { quitadas = [], agregadas = [] } = {}) => {
    setPermisos(nuevo);
    if (quitadas.length || agregadas.length) {
      setPendientes((prev) => {
        const next = new Set(prev);
        quitadas.forEach((p) => next.delete(p));
        agregadas.forEach((p) => next.add(p));
        return next;
      });
    }
  };
  const marcarRevisada = (path) => setPendientes((prev) => {
    if (!prev.has(path)) return prev;
    const next = new Set(prev);
    next.delete(path);
    return next;
  });

  // Vistas del menú que estaban sin configuración se completan al abrir: hay
  // que guardar para que el usuario recupere el acceso a ellas.
  const hayVistasPorPersistir = inicial.agregadas.length > 0;
  const accesoTotal = esRolAccesoTotal(datos.rol);
  const resumen = resumenRestricciones(permisos.permisos, permisos.permisosGranulares, COMPONENT_MAPS);
  const modulosConAcceso = Object.values(permisos.permisos || {}).filter((v) => v?.length).length;
  const vistasConAcceso = new Set(Object.values(permisos.permisos || {}).flat()).size;

  return (
    <>
      <ConfirmarSalida
        abierto={confirmarSalida}
        guardando={guardando}
        onGuardarYSalir={async () => { if (await guardar()) { setConfirmarSalida(false); onVolver(); } }}
        onSalir={() => { setConfirmarSalida(false); onVolver(); }}
        onSeguir={() => setConfirmarSalida(false)}
      />
      <MarcoEdicionUsuario
        migas={<><span className="uppercase tracking-wider font-semibold">Usuarios</span><span>/</span><span>Editar acceso</span></>}
        nombre={datos.nombreCompleto || usuario.nombreCompleto}
        detalle={usuario.email}
        chips={(
          <>
            <Chip tono="azul" icon={Shield}>{labelRol(datos.rol)}</Chip>
            <Chip tono={datos.activo ? 'verde' : 'gris'}>{datos.activo ? 'Activo' : 'Inactivo'}</Chip>
          </>
        )}
        hayCambios={hayCambios}
        guardando={guardando}
        onVolver={salir}
        onCancelar={cancelar}
        onGuardar={guardar}
        puedeGuardar={hayCambios || hayVistasPorPersistir}
        tabs={[
          { id: 'datos', label: 'Datos generales', icon: UserCog },
          {
            id: 'permisos',
            label: 'Permisos',
            icon: KeyRound,
            badge: pendientes.size > 0 && (
              <span className="ml-1 text-[10px] font-bold px-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" title="Vistas pendientes de revisión">
                {pendientes.size}
              </span>
            ),
          },
        ]}
        tabActiva={tab}
        onTab={setTab}
      >
        {tab === 'datos' ? (
          <div className="h-full overflow-y-auto">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 max-w-6xl">
              <Tarjeta titulo="Información del usuario" descripcion="Datos de identificación y acceso al sistema.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                  <CampoTexto
                    id="nombreCompleto" label="Nombre completo" icon={User}
                    value={datos.nombreCompleto} error={errores.nombreCompleto}
                    onChange={(e) => setDatos((d) => ({ ...d, nombreCompleto: e.target.value }))}
                  />
                  <CampoTexto
                    id="nombreUsuario" label="Nombre de usuario" icon={AtSign}
                    value={datos.nombreUsuario} error={errores.nombreUsuario}
                    onChange={(e) => setDatos((d) => ({ ...d, nombreUsuario: e.target.value }))}
                  />
                  <CampoTexto
                    id="email" label="Correo" icon={Mail} value={usuario.email || ''} disabled
                    ayuda="Es el correo de ingreso: no se modifica desde aquí."
                  />
                  <CampoSelect
                    id="rol" label="Rol" icon={Shield} opciones={ROLES} value={datos.rol}
                    ayuda={accesoTotal ? 'Acceso total: no se aplican los permisos granulares.' : 'Los permisos se configuran en la pestaña Permisos.'}
                    onChange={(e) => setDatos((d) => ({ ...d, rol: e.target.value }))}
                  />
                  <CampoEstado activo={datos.activo} onChange={(v) => setDatos((d) => ({ ...d, activo: v }))} />
                </div>
              </Tarjeta>

              <Tarjeta titulo="Resumen de acceso" descripcion="Según los permisos actuales (incluye cambios sin guardar).">
                {accesoTotal ? (
                  <p className="text-[12px] text-gray-600 dark:text-gray-300">Este rol tiene acceso total al sistema.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Módulos', valor: modulosConAcceso, icon: Layers },
                      { label: 'Vistas', valor: vistasConAcceso, icon: SlidersHorizontal },
                      { label: 'Restricciones', valor: resumen.total, icon: Shield, tono: resumen.total ? 'text-amber-600' : '' },
                      { label: 'Pendientes de revisión', valor: pendientes.size, icon: CircleDashed, tono: pendientes.size ? 'text-amber-600' : '' },
                    ].map((k) => (
                      <div key={k.label} className="rounded-md border border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/40 px-3 py-2.5">
                        <dt className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          <k.icon size={12} /> {k.label}
                        </dt>
                        <dd className={`text-[20px] font-semibold tabular-nums text-gray-800 dark:text-gray-100 ${k.tono || ''}`}>{k.valor}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </Tarjeta>
            </div>
          </div>
        ) : (
          <EditorPermisos
            estado={permisos}
            onCambiar={onCambiarPermisos}
            onAbrirVista={marcarRevisada}
            accesoTotalPorRol={accesoTotal}
            insigniaVista={(path) => (pendientes.has(path) ? (
              <span title="Recién habilitada con acceso total: revisa sus permisos" className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 shrink-0">
                <CircleDashed size={10} /> Pendiente de revisión
              </span>
            ) : null)}
          />
        )}
      </MarcoEdicionUsuario>
    </>
  );
};

export default EditarUsuario;
