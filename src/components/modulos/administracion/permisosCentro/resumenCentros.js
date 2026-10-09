// Administración → Permisos por centro: una fila por centro activo del
// Maestro "Centros", con el estado de su configuración POR ROL (plantilla
// centro + rol) y sus usuarios por rol. Sin lecturas: sale del catálogo,
// las plantillas y los usuarios ya cargados.
import { MODULES } from '../../../../config/modulesConfig.jsx';
import {
  tieneExcepciones, idPlantilla, ROLES_CON_PLANTILLA, ROL_POR_DEFECTO,
} from '../../../../../functions/permisos/nucleo.mjs';

const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const rolDeUsuario = (u) => u?.rol || ROL_POR_DEFECTO;

export const resumenCentros = (centros, plantillas, usuarios) => centros
  .filter((c) => c.nombre && c.estado !== 'INACTIVO')
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  .map((c) => {
    const delCentro = usuarios.filter((u) => u.centroCostoId === c.id);
    const roles = Object.fromEntries(ROLES_CON_PLANTILLA.map((rol) => {
      const plantilla = plantillas[idPlantilla(c.id, rol)];
      const delRol = delCentro.filter((u) => rolDeUsuario(u) === rol);
      return [rol, {
        configurada: Boolean(plantilla),
        modulos: Object.entries(plantilla?.permisos || {}).filter(([, rutas]) => rutas?.length).map(([k]) => MODULES[k]?.label || k),
        usuarios: delRol.length,
        personalizados: delRol.filter((u) => tieneExcepciones(u.excepciones)).length,
      }];
    }));
    const estados = Object.values(roles);
    return {
      id: c.id,
      nombre: c.nombre,
      usarEnGestiones: c.usarEnGestiones !== false,
      roles,
      usuarios: delCentro.length,
      personalizados: delCentro.filter((u) => tieneExcepciones(u.excepciones)).length,
      // Usuarios que hoy no reciben permisos (su combinación no está configurada).
      sinPermisos: estados.reduce((n, r) => n + (r.configurada ? 0 : r.usuarios), 0),
      ningunaConfigurada: estados.every((r) => !r.configurada),
    };
  });

export const filtrarCentros = (filas, busqueda) => {
  const q = normalizar(busqueda).trim();
  return q ? filas.filter((f) => normalizar(f.nombre).includes(q)) : filas;
};
