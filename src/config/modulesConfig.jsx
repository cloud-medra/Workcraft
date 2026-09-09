import React from 'react';
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightToLine,
  BadgeInfo,
  BarChart2,
  Building2,
  Boxes,
  Calendar,
  CalendarDays,
  CalendarCheck,
  Calculator,
  CheckCheck,
  ClipboardList,
  Database,
  Factory,
  FileScan,
  FileCode,
  FileSpreadsheet,
  FilePlus,
  Folder,
  FolderKanban,
  Microscope,
  Hash,
  Handshake,
  Hospital,
  History,
  LayoutDashboard,
  ListTree,
  Percent,
  PackageCheck,
  PackagePlus,
  PackageMinus,
  PackageSearch,
  Settings2,
  ShieldCheck,
  StickyNote,
  Syringe,
  ScanBarcode,
  Truck,
  Users,
  UserPlus,
  UserSearch,
  UserRound,
  Warehouse,
  UserCircle,
  Shield,
  Sun,
  Lock,
  Eye,
  ArrowUpDown,
  Sliders,
  SlidersHorizontal,
  HelpCircle,
  Home,
  FileText
} from "lucide-react";

export const MODULES = {
  dashboard: {
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    path: '/dashboard'
  },
  administracion: {
    label: 'Administración',
    icon: <Settings2 size={16} />,
    subItems: [
      { label: 'Control Mensual', path: '/administracion/controlMensual', icon: <CalendarCheck size={14} /> },
      { label: 'Periodo Actual', path: '/administracion/ResumenPeriodoAbierto', icon: <CalendarDays size={14} /> },
      { label: 'Notas Admin', path: '/administracion/notasAdmin', icon: <StickyNote size={14} /> },
      { label: 'Crear Usuario', path: '/administracion/crearUsuario', icon: <UserPlus size={14} /> },
      { label: 'Lista Usuario', path: '/administracion/listadoUsuario', icon: <Users size={14} /> }
    ]
  },
  laboratorio: {
    label: 'Laboratorio',
    icon: <Microscope size={18} />,
    subItems: [
      { label: 'Registro Empresas', path: '/laboratorio/empresasLaboratorio', icon: <Building2 size={14} /> },
      { label: 'Maestro Códigos', path: '/laboratorio/codigoLaboratorio', icon: <BadgeInfo size={14} /> },
      { label: 'Ordenes', path: '/laboratorio/ordenLaboratorio', icon: <ClipboardList size={14} /> },
      { label: 'Xml Documentos', path: '/laboratorio/xmlDocLaboratorio', icon: <FileCode size={14} /> },
      { label: 'Control Procesos', path: '/laboratorio/archivosControlLaboratorio', icon: <FileSpreadsheet size={14} /> },
    ]
  },
  vacunatorio: {
    label: 'Vacunatorio',
    icon: <Syringe size={18} />,
    subItems: [
      { label: 'Registro Empresas', path: '/vacunatorio/empresasVacunatorio', icon: <Building2 size={14} /> },
      { label: 'Maestro Códigos', path: '/vacunatorio/codigoVacunatorio', icon: <BadgeInfo size={14} /> },
      { label: 'Ordenes', path: '/vacunatorio/ordenVacunatorio', icon: <ClipboardList size={14} /> },
      { label: 'Xml Documentos', path: '/vacunatorio/xmlDocVacunatorio', icon: <FileCode size={14} /> },
      { label: 'Control Procesos', path: '/vacunatorio/archivosControlVacunatorio', icon: <FileSpreadsheet size={14} /> },
    ]
  },
  maestros: {
    label: 'Maestros',
    icon: <Database size={18} />,
    subItems: [
      { label: 'Empresas', path: '/maestros/empresasMaestros', icon: <Factory size={14} /> },
      { label: 'Prestadores', path: '/maestros/prestadoresMaestros', icon: <UserRound size={14} /> },
      { label: 'Centros', path: '/maestros/centrosMaestros', icon: <Hospital size={14} /> },
      { label: 'Previsiones', path: '/maestros/previsionesMaestros', icon: <ShieldCheck size={14} /> },
      { label: 'Convenios', path: '/maestros/conveniosMaestros', icon: <Handshake size={14} /> },
      { label: 'Recargos', path: '/maestros/recargosMaestros', icon: <Percent size={14} /> },
      { label: 'Calculador', path: '/maestros/calculadorMaestros', icon: <Calculator size={14} /> },
      { label: 'Codigos', path: '/maestros/codigosMaestros', icon: <Hash size={14} /> },
      { label: 'Pad', path: '/maestros/padMaestros', icon: <SlidersHorizontal size={14} /> },
      { label: 'Listado', path: '/maestros/listadoMaestros', icon: <ListTree size={14} /> },
    ]
  },
  consignacion: {
    label: 'Consignación',
    icon: <PackageCheck size={18} />,
    subItems: [
      { label: 'Ingresar Guía', path: '/consignacion/ingresarGuiaDespacho', icon: <FileScan size={14} /> },
      { label: 'Listado Guía', path: '/consignacion/listadoguiasconsignacion', icon: <FileText size={14} /> },
      { label: 'Registros', path: '/consignacion/registroConsignacion', icon: <ArrowRightToLine size={14} /> },
      { label: 'Cargas', path: '/consignacion/cargasConsignacion', icon: <CheckCheck size={14} /> },
      { label: 'Solicitud', path: '/consignacion/solicitudConsignacion', icon: <FilePlus size={14} /> },
      { label: 'Resumen', path: '/consignacion/resumenConsignacion', icon: <BarChart2 size={14} /> },
    ]
  },
  inventario: {
    label: 'Inventario',
    icon: <Warehouse size={18} />,
    subItems: [
      { label: 'Stock General', path: '/inventario/generalInventario', icon: <Boxes size={14} /> },
      { label: 'Existencias', path: '/inventario/existenciasInventario', icon: <PackageSearch size={14} /> },
      { label: 'Ingresos', path: '/inventario/ingresosInventario', icon: <ArrowDownToLine size={14} /> },
      { label: 'Egresos', path: '/inventario/egresosInventario', icon: <ArrowUpFromLine size={14} /> },
      { label: 'En Tránsito', path: '/inventario/transitoInventario', icon: <Truck size={14} /> },
      { label: 'Historial', path: '/inventario/historialInventario', icon: <History size={14} /> },
      { label: 'Stock Unidad', path: '/inventario/unidadInventario', icon: <Building2 size={14} /> },
    ]
  },
  documentos: {
    label: 'Documentos',
    icon: <Folder size={18} />,
    subItems: [
      { label: 'Reportes Info', path: '/documentos/reportesInfo', icon: <BarChart2 size={14} /> },
    ]
  },

  implantes: {
    label: 'Implantes',
    icon: <Activity size={18} />,
    subItems: [
      { label: 'Gestion', path: '/implantes/gestionImplantes', icon: <FolderKanban size={14} /> },
      { label: 'Solicitud', path: '/implantes/solicitudImplantes', icon: <FilePlus size={14} /> },
      { label: 'Resumen', path: '/implantes/resumenImplantes', icon: <BarChart2 size={14} /> },
    ]
  }
};

// --- CONFIGURACIÓN DE AJUSTES DEL SISTEMA ---
export const AJUSTES_ITEMS = [
  { path: '/settings/datosUsuarios', label: 'Datos Personales', icon: <UserCircle size={15} /> },
  { path: '/settings/cambiarPasswordAjustes', label: 'Cambiar Contraseña', icon: <Shield size={15} /> },
  { path: '/settings/ajusteTema', label: 'Tema y Apariencia', icon: <Sun size={15} /> },
  { path: '/ajustes/configPrivacidad', label: 'Config. Privacidad', icon: <Lock size={15} /> },
  { path: '/settings/modulosVisibles', label: 'Módulos Visibles', icon: <Eye size={15} /> },
  { path: '/settings/ordenModulos', label: 'Orden de Módulos', icon: <ArrowUpDown size={15} /> },
  { path: '/ajustes/preferenciasGenerales', label: 'Preferencias Generales', icon: <Sliders size={15} /> },
  { path: '/ajustes/ayudaSoporte', label: 'Ayuda y Soporte', icon: <HelpCircle size={15} /> },
];

// --- VISTAS ESPECIALES Y BREADCRUMBS ---
export const SPECIAL_VIEWS = {
  'dashboard': { label: 'Inicio', icon: <Home size={13} /> },
  'perfil': { label: 'Mi Perfil', icon: <UserCircle size={13} /> },
  'privacidad': { label: 'Política de Privacidad', icon: <ShieldCheck size={13} /> },
  'terminos': { label: 'Términos de Servicio', icon: <FileText size={13} /> },
  '/settings/datosUsuarios': { label: 'Datos Personales', icon: <UserCircle size={13} /> },
  '/settings/cambiarPasswordAjustes': { label: 'Cambiar Contraseña', icon: <Shield size={13} /> },
  '/settings/ajusteTema': { label: 'Tema y Apariencia', icon: <Sun size={13} /> },
  '/ajustes/configPrivacidad': { label: 'Configuración de Privacidad', icon: <Lock size={13} /> },
  '/settings/modulosVisibles': { label: 'Módulos Visibles', icon: <Eye size={13} /> },
  '/settings/ordenModulos': { label: 'Orden de Módulos', icon: <ArrowUpDown size={13} /> },
  '/ajustes/preferenciasGenerales': { label: 'Preferencias Generales', icon: <Sliders size={13} /> },
  '/ajustes/ayudaSoporte': { label: 'Centro de Ayuda', icon: <HelpCircle size={13} /> },
};
