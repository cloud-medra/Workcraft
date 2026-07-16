import {
  Users,
  LayoutDashboard,
  UserPlus,
  UserSearch,
  User,
  Building2,
  Barcode,
  HeartPulse,
  Handshake,
  Percent,
  Database,
  Calculator,
  Package,
  Microscope,
  Eye,
  Folder,
  FileUp,
  BarChart3,
  Receipt,
  FilePlus2,
  FileBarChart,
  FileText,
  BadgeInfo,
  ClipboardList,
  ShieldCheck,
  ClipboardCheck,
  Upload,
  FileSpreadsheet
} from "lucide-react";

export const MODULES = {
  dashboard: {
    label: 'Dashboard',
    icon: <LayoutDashboard size={18} />,
    path: '/dashboard'
  },
  usuarios: {
    label: 'Usuarios',
    icon: <Users size={18} />,
    subItems: [
      { label: 'Crear Usuario', path: '/usuarios/crear', icon: <UserPlus size={14} /> },
      { label: 'Listado', path: '/usuarios/listado', icon: <UserSearch size={14} /> },
    ]
  },
  maestros: {
    label: 'Maestros',
    icon: <Database size={18} />,
    subItems: [
      { label: 'Médicos', path: '/maestros/medicos', icon: <User size={14} /> },
      { label: 'Empresas', path: '/maestros/empresas', icon: <Building2 size={14} /> },
      { label: 'Códigos', path: '/maestros/codigos', icon: <Barcode size={14} /> },
      { label: 'Previsiones', path: '/maestros/previsiones', icon: <HeartPulse size={14} /> },
      { label: 'Convenios', path: '/maestros/convenios', icon: <Handshake size={14} /> },
      { label: 'Margen', path: '/maestros/margenes', icon: <Percent size={14} /> },
      { label: 'Calculadora', path: '/maestros/calculadora', icon: <Calculator size={14} /> }
    ]
  },
  consignacion: {
    label: 'Consignación',
    icon: <Package size={18} />,
    subItems: [
      { label: 'Guías', path: '/consignacion/guias', icon: <Package size={14} /> },
      { label: 'Vista Rápida', path: '/consignacion/vistaRapida', icon: <Eye size={14} /> },
      { label: 'Solicitud Ingresos', path: '/consignacion/solicitudIngresos', icon: <FileText size={14} /> },
      { label: 'Seguimiento', path: '/consignacion/seguimiento', icon: <ClipboardList size={14} /> }, // <- Modificado aquí
      { label: 'Cargos', path: '/consignacion/consignacionLayout', icon: <Upload size={14} /> }
    ]
  },
  laboratorio: {
    label: 'Laboratorio',
    icon: <Microscope size={18} />,
    subItems: [
      { label: 'Registro Empresas', path: '/laboratorio/empresas', icon: <Building2 size={14} /> },
      { label: 'Importar Facturas', path: '/laboratorio/facturas', icon: <Receipt size={14} /> },
      { label: 'Importar Orden', path: '/laboratorio/importarOrden', icon: <ClipboardList size={14} /> },
      { label: 'Ingreso Facturas', path: '/laboratorio/ingresoFacturas', icon: <FilePlus2 size={14} /> },
      { label: 'Resumen Laboratorio', path: '/laboratorio/resumenLaboratorio', icon: <FileBarChart size={14} /> },
      { label: 'Maestro Codigos', path: '/laboratorio/codigoLaboratorio', icon: <BadgeInfo size={14} /> },
      { label: 'Control Facturas', path: '/laboratorio/controlFactura', icon: <ClipboardCheck size={14} /> }
    ]
  },

  documentos: {
    label: 'Documentos',
    icon: <Folder size={18} />,
    subItems: [
      { label: 'Carga Datos', path: '/documentos/carga', icon: <FileUp size={14} /> },
      { label: 'Dashbaord', path: '/documentos/DashboardFinanciero', icon: <BarChart3 size={14} /> },
      { label: 'Reporte Pabellón', path: '/documentos/reportePabellon', icon: <FileSpreadsheet size={14} /> }
    ]
  },
};