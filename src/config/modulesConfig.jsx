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
  ClipboardList
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
  laboratorio: {
    label: 'Laboratorio',
    icon: <Microscope size={18} />,
    subItems: [
      { label: 'Registro Empresas', path: '/laboratorio/empresasLaboratorio', icon: <Building2 size={14} /> },
      { label: 'Maestro Codigos', path: '/laboratorio/codigoLaboratorio', icon: <BadgeInfo size={14} /> },
      { label: 'Ordenes', path: '/laboratorio/ordenLaboratorio', icon: <ClipboardList size={14} /> }
    ]
  },
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
};