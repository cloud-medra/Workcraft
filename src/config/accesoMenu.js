import { MODULES } from './modulesConfig.jsx';

// Qué ítems del menú ve un usuario. Lo normal es lo que tiene en
// `permisos[modulo]`; los ítems `soloAdministradores` (ej. Administración →
// Permisos por centro) los ven siempre admin/dev y nunca los demás, aunque
// figuren en sus permisos (no se asignan desde el editor de permisos).

export const esAdministrador = (userData) => userData?.rol === 'admin' || userData?.rol === 'dev';

export const subItemsVisibles = (userData, moduloKey) => {
  const permitidos = userData?.permisos?.[moduloKey] || [];
  const admin = esAdministrador(userData);
  return (MODULES[moduloKey]?.subItems || []).filter((s) => (s.soloAdministradores ? admin : permitidos.includes(s.path)));
};

// ¿Puede abrir esta vista? Las rutas de ítems `soloAdministradores` solo admin/dev.
export const RUTAS_SOLO_ADMINISTRADORES = new Set(
  Object.values(MODULES).flatMap((m) => (m.subItems || []).filter((s) => s.soloAdministradores).map((s) => s.path))
);
export const puedeAbrirVista = (userData, ruta) => !RUTAS_SOLO_ADMINISTRADORES.has(ruta) || esAdministrador(userData);

// Ítems que se pueden asignar en el editor de permisos (sin los de solo administradores).
export const subItemsAsignables = (modulo) => (modulo.subItems || []).filter((s) => !s.soloAdministradores);
