import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { 
  LogOut, Calendar, UserCircle, ChevronRight, ArrowLeft, FileText,
  Settings, LayoutDashboard, Home, ShieldCheck, Menu 
} from 'lucide-react';
import { MODULES } from '../config/modulesConfig.jsx';
import CrearUsuario from '../components/modulos/usuarios/CrearUsuario';
import ListadoUsuarios from '../components/modulos/usuarios/ListadoUsuarios';
import Perfil from '../components/modulos/perfil/Perfil';
import Ajustes from '../components/modulos/ajustes/Ajustes';
import Medicos from '../components/modulos/maestros/Medicos';
import Empresas from '../components/modulos/maestros/Empresas';
import Codigos from '../components/modulos/maestros/Codigos';
import Convenios from '../components/modulos/maestros/Convenios';
import Previsiones from '../components/modulos/maestros/Previsiones';
import Margen from '../components/modulos/maestros/Margen';
import CalculadoraMargen from "../components/modulos/maestros/CalculadoraMargen";
import Guias from '../components/modulos/consignacion/Guias';
import VistaRapida from '../components/modulos/consignacion/VistaRapida';
import EmpresasLaboratorio from '../components/modulos/laboratorio/Empresas';
import Facturas from '../components/modulos/laboratorio/Facturas';
import IngresoFacturas from '../components/modulos/laboratorio/IngresoFacturas';
import ResumenLaboratorio from '../components/modulos/laboratorio/ResumenLaboratorio';
import CodigoLaboratorio from '../components/modulos/laboratorio/CodigoLaboratorio';
import ImportarOrden from '../components/modulos/laboratorio/ImportarOrden';
import ControlFacturas from '../components/modulos/laboratorio/controlFacturas/ControlFacturas';
import CargaDatos from '../components/modulos/documentos/CargaDatos';
import DashboardFinanciero from '../components/modulos/documentos/DashboardFinanciero';
import PoliticasPrivacidad from '../components/modulos/legales/PoliticasPrivacidad';
import TerminosServicio from '../components/modulos/legales/TerminosServicio';
import ResumenGeneral from '../components/modulos/dashboard/ResumenGeneral';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeModule, setActiveModule] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const menuRef = useRef(null);

  const [userData, setUserData] = useState({
    nombreCompleto: 'Usuario',
    nombreUsuario: '',
    email: '',
    rol: '',
    permisos: {}
  });

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // CORREGIDO: Eliminada la clave estática duplicada inferior para que tome ResumenGeneral correctamente
  const VIEW_MAP = {
    'dashboard': <ResumenGeneral userData={userData} />,
    '/usuarios/crear': <CrearUsuario />,
    '/usuarios/listado': <ListadoUsuarios />,
    '/maestros/medicos': <Medicos />,
    '/maestros/empresas': <Empresas />,
    '/maestros/codigos': <Codigos />,
    '/maestros/convenios': <Convenios />,
    '/maestros/previsiones': <Previsiones />,
    '/maestros/margenes': <Margen />,
    '/maestros/calculadora': <CalculadoraMargen />,
    '/consignacion/guias': <Guias />,
    '/consignacion/vistaRapida': <VistaRapida />,
    '/laboratorio/empresas': <EmpresasLaboratorio />,
    '/laboratorio/facturas': <Facturas />,
    '/laboratorio/ingresoFacturas': <IngresoFacturas />,
    '/laboratorio/resumenLaboratorio': <ResumenLaboratorio />,
    '/laboratorio/codigoLaboratorio': <CodigoLaboratorio />,
    '/laboratorio/importarOrden': <ImportarOrden />,
    '/laboratorio/controlFactura': <ControlFacturas />,
    '/documentos/carga': <CargaDatos />,
    '/documentos/DashboardFinanciero': <DashboardFinanciero />,
    'privacidad': <PoliticasPrivacidad />,
    'terminos': <TerminosServicio />,
    'perfil': <Perfil userData={userData} />,
    'ajustes': <Ajustes />
  };

  const fechaActual = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        try {
          const docRef = doc(db, "usuarios", auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) setUserData(docSnap.data());
        } catch (error) {
          console.error("Error al cargar datos:", error);
        }
      }
    };
    fetchUserData();
  }, []);

  const modulosPermitidos = Object.keys(MODULES).filter((mKey) => {
    const subItemsPermitidos = userData.permisos[mKey] || [];
    return subItemsPermitidos.length > 0;
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) { console.error("Error al cerrar sesión:", error); }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 overflow-hidden">
      <aside className={`${isSidebarCollapsed ? 'w-16' : 'w-48'} bg-[#2383C2] text-white hidden md:flex flex-col shadow-xl h-screen sticky top-0 [transition:width_0.4s_cubic-bezier(0.25,1,0.5,1)] will-change-[width]`}>
        <div className="p-4 h-16 flex items-center justify-between border-b border-white/10 overflow-hidden">
          <span className={`text-sm font-bold tracking-tight whitespace-nowrap transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
            Cloud - Medra
          </span>
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
            className={`p-1.5 rounded-lg hover:bg-white/10 transition flex-shrink-0 ${isSidebarCollapsed ? 'mx-auto' : ''}`}
            title={isSidebarCollapsed ? "Expandir menú" : "Colapsar menú"}
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="flex-1 p-2 text-xs overflow-y-auto overflow-x-hidden space-y-1 select-none">
          <div className="mb-2">
            <button
              onClick={() => { setActiveView('dashboard'); setActiveModule(null); }}
              className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white/10 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
            >
              <Home size={16} className="flex-shrink-0" /> 
              <span className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
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
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex-shrink-0">{MODULES[key].icon}</div>
                    <span className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
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
                <span className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
                  Volver a módulos
                </span>
              </button>
              
              <div className={`px-2 mb-2 font-bold uppercase text-[9px] tracking-wider text-white/50 transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                {MODULES[activeModule].label}
              </div>

              {MODULES[activeModule].subItems?.map((sub, idx) => {
                if (!userData.permisos[activeModule]?.includes(sub.path)) return null;
                return (
                  <button 
                    key={idx} 
                    onClick={() => setActiveView(sub.path)} 
                    className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${activeView === sub.path ? 'bg-white/20' : 'hover:bg-white/10'} ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    title={isSidebarCollapsed ? sub.label : ""}
                  >
                    <div className="flex-shrink-0">{sub.icon}</div>
                    <span className={`transition-all duration-300 whitespace-nowrap ${isSidebarCollapsed ? 'opacity-0 w-0 pointer-events-none' : 'opacity-100 w-auto'}`}>
                      {sub.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <div className="p-2 m-2 bg-white/5 rounded-xl border border-white/10 text-[10px] text-white/70 flex flex-col gap-2 backdrop-blur-sm overflow-hidden flex-shrink-0 transition-all duration-300">
          {!isSidebarCollapsed ? (
            <div className="transition-all duration-300 opacity-100 flex flex-col gap-2">
              <div className="flex flex-col gap-1.5 border-b border-white/5 pb-1.5">
                <button 
                  onClick={() => { setActiveView('privacidad'); setActiveModule(null); }}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5"
                >
                  <ShieldCheck size={12} className="opacity-70 flex-shrink-0" /> Política de Privacidad
                </button>
                <button 
                  onClick={() => { setActiveView('terminos'); setActiveModule(null); }}
                  className="hover:text-white transition-colors text-left flex items-center gap-1.5"
                >
                  <FileText size={12} className="opacity-70 flex-shrink-0" /> Términos de Servicio
                </button>
              </div>
              <div className="flex justify-between items-center text-[9px] text-white/40 font-mono px-0.5">
                <span>Versión</span>
                <span>v1.0.0</span>
              </div>
            </div>
          ) : (
            <div 
              className="flex justify-center items-center text-[9px] text-white/40 font-mono py-1 cursor-help opacity-100 transition-all duration-300 animate-fadeIn"
              title="Versión 1.0.0 — Políticas disponibles en menú expandido"
            >
              <span>v1.0</span>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden gap-2">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> ¡Bienvenido {userData.nombreCompleto?.toUpperCase()}!
            </h2>
            <div className="h-4 w-[1px] bg-gray-300"></div>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <Calendar size={14} /> {fechaActual}
            </p>
          </div>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-9 h-9 rounded-full bg-[#2383C2] text-white flex items-center justify-center font-bold text-sm shadow-md">
              {userData.nombreCompleto?.charAt(0).toUpperCase()}
            </button>
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                <button
                  onClick={() => { setActiveView('perfil'); setIsMenuOpen(false); setActiveModule(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <UserCircle size={16} /> Mi Perfil
                </button>
                <button
                  onClick={() => { setActiveView('ajustes'); setIsMenuOpen(false); setActiveModule(null); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings size={16} /> Ajustes
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium"><LogOut size={16} /> Cerrar Sesión</button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-grow p-3 overflow-y-auto">
          <div className="h-full">
            {VIEW_MAP[activeView] || <div className="text-center text-gray-500">Vista no configurada</div>}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;