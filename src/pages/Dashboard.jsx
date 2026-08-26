import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import {
  LogOut, Calendar, UserCircle, ChevronRight, ArrowLeft, FileText,
  Settings, Home, ShieldCheck, Menu, Shield, Moon, Sun
} from 'lucide-react';
import { MODULES } from '../config/modulesConfig.jsx';

// =================================================================
// IMPORTACIÓN DE COMPONENTES POR MÓDULOS
// =================================================================

// DASHBOARD
import ResumenGeneral from '../components/modulos/dashboard/ResumenGeneral';
// ADMINISTRACIÓN
import ControlMensual from '../components/modulos/administracion/controlMensual/ControlMensual';
// LABORATORIO
import EmpresasLaboratorio from '../components/modulos/gestiones/laboratorio/registros/EmpresasLaboratorio';
import CodigoLaboratorio from '../components/modulos/gestiones/laboratorio/registros/CodigoLaboratorio';
import OrdenLaboratorio from '../components/modulos/gestiones/laboratorio/importaciones/OrdenLaboratorio';
import XmlDocLaboratorio from '../components/modulos/gestiones/laboratorio/importaciones/XmlDocLaboratorio';
import ArchivosControlLaboratorio from '../components/modulos/gestiones/laboratorio/procesos/ArchivosControlLaboratorio';
// VACUNATORIO
import EmpresasVacunatorio from '../components/modulos/gestiones/vacunatorio/registros/EmpresasVacunatorio';
import CodigoVacunatorio from '../components/modulos/gestiones/vacunatorio/registros/CodigoVacunatorio';
import OrdenVacunatorio from '../components/modulos/gestiones/vacunatorio/importaciones/OrdenVacunatorio';
import XmlDocVacunatorio from '../components/modulos/gestiones/vacunatorio/importaciones/XmlDocVacunatorio';
import ArchivosControlVacunatorio from '../components/modulos/gestiones/vacunatorio/procesos/ArchivosControlVacunatorio';
// MAESTROS
import EmpresasMaestros from '../components/modulos/maestros/empresasMaestros/EmpresasMaestros';
import PrestadoresMaestros from '../components/modulos/maestros/prestadoresMaestro/PrestadoresMaestros';
import CentrosMaestros from '../components/modulos/maestros/centrosMaestros/CentrosMaestros';
import PrevisionesMaestros from '../components/modulos/maestros/previsionesMaestros/PrevisionesMaestros';
import ConveniosMaestros from '../components/modulos/maestros/conveniosMaestros/ConveniosMaestros';
import RecargosMaestros from '../components/modulos/maestros/recargosMaestros/RecargosMaestros';
import CalculadorMaestros from '../components/modulos/maestros/calculadorMaestros/CalculadorMaestros';
import CodigosMaestros from '../components/modulos/maestros/codigosMaestros/CodigosMaestros';
// CONSIGNACION
import GuiasConsigna from '../components/modulos/gestiones/consignacion/guiasConsigna/GuiasConsigna';
// INVENTARIO
import GeneralInventario from '../components/modulos/inventario/generalInventario/GeneralInventario';
import ExistenciasInventario from '../components/modulos/inventario/existenciasInventario/ExistenciasInventario';
import IngresosInventario from '../components/modulos/inventario/ingresosInventario/IngresosInventario';
import EgresosInventario from '../components/modulos/inventario/egresosInventario/EgresosInventario';
import TransitoInventario from '../components/modulos/inventario/transitoInventario/TransitoInventario';
import HistorialInventario from '../components/modulos/inventario/historialInventario/HistorialInventario';
// import PabellonInventario from '../components/modulos/inventario/pabellonInventario/PabellonInventario';


// AJUSTES & PERFIL 
import Perfil from '../components/modulos/general/perfil/Perfil';
// LEGALES
import PoliticasPrivacidad from '../components/modulos/general/legales/PoliticasPrivacidad';
import TerminosServicio from '../components/modulos/general/legales/TerminosServicio';





// USUARIOS
//import CrearUsuario from '../components/modulos/usuarios/CrearUsuario';
//import ListadoUsuarios from '../components/modulos/usuarios/ListadoUsuarios';

// MIS TURNOS
//import MisTurnos from '../components/modulos/misturnos/MisTurnos';

// AJUSTES & PERFIL
//import CambiarPasswordSeguro from '../components/modulos/ajustes/CambiarPasswordSeguro';







// =================================================================
// CONFIGURACIÓN DE VISTAS ESPECIALES
// =================================================================
const SPECIAL_VIEWS = {
  dashboard: { label: 'Inicio', icon: <Home size={13} /> },
  perfil: { label: 'Mi Perfil', icon: <UserCircle size={13} /> },
  password: { label: 'Cambiar Contraseña', icon: <Shield size={13} /> },
  privacidad: { label: 'Política de Privacidad', icon: <ShieldCheck size={13} /> },
  terminos: { label: 'Términos de Servicio', icon: <FileText size={13} /> },
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const menuRef = useRef(null);

  const [userData, setUserData] = useState({
    nombreCompleto: 'Usuario',
    nombreUsuario: '',
    email: '',
    rol: '',
    permisos: {}
  });

  const applyDarkMode = (enabled) => {
    if (enabled) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleModoPantalla = async () => {
    const newDark = !isDarkMode;
    const nuevoModo = newDark ? 'oscuro' : 'claro';
    setIsDarkMode(newDark);
    applyDarkMode(newDark);
    try {
      const userRef = doc(db, "usuarios", auth.currentUser.uid);
      await updateDoc(userRef, { modoPantalla: nuevoModo });
    } catch (error) {
      console.error("Error al guardar preferencia:", error);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        try {
          const docRef = doc(db, "usuarios", auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            const esModoOscuro = data.modoPantalla === 'oscuro';
            setIsDarkMode(esModoOscuro);
            applyDarkMode(esModoOscuro);
          }
        } catch (error) {
          console.error("Error al cargar datos:", error);
        }
      }
    };
    fetchUserData();
  }, []);

  const getBreadcrumb = () => {
    if (SPECIAL_VIEWS[activeView]) {
      return {
        moduloLabel: null,
        moduloIcon: null,
        vistaLabel: SPECIAL_VIEWS[activeView].label,
        vistaIcon: SPECIAL_VIEWS[activeView].icon,
      };
    }

    for (const mKey of Object.keys(MODULES)) {
      const modulo = MODULES[mKey];
      const subItem = modulo.subItems?.find(s => s.path === activeView);
      if (subItem) {
        return {
          moduloLabel: modulo.label,
          moduloIcon: modulo.icon,
          vistaLabel: subItem.label,
          vistaIcon: subItem.icon ?? null,
        };
      }
    }

    return { moduloLabel: null, moduloIcon: null, vistaLabel: activeView, vistaIcon: null };
  };

  const breadcrumb = getBreadcrumb();

  // =================================================================
  // MAPEO DE RUTAS A COMPONENTES POR MÓDULOS
  // =================================================================
  const VIEW_MAP = {
    // DASHBOARD
    'dashboard': <ResumenGeneral userData={userData} />,
    // ADMINISTRACIÓN
    '/administracion/controlMensual': <ControlMensual />,
    // LABORATORIO
    '/laboratorio/empresasLaboratorio': <EmpresasLaboratorio />, 
    '/laboratorio/codigoLaboratorio': <CodigoLaboratorio />,
    '/laboratorio/ordenLaboratorio': <OrdenLaboratorio />,
    '/laboratorio/xmlDocLaboratorio': <XmlDocLaboratorio />,
    '/laboratorio/archivosControlLaboratorio': <ArchivosControlLaboratorio />,
    // VACUNATORIO
    '/vacunatorio/empresasVacunatorio': <EmpresasVacunatorio />, 
    '/vacunatorio/codigoVacunatorio': <CodigoVacunatorio />,
    '/vacunatorio/ordenVacunatorio': <OrdenVacunatorio />,
    '/vacunatorio/xmlDocVacunatorio': <XmlDocVacunatorio />,
    '/vacunatorio/archivosControlVacunatorio': <ArchivosControlVacunatorio />,
    // AJUSTES & PERFIL
    'perfil': <Perfil userData={userData} />,
    // LEGALES
    'privacidad': <PoliticasPrivacidad />,
    'terminos': <TerminosServicio />,
    // MAESTROS
    '/maestros/empresasMaestros': <EmpresasMaestros />,
    '/maestros/prestadoresMaestros': <PrestadoresMaestros />,
    '/maestros/centrosMaestros': <CentrosMaestros />,
    '/maestros/previsionesMaestros': <PrevisionesMaestros />,
    '/maestros/conveniosMaestros': <ConveniosMaestros />,
    '/maestros/recargosMaestros': <RecargosMaestros />,
    '/maestros/calculadorMaestros': <CalculadorMaestros />,
    '/maestros/codigosMaestros': <CodigosMaestros />,
    // CONSIGNACION
    '/consignacion/guiasConsigna': <GuiasConsigna />,
    // INVENTARIO
    '/inventario/generalInventario': <GeneralInventario />,
    '/inventario/existenciasInventario': <ExistenciasInventario />,
    '/inventario/ingresosInventario': <IngresosInventario />,
    '/inventario/egresosInventario': <EgresosInventario />,
    '/inventario/transitoInventario': <TransitoInventario />,
    '/inventario/historialInventario': <HistorialInventario />,
    // '/inventario/pabellonInventario': <PabellonInventario />,







    // USUARIOS
    //'/usuarios/crear': <CrearUsuario />,
    //'/usuarios/listado': <ListadoUsuarios />, 


    // MIS TURNOS
    //'/misturnos/ver': <MisTurnos />,

    // AJUSTES & PERFIL
    //'password': <CambiarPasswordSeguro />,


  };

  const fechaActual = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const modulosPermitidos = Object.keys(MODULES).filter(
    (mKey) => (userData.permisos[mKey] || []).length > 0
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-gray-50 dark:bg-gray-900">

      {/* SIDEBAR CON ANCHO BLOQUEADO FIJO */}
      <aside className={`${
        isSidebarCollapsed ? 'w-16 min-w-[64px] max-w-[64px]' : 'w-56 min-w-[190px] max-w-[190px]'
      } bg-[#2383C2] dark:bg-gray-800 text-white transition-all duration-300 ease-in-out hidden md:flex flex-col shadow-xl h-screen sticky top-0 flex-shrink-0 z-30 select-none overflow-x-hidden`}>

        <div className="p-4 h-16 flex items-center justify-between border-b border-white/10 overflow-hidden flex-shrink-0">
          <span className={`text-sm font-bold tracking-tight whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
            Cloud - Medra
          </span>
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-gray-800 transition flex-shrink-0 ${isSidebarCollapsed ? 'mx-auto' : ''}`}
            title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="flex-1 p-2 text-xs overflow-y-auto overflow-x-hidden space-y-1">
          <div className="mb-2">
            <button
              onClick={() => { setActiveView('dashboard'); setActiveModule(null); }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Home size={16} className="flex-shrink-0" />
              <span className={`transition-all duration-300 truncate ${isSidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
                Inicio
              </span>
            </button>
            <div className="border-t border-white/10 my-2"></div>
          </div>

          {!activeModule ? (
            <div className="space-y-1">
              {modulosPermitidos.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveModule(key)}
                  className={`w-full flex items-center rounded-lg hover:bg-white/10 transition-all p-2 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}
                  title={isSidebarCollapsed ? MODULES[key].label : ""}
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <div className="flex-shrink-0">{MODULES[key].icon}</div>
                    <span className={`transition-all duration-300 truncate ${isSidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
                      {MODULES[key].label}
                    </span>
                  </div>
                  {!isSidebarCollapsed && <ChevronRight size={14} className="flex-shrink-0 opacity-60 ml-1" />}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => setActiveModule(null)}
                className={`flex items-center mb-4 text-[10px] text-white/60 hover:text-white transition-colors p-1 w-full ${isSidebarCollapsed ? 'justify-center' : 'gap-1'}`}
                title="Volver a módulos"
              >
                <ArrowLeft size={12} className="flex-shrink-0" />
                <span className={`transition-all duration-300 truncate ${isSidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
                  Volver a módulos
                </span>
              </button>

              <div className={`px-2 mb-2 font-bold uppercase text-[9px] tracking-wider text-white/50 transition-all duration-300 truncate ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                {MODULES[activeModule].label}
              </div>

              {MODULES[activeModule].subItems?.map((sub, idx) => {
                if (!userData.permisos[activeModule]?.includes(sub.path)) return null;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveView(sub.path)}
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${activeView === sub.path ? 'bg-white/20 font-semibold' : 'hover:bg-white/10'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? sub.label : ""}
                  >
                    <div className="flex-shrink-0">{sub.icon}</div>
                    <span className={`transition-all duration-300 truncate ${isSidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
                      {sub.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <div className="p-2 m-2 bg-white/5 dark:bg-black/20 rounded-xl border border-white/10 dark:border-gray-800 text-[10px] text-white/70 flex flex-col gap-2 backdrop-blur-sm overflow-hidden flex-shrink-0 transition-all duration-300">
          {!isSidebarCollapsed ? (
            <div className="transition-all duration-300 opacity-100 flex flex-col gap-2">
              <div className="flex flex-col gap-1.5 border-b border-white/5 pb-1.5">
                <button
                  onClick={() => { setActiveView('privacidad'); setActiveModule(null); }}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 truncate"
                >
                  <ShieldCheck size={12} className="opacity-70 flex-shrink-0" />
                  <span className="truncate">Política de Privacidad</span>
                </button>
                <button
                  onClick={() => { setActiveView('terminos'); setActiveModule(null); }}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5 truncate"
                >
                  <FileText size={12} className="opacity-70 flex-shrink-0" />
                  <span className="truncate">Términos de Servicio</span>
                </button>
              </div>
              <div className="flex justify-between items-center text-[9px] text-white/40 font-mono px-0.5">
                <span>Versión</span>
                <span>v1.0.0</span>
              </div>
            </div>
          ) : (
            <div
              className="flex justify-center items-center text-[9px] text-white/40 font-mono py-1 cursor-help opacity-100 transition-all duration-300"
              title="Versión 1.0.0 — Políticas disponibles en menú expandido"
            >
              <span>v1.0</span>
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-grow flex flex-col h-screen overflow-hidden gap-2">

        <header className="h-16 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">

          <div className="flex items-center gap-3 min-w-0">

            <h2 className="text-sm font-bold text-gray-700 dark:text-gray-100 flex items-center gap-2 flex-shrink-0">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              ¡Bienvenido {userData.nombreCompleto?.toUpperCase()}!
            </h2>

            <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>

            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-shrink-0">
              <Calendar size={14} /> {fechaActual}
            </p>
            <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-600 flex-shrink-0"></div>

            <nav className="flex items-center gap-1.5 text-[12px] font-medium text-gray-700 dark:text-gray-200 truncate">
              <button
                onClick={() => { setActiveView('dashboard'); setActiveModule(null); }}
                className="flex items-center gap-1 text-[#2383C2] hover:text-[#1a6aa0] dark:text-blue-400 dark:hover:text-blue-300 transition-colors font-semibold flex-shrink-0"
              >
                <Home size={13} />
                <span>Inicio</span>
              </button>

              {breadcrumb.moduloLabel && (
                <>
                  <ChevronRight size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1 flex-shrink-0">
                    {breadcrumb.moduloIcon && <span className="opacity-70">{breadcrumb.moduloIcon}</span>}
                    {breadcrumb.moduloLabel}
                  </span>
                </>
              )}

              {activeView !== 'dashboard' && (
                <>
                  <ChevronRight size={13} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="text-gray-800 dark:text-gray-100 font-semibold flex items-center gap-1 truncate">
                    {breadcrumb.vistaIcon && <span className="opacity-80">{breadcrumb.vistaIcon}</span>}
                    {breadcrumb.vistaLabel}
                  </span>
                </>
              )}
            </nav>
          </div>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="w-9 h-9 rounded-full bg-[#2383C2] text-white flex items-center justify-center font-bold text-sm shadow-md"
            >
              {userData.nombreCompleto
                ? userData.nombreCompleto
                  .trim()
                  .split(' ')
                  .filter(Boolean) 
                  .map(palabra => palabra.charAt(0).toUpperCase())
                  .slice(0, 2)
                  .join('')
                : 'U'}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 py-2 z-50 text-gray-700 dark:text-gray-200">
                <button
                  onClick={() => { setActiveView('perfil'); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <UserCircle size={16} /> Mi Perfil
                </button>
                <button
                  onClick={() => { setActiveView('password'); setIsMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Shield size={16} /> Cambiar Contraseña
                </button>
                <button
                  onClick={toggleModoPantalla}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
                  {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
                </button>
                <button
                  disabled
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                >
                  <Settings size={16} /> Ajustes Generales
                </button>
                <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium"
                >
                  <LogOut size={16} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-grow p-3 overflow-y-auto">
          <div className="h-full">
            {VIEW_MAP[activeView] || (
              <div className="text-center text-gray-500 dark:text-gray-400">
                Vista no configurada
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;