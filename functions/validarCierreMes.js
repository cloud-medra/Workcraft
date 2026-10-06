// Validación del paso "escribir el mes a cerrar" del cierre de período.
// Copia exacta de src/components/modulos/administracion/controlMensual/
// validarCierreMes.js (y de MESES de su constants.js): cualquier cambio acá
// debe replicarse allá — validarCierreMes.test.js verifica que coincidan.

const MESES = [
  { id: 'enero', nombre: 'Enero', num: 1 },
  { id: 'febrero', nombre: 'Febrero', num: 2 },
  { id: 'marzo', nombre: 'Marzo', num: 3 },
  { id: 'abril', nombre: 'Abril', num: 4 },
  { id: 'mayo', nombre: 'Mayo', num: 5 },
  { id: 'junio', nombre: 'Junio', num: 6 },
  { id: 'julio', nombre: 'Julio', num: 7 },
  { id: 'agosto', nombre: 'Agosto', num: 8 },
  { id: 'septiembre', nombre: 'Septiembre', num: 9 },
  { id: 'octubre', nombre: 'Octubre', num: 10 },
  { id: 'noviembre', nombre: 'Noviembre', num: 11 },
  { id: 'diciembre', nombre: 'Diciembre', num: 12 }
];

const MENSAJE_MES_NO_COINCIDE = 'El mes ingresado no coincide con el mes a cerrar. Verifica e intenta nuevamente.';

// `anio`/`mesId` son los del período a cerrar ("2026", "septiembre");
// `anioIngresado`/`mesIngresado` lo que escribió el usuario ("2026", "9" o "09").
const validarCierreMes = ({ anio, mesId, anioIngresado, mesIngresado }) => {
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

module.exports = { MESES, MENSAJE_MES_NO_COINCIDE, validarCierreMes };
