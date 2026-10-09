import { describe, it, expect } from 'vitest';
import { subItemsVisibles, puedeAbrirVista, subItemsAsignables, esAdministrador } from './accesoMenu';
import { MODULES } from './modulesConfig.jsx';

const RUTA = '/administracion/permisosCentro';
const rutas = (u) => subItemsVisibles(u, 'administracion').map((s) => s.path);

describe('Administración → Permisos por centro: solo admin/dev', () => {
  it('admin y dev lo ven en el menú aunque no esté en sus permisos', () => {
    expect(rutas({ rol: 'admin', permisos: {} })).toContain(RUTA);
    expect(rutas({ rol: 'dev', permisos: { administracion: ['/administracion/listadoUsuario'] } })).toEqual(['/administracion/listadoUsuario', RUTA]);
  });

  it('encargado y operador no lo ven ni pueden abrirlo, aunque figure en sus permisos', () => {
    const op = { rol: 'operador', permisos: { administracion: ['/administracion/listadoUsuario', RUTA] } };
    expect(rutas(op)).toEqual(['/administracion/listadoUsuario']);
    expect(puedeAbrirVista(op, RUTA)).toBe(false);
    expect(puedeAbrirVista({ rol: 'encargado', permisos: {} }, RUTA)).toBe(false);
    expect(puedeAbrirVista({ rol: 'admin' }, RUTA)).toBe(true);
    expect(puedeAbrirVista(op, '/administracion/listadoUsuario')).toBe(true);
    expect(esAdministrador(undefined)).toBe(false);
  });

  it('no se puede asignar desde el editor de permisos (usuarios ni centros)', () => {
    expect(subItemsAsignables(MODULES.administracion).map((s) => s.path)).not.toContain(RUTA);
    expect(subItemsAsignables(MODULES.administracion).map((s) => s.path)).toContain('/administracion/listadoUsuario');
  });
});
