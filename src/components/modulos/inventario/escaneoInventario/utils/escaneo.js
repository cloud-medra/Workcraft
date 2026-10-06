// Lectura de la pistola (Spektra RG-600 en modo teclado): escribe el código
// muy rápido y termina con Enter. También se acepta escribirlo a mano.
import { parsearGS1 } from './gs1';

// Teclas que cierran una lectura. Algunas pistolas se configuran con Tab
// como sufijo; se acepta también para no perder el foco al leer.
export const esTeclaFinEscaneo = (evento) =>
  evento?.key === 'Enter' || evento?.key === 'NumpadEnter' || evento?.key === 'Tab';

// Texto del campo -> código limpio: sin espacios ni saltos alrededor y sin
// caracteres de control salvo GS (\u001d, separador FNC1 de GS1).
// eslint-disable-next-line no-control-regex
const CONTROL_SIN_GS = /[\u0000-\u001c\u001e\u001f\u007f]/g;
export const normalizarCodigoLeido = (texto) => String(texto ?? '').replace(CONTROL_SIN_GS, '').trim();

// Lectura -> { codigo, clave, gs1 }.
//   codigo: lo leído (limpio), para mostrar.
//   clave:  lo que se vincula al producto. En GS1 es el GTIN (el resto del
//           código cambia con cada lote/vencimiento); si no, el código.
export const interpretarLectura = (texto) => {
  const codigo = normalizarCodigoLeido(texto);
  if (!codigo) return null;
  const gs1 = parsearGS1(codigo);
  return { codigo, clave: gs1.esGS1 ? gs1.gtin : codigo, gs1 };
};
