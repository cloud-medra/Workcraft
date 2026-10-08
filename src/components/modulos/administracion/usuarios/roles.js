// Roles de usuario (Crear Usuario, Editar usuario y Listado Usuario).
// admin y dev tienen acceso total: no se les aplican permisos granulares.
export const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'dev', label: 'Desarrollador' },
  { value: 'encargado', label: 'Encargado' },
  { value: 'operador', label: 'Operador' },
];

export const esRolAccesoTotal = (rol) => rol === 'admin' || rol === 'dev';
export const labelRol = (rol) => ROLES.find((r) => r.value === rol)?.label || rol || 'Sin rol';
