// Validación del paso "escribir el mes a cerrar" del cierre de período.
// Copia exacta de functions/validarCierreMes.js (el backend es CommonJS y
// no se puede importar desde el frontend): cualquier cambio acá debe
// replicarse allá — validarCierreMes.test.js verifica que ambas coincidan.

import { MESES } from './constants';

export const MENSAJE_MES_NO_COINCIDE = 'El mes ingresado no coincide con el mes a cerrar. Verifica e intenta nuevamente.';

// `anio`/`mesId` son los del período a cerrar ("2026", "septiembre");
// `anioIngresado`/`mesIngresado` lo que escribió el usuario ("2026", "9" o "09").
export const validarCierreMes = ({ anio, mesId, anioIngresado, mesIngresado }) => {
  const mes = MESES.find(m => m.id === mesId);
  const anioTexto = String(anioIngresado ?? '').trim();
  const mesTexto = String(mesIngresado ?? '').trim();

  const coincide = Boolean(mes)
    && /^\d{4}$/.test(anioTexto)
    && anioTexto === String(anio).trim()
    && /^\d{1,2}$/.test(mesTexto)
    && Number(mesTexto) === mes.num;

  return coincide ? { ok: true } : { ok: false, mensaje: MENSAJE_MES_NO_COINCIDE };
};
