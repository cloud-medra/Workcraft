import React from 'react';
import {
  Users,
  LayoutDashboard,
  UserPlus,
  UserSearch,
  Building2,
  Microscope,
  BadgeInfo,
  Calendar,
  CalendarDays,
  CalendarCheck,
  ClipboardList,
  Settings2,
  FileCode,
  FileSpreadsheet,
  Database,
  Syringe
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
    label: 'Maestro',
    icon: <Database size={18} />,
    subItems: [
      { label: 'Registro Empresas', path: '/maestros/empresasMaestros', icon: <Building2 size={14} /> },
      // { label: 'Prestadores', path: '/maestros/prestadoresMaestros', icon: <Building2 size={14} /> },
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