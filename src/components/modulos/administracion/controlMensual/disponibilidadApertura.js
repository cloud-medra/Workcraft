// Reglas del panel "Apertura de Período". `estadosModulos` son los estados
// de cierres_periodos de UN año ({ [modulo]: { [mes]: doc } }, de
// useCierresAnio): el del año elegido en el panel, no el de la tabla.
import { MESES, MODULOS } from './constants';

const ESTADOS_ABIERTOS = ['ABIERTO', 'REABIERTO'];

// Estado del mes en un módulo, o null si nunca se inició.
export const estadoMesModulo = (estadosModulos, modId, mesId) => {
  const estado = estadosModulos?.[modId]?.[mesId]?.estado;
  return estado && estado !== 'SIN_INICIAR' ? estado : null;
};

// Un mes se puede abrir solo en los módulos donde todavía no tiene estado
// (ABIERTO, REABIERTO o CERRADO); en los demás sigue disponible.
export const modulosDisponiblesParaMes = (estadosModulos, mesId) =>
  MODULOS.filter(mod => !estadoMesModulo(estadosModulos, mod.id, mesId)).map(mod => mod.id);

// Meses que siguen disponibles para al menos un módulo.
export const mesesDisponiblesApertura = (estadosModulos) =>
  MESES.filter(mes => modulosDisponiblesParaMes(estadosModulos, mes.id).length > 0);

// Meses ABIERTO/REABIERTO del año en los módulos indicados, en orden de
// MODULOS y MESES: [{ modId, mesId, estado }]. Bloquean la apertura solo de
// los módulos marcados en el panel.
export const periodosAbiertosDeModulos = (estadosModulos, modIds) =>
  MODULOS.filter(mod => modIds.includes(mod.id)).flatMap(mod =>
    MESES.filter(mes => ESTADOS_ABIERTOS.includes(estadosModulos?.[mod.id]?.[mes.id]?.estado))
      .map(mes => ({ modId: mod.id, mesId: mes.id, estado: estadosModulos[mod.id][mes.id].estado })));

// "Hemodinamia tiene Septiembre 2026 abierto. Ciérralo antes de abrir otro mes."
export const mensajeBloqueoApertura = ({ modId, mesId, estado }, anio) => {
  const modulo = MODULOS.find(m => m.id === modId)?.nombre || modId;
  const mes = MESES.find(m => m.id === mesId)?.nombre || mesId;
  const verbo = estado === 'REABIERTO' ? 'reabierto' : 'abierto';
  return `${modulo} tiene ${mes} ${anio} ${verbo}. Ciérralo antes de abrir otro mes.`;
};
