import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LogOut, Calendar, UserCircle, ChevronRight, ArrowLeft, Settings, LayoutDashboard, Home } from 'lucide-react';
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
import AuditoriaFactura from '../components/modulos/laboratorio/auditoriaFactura/AuditoriaFacturas';
import ControlFacturas from '../components/modulos/laboratorio/controlFacturas/ControlFacturas';

import CargaDatos from '../components/modulos/documentos/CargaDatos';
import DashboardFinanciero from '../components/modulos/documentos/DashboardFinanciero';

const Dashboard = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const VIEW_MAP = {
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
    '/laboratorio/auditoriaFactura': <AuditoriaFactura />,
    '/laboratorio/controlFactura': <ControlFacturas />,
    
    '/documentos/carga': <CargaDatos />,
    '/documentos/DashboardFinanciero': <DashboardFinanciero />,


    'perfil': <Perfil userData={userData} />,
    'ajustes': <Ajustes />,
    'dashboard': (
      <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <LayoutDashboard size={48} className="mb-4 opacity-50" />
        <p>Selecciona una opción del menú para comenzar.</p>
      </div>
    )
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
    <div className="min-h-screen flex bg-gray-50">
      <aside className="w-48 bg-[#0E5B6D] text-white hidden md:flex flex-col shadow-xl">
        <div className="p-4 text-lg font-bold border-b border-white/10 tracking-tight">Cloud - Medra</div>

        <nav className="flex-1 p-2 text-xs">
          <div className="mb-2">
            <button
              onClick={() => { setActiveView('dashboard'); setActiveModule(null); }}
              className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition"
            >
              <Home size={16} /> Inicio
            </button>
            <div className="border-t border-white/10 my-2"></div>
          </div>

          {!activeModule ? (
            <div className="space-y-1">
              {modulosPermitidos.map((key) => (
                <button key={key} onClick={() => setActiveModule(key)} className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white/10 transition">
                  <div className="flex items-center gap-2">{MODULES[key].icon} {MODULES[key].label}</div>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          ) : (
            <div>
              <button onClick={() => setActiveModule(null)} className="flex items-center gap-1 mb-4 text-[10px] text-white/60 hover:text-white transition p-1">
                <ArrowLeft size={12} /> Volver a módulos
              </button>
              <div className="px-2 mb-2 font-bold uppercase text-[9px] tracking-wider text-white/50">{MODULES[activeModule].label}</div>
              {MODULES[activeModule].subItems?.map((sub, idx) => {
                if (!userData.permisos[activeModule]?.includes(sub.path)) return null;
                return (
                  <button key={idx} onClick={() => setActiveView(sub.path)} className={`w-full flex items-center gap-2 p-2 rounded-lg transition ${activeView === sub.path ? 'bg-white/20' : 'hover:bg-white/10'}`}>
                    {sub.icon} {sub.label}
                  </button>
                );
              })}
            </div>
          )}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden gap-2">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 border-b border-gray-100">
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
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="w-9 h-9 rounded-full bg-[#0E5B6D] text-white flex items-center justify-center font-bold text-sm shadow-md">
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