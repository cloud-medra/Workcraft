// Administración → Estadísticas: configuración compartida por la pantalla.
// Las estadísticas se calculan por período de imputación (el mismo de
// Período Actual y del cierre) en Cloud Functions (functions/estadisticas)
// y se guardan en estadisticas/{modulo}_{AAAA-MM}; la pantalla solo lee
// esos documentos.

import { MESES } from '../controlMensual/constants';

export const RUTA_VISTA_ESTADISTICAS = '/administracion/estadisticas';
export const COLECCION_ESTADISTICAS = 'estadisticas';
export const ID_INDICE = '_indice';
export const SIN_INFORMAR = 'Sin informar';

// Bloques de la pantalla. Para sumar Laboratorio y Vacunatorio (bloque 2) se
// agrega su fuente en functions/estadisticas/nucleo.js (FUENTES) y su bloque
// acá; la pantalla ya trabaja con cualquier lista de módulos y dimensiones.
export const BLOQUES = [
  {
    id: 'consumos',
    nombre: 'Implantes, Consignación y Hemodinamia',
    modulos: [
      { id: 'implantes', nombre: 'Implantes', permiso: 'opt_implantes' },
      { id: 'consignacion', nombre: 'Consignación', permiso: 'opt_consignacion' },
      { id: 'hemodinamia', nombre: 'Hemodinamia', permiso: 'opt_hemodinamia' },
    ],
    dimensiones: ['m', 'c', 'e'],
  },
];

export const DIMENSIONES = {
  m: { id: 'm', nombre: 'Médicos', singular: 'Médico', permiso: 'tab_medicos' },
  c: { id: 'c', nombre: 'Cirugías', singular: 'Cirugía', permiso: 'tab_cirugias' },
  e: { id: 'e', nombre: 'Empresas', singular: 'Empresa', permiso: 'tab_empresas' },
};

// Cruces que muestra el detalle de cada dimensión.
export const CRUCES = { m: ['c', 'e'], c: ['m', 'e'], e: ['c', 'm'] };

// Períodos: clave 'AAAA-MM' (orden natural) <-> { anio, mes: 'octubre' }.
export const claveMes = (anio, mesId) => {
  const mes = MESES.find((m) => m.id === mesId);
  return mes ? `${anio}-${String(mes.num).padStart(2, '0')}` : null;
};
export const desdeClave = (clave) => {
  const [anio, mm] = String(clave).split('-');
  const mes = MESES.find((m) => m.num === Number(mm));
  return mes ? { anio, mes: mes.id } : null;
};
export const periodoAnterior = (clave) => {
  const [anio, mm] = String(clave).split('-').map(Number);
  return mm === 1 ? `${anio - 1}-12` : `${anio}-${String(mm - 1).padStart(2, '0')}`;
};
export const etiquetaPeriodo = (clave) => {
  const [anio, mm] = String(clave).split('-');
  const mes = MESES.find((m) => m.num === Number(mm));
  return mes ? `${mes.nombre} ${anio}` : clave;
};
