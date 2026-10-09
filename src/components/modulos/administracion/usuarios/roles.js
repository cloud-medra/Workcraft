// Roles de usuario (Crear Usuario, Editar usuario, Listado Usuario y
// Permisos por centro). La lista vive en functions/permisos/nucleo.mjs
// (la comparten las Cloud Functions). admin y dev (administradores del
// sistema) tienen acceso total: no se les aplican permisos granulares ni
// plantillas; encargado y operador reciben la plantilla de su centro + rol.
import { ROLES as LISTA, ROLES_CON_PLANTILLA, esRolAccesoTotal, labelRol } from '../../../../../functions/permisos/nucleo.mjs';

export const ROLES = LISTA.map(({ value, label }) => ({ value, label }));
export { ROLES_CON_PLANTILLA, esRolAccesoTotal, labelRol };
