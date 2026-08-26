import React from 'react';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeInfo,
  Building2,
  Boxes,
  Calendar,
  CalendarDays,
  CalendarCheck,
  Calculator,
  ClipboardList,
  Database,
  Factory,
  FileCode,
  FileSpreadsheet,
  Microscope,
  Hash,
  Handshake,
  Hospital,
  History,
  LayoutDashboard,
  Percent,
  PackageCheck,
  PackagePlus,
  PackageMinus,
  PackageSearch,
  Settings2,
  ShieldCheck,
  Syringe,
  ScanBarcode,
  Truck,
  Users,
  UserPlus,
  UserSearch,
  UserRound,
  Warehouse,

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
      {
        label: 'Control Mensual',
        path: '/administracion/controlMensual',
        icon: <CalendarCheck size={14} />
      }
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
    ]
  },
  consignacion: {
    label: 'Consignación',
    icon: <PackageCheck size={18} />,
    subItems: [
      { label: 'Guias', path: '/consignacion/guiasConsigna', icon: <ScanBarcode size={14} /> },
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
      // { label: 'Stock Pabellón', path: '/inventario/stockPabellon', icon: <Building2 size={14} /> },
    ]
  }



  /*
    usuarios: { 
      label: 'Usuarios',
      icon: <Users size={18} />,
      subItems: [
        { label: 'Crear Usuario', path: '/usuarios/crear', icon: <UserPlus size={14} /> },
        { label: 'Listado', path: '/usuarios/listado', icon: <UserSearch size={14} /> },
      ]
    },
    
    ,
  
    
  
    misturnos: {
      label: 'Mis Turnos',
      icon: <CalendarDays size={18} />,
      subItems: [
        {
          label: 'Ver Turnos',
          path: '/misturnos/ver',
          icon: <Calendar size={14} />
        }
      ]
    }
  
      */
};