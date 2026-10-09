// Geometría del Bodymap, dibujada para este proyecto (no copiada de ninguna
// referencia), en un lienzo de 200 × 440 por vista (≈ 8 cabezas de alto).
//
// Técnica: cada vista tiene UNA silueta continua (curvas Bézier, simétrica)
// y cada zona es una región que se recorta con esa silueta (clipPath): el
// borde exterior de todas las zonas es el contorno suave del cuerpo y entre
// zonas solo quedan líneas divisorias sutiles. Las zonas laterales se
// definen para el lado izquierdo DEL LIENZO y se reflejan para el otro.
//
// Lado del paciente: en la vista ANTERIOR (de frente) su lado derecho queda a
// la izquierda del lienzo; en la POSTERIOR (de espaldas), a la derecha.
import { ladosAResaltar } from '../../../../functions/bodymap/nucleo.mjs';

export const ANCHO = 200;
export const ALTO = 440;
const M = ANCHO; // para reflejar: x' = M - x

// --- Silueta -----------------------------------------------------------------
// Mitad izquierda del lienzo, desde la coronilla (centro) hasta la
// entrepierna (centro), en sentido antihorario. Cada tramo: [c1x, c1y, c2x,
// c2y, x, y] (Bézier cúbica).
const INICIO = [100, 8];
const MITAD = [
  // cabeza (ovalada, sin rasgos) y mandíbula
  [87, 8, 79, 17, 79.5, 31], [80, 42, 83, 50, 87.5, 55.5], [90, 58.5, 92.5, 60.5, 93, 63.5],
  // cuello y trapecio hasta el hombro
  [93.2, 67.5, 92.5, 71, 90, 73.5], [84, 76.5, 72, 77.5, 63.5, 81.5],
  // deltoides
  [55, 85.5, 50.5, 93, 50, 103],
  // brazo, codo, antebrazo y muñeca (borde externo)
  [49.2, 118, 47.2, 133, 46.2, 149], [45.6, 158, 45, 165, 44, 172], [42, 190, 40.4, 207, 39.6, 223], [39.3, 228, 39.1, 232, 39.2, 236],
  // mano: borde externo, yemas y borde interno
  [37.2, 244, 36.2, 254, 37.6, 263.5], [38.8, 270, 42, 274.5, 45.4, 273.6], [48.6, 272.6, 50.6, 267, 50.8, 259],
  [51, 252, 50.6, 246, 51.6, 239.5],
  // antebrazo, codo y brazo (borde interno) hasta la axila
  [52.6, 227, 54.2, 212, 55.4, 198], [56.2, 187, 57, 177.5, 57.8, 171], [59, 156, 60.3, 140, 62, 125], [62.8, 119, 64, 115.5, 66, 113],
  // costado: costillas, cintura y cadera
  [67.2, 125, 69.2, 137, 70.6, 150], [71.6, 160, 71.8, 170, 71, 180], [69.8, 192, 67.6, 203, 67.4, 214],
  [67.2, 226, 69.4, 237, 71.6, 247],
  // muslo, rodilla, pantorrilla y tobillo (borde externo)
  [72.8, 267, 74.8, 290, 76.8, 312], [77.6, 322, 78.4, 330, 78.6, 338], [78.6, 352, 80, 368, 81.8, 384], [82.8, 392, 83.8, 398, 84, 404],
  // pie
  [83, 412, 80.8, 419.5, 81.6, 425.5], [82.6, 430.5, 88.2, 432.4, 93.8, 431.2], [96.4, 430.4, 97.2, 426, 96.4, 420], [95.8, 414, 95, 408, 95, 402.5],
  // pantorrilla, rodilla y muslo (borde interno) hasta la entrepierna
  [95, 392, 95.8, 380, 95.8, 366], [95.8, 352, 95.2, 342, 95.2, 336], [95.4, 320, 97, 300, 98.2, 280], [98.8, 266, 99.2, 256, 100, 250],
];

const fmt = (n) => Number(n.toFixed(2));
const construirSilueta = () => {
  const ida = MITAD.map(([a, b, c, d, x, y]) => `C${fmt(a)},${fmt(b)} ${fmt(c)},${fmt(d)} ${fmt(x)},${fmt(y)}`);
  // Vuelta: la misma mitad reflejada y recorrida al revés.
  const puntos = [INICIO, ...MITAD.map((t) => [t[4], t[5]])];
  const vuelta = [];
  for (let i = MITAD.length - 1; i >= 0; i -= 1) {
    const [a, b, c, d] = MITAD[i];
    const [x, y] = puntos[i];
    vuelta.push(`C${fmt(M - c)},${fmt(d)} ${fmt(M - a)},${fmt(b)} ${fmt(M - x)},${fmt(y)}`);
  }
  return `M${INICIO[0]},${INICIO[1]} ${ida.join(' ')} ${vuelta.join(' ')} Z`;
};
export const SILUETA = construirSilueta();

// --- Zonas (regiones que se recortan con la silueta) -------------------------
// `caja`: [x, y, ancho, alto] de lo que se ve de la zona (para el detalle).
const CENTRO = [
  { zona: 'torax', vistas: ['anterior', 'posterior'], d: 'M58,70 L142,70 L142,152 Q100,158 58,152 Z', caja: [63, 72, 74, 84] },
  { zona: 'abdomen', vistas: ['anterior'], d: 'M58,152 Q100,158 142,152 L142,209 Q100,214 58,209 Z', caja: [66, 150, 68, 62] },
  { zona: 'columna_lumbar', vistas: ['posterior'], d: 'M58,152 Q100,158 142,152 L142,209 Q100,214 58,209 Z', caja: [66, 150, 68, 62] },
  { zona: 'pelvis', vistas: ['anterior', 'posterior'], d: 'M58,209 Q100,214 142,209 L142,252 L58,252 Z', caja: [66, 207, 68, 45] },
  { zona: 'columna_cervical', vistas: ['anterior', 'posterior'], d: 'M84,56 Q100,62 116,56 L116,77.5 Q100,82 84,77.5 Z', caja: [86, 56, 28, 26] },
  { zona: 'cabeza', vistas: ['anterior', 'posterior'], d: 'M70,0 L130,0 L130,58 Q100,66 70,58 Z', caja: [79, 7, 42, 57] },
  // Encima: cara (frente) y columna dorsal (espalda).
  { zona: 'cara', vistas: ['anterior'], d: 'M82,30 Q100,22.5 118,30 L118,66 L82,66 Z', caja: [80, 24, 40, 40] },
  { zona: 'columna_dorsal', vistas: ['posterior'], d: 'M95.5,79 Q100,77.5 104.5,79 L104.5,152 Q100,154 95.5,152 Z', caja: [94, 77, 12, 77] },
];

const LATERAL = [
  { zona: 'brazo', d: 'M30,112 L64.6,112 L64.6,160 Q48,162 30,166 Z', caja: [44, 103, 22, 66] },
  { zona: 'codo', d: 'M30,166 Q48,162 64.6,160 L64.6,177 Q48,179 30,183 Z', caja: [42, 160, 18, 22] },
  { zona: 'antebrazo', d: 'M30,183 Q48,179 64.6,177 L64.6,227 Q48,229 30,232 Z', caja: [38, 177, 19, 55] },
  { zona: 'muneca', d: 'M30,232 Q48,229 64.6,227 L64.6,241 Q48,242 30,245 Z', caja: [37, 228, 16, 16] },
  { zona: 'mano', d: 'M30,245 Q48,242 64.6,241 L64.6,290 L30,290 Z', caja: [35, 239, 18, 36] },
  { zona: 'cadera', d: 'M50,207 Q63,209.5 80.5,210.6 C79.4,223 79.2,236 80.8,251.5 L50,253 Z', caja: [66, 207, 16, 45] },
  { zona: 'muslo', d: 'M50,250 L100.4,250 L100.4,318 Q86,322.5 50,320 Z', caja: [70, 245, 31, 77] },
  { zona: 'rodilla', d: 'M50,320 Q86,322.5 100.4,318 L100.4,346 Q86,349 50,348 Z', caja: [77, 318, 20, 31] },
  { zona: 'pierna', d: 'M50,348 Q86,349 100.4,346 L100.4,399 Q88,400.5 50,401 Z', caja: [78, 346, 19, 55] },
  { zona: 'tobillo', d: 'M50,401 Q88,400.5 100.4,399 L100.4,411 L50,411 Z', caja: [82, 399, 15, 13] },
  { zona: 'pie', d: 'M50,411 L100.4,411 L100.4,440 L50,440 Z', caja: [80, 410, 18, 23] },
  // Encima de tórax, cuello y brazo: el hombro (deltoides).
  { zona: 'hombro', d: 'M38,66 L84,72 C78,84 71,99 66.6,113.4 L38,113 Z', caja: [49, 72, 33, 42] },
];

// Detalles anatómicos que solo se dibujan en el detalle ampliado (muy
// sutiles), por zona y vista, en coordenadas del lado izquierdo del lienzo
// (los de zonas laterales se reflejan con su zona).
const DETALLES = {
  hombro: {
    anterior: ['M90,76 C82,78.5 74,79.5 66,83', 'M70,82 C66,90 62.5,99 60,111', 'M76,86 C80,100 86,112 97,116'],
    posterior: ['M70,82 C66,90 62.5,99 60,111', 'M86,84 C79,92 76,104 79,118 C84,122 91,118 95,110', 'M90,76 C82,78.5 74,79.5 66,83'],
  },
  codo: { anterior: ['M47,168 C51,166 55,166 57.5,168'], posterior: ['M51,170 a2.6,2.6 0 1,0 5.2,0 a2.6,2.6 0 1,0 -5.2,0'] },
  muneca: { anterior: ['M41,233 C45,232 49,232 52,233'], posterior: ['M41,233 C45,232 49,232 52,233'] },
  mano: {
    anterior: ['M40.6,262 L41.4,271.5', 'M43.6,263 L44.4,272.8', 'M46.6,262.5 L47.2,271.8', 'M50.4,251 C48.6,249 47,248.6 45.4,249.2'],
    posterior: ['M40.6,262 L41.4,271.5', 'M43.6,263 L44.4,272.8', 'M46.6,262.5 L47.2,271.8', 'M41,246 C44,248 47,248 50,246'],
  },
  rodilla: {
    anterior: ['M83,331 a5.2,6.6 0 1,0 10.4,0 a5.2,6.6 0 1,0 -10.4,0', 'M80,342 C84,346 91,346 95,342'],
    posterior: ['M80.5,333 C85,336.5 90,336.5 94.5,333'],
  },
  tobillo: { anterior: ['M82.6,404 a1.8,2.2 0 1,0 3.6,0 a1.8,2.2 0 1,0 -3.6,0'], posterior: ['M88,394 L89,410'] },
  pie: {
    anterior: ['M86.4,426 L86.8,431', 'M89.4,426.6 L89.6,431.5', 'M92.2,426.4 L92.4,431.3'],
    posterior: ['M84.5,426 C87,431 92,431 94.5,426'],
  },
  cadera: { anterior: ['M71,210 C76,207.5 84,209 90,214'], posterior: ['M71,210 C76,207.5 84,209 90,214', 'M100,226 C93,236 85,243 75,246'] },
  muslo: { anterior: ['M79,262 C84,284 87,300 88,315'], posterior: ['M86,262 C87,284 87,300 87,315'] },
  pierna: { anterior: ['M89,352 C88,370 88,384 89,398'], posterior: ['M82,356 C86,366 88,374 88,384', 'M95,356 C92,366 90,374 89,384'] },
  brazo: { anterior: ['M53,120 C54,134 54.5,146 53.5,158'], posterior: ['M55,120 C56,134 56,146 55,158'] },
  antebrazo: { anterior: ['M47,186 C47.5,200 46.5,214 45,226'], posterior: ['M47,186 C47.5,200 46.5,214 45,226'] },
};
const DETALLES_CENTRO = {
  torax: {
    anterior: ['M90,76 C82,78.5 74,79.5 66,83', 'M110,76 C118,78.5 126,79.5 134,83', 'M76,96 C84,108 94,112 100,110 C106,112 116,108 124,96'],
    posterior: ['M86,84 C79,92 76,104 79,118 C84,122 91,118 95,110', 'M114,84 C121,92 124,104 121,118 C116,122 109,118 105,110'],
  },
  abdomen: { anterior: ['M100,156 L100,206', 'M98.6,186 a1.4,1.4 0 1,0 2.8,0 a1.4,1.4 0 1,0 -2.8,0'] },
  columna_lumbar: { posterior: ['M100,156 L100,206'] },
  columna_dorsal: { posterior: [82, 91, 100, 109, 118, 127, 136, 145].map((y) => `M97.4,${y} L102.6,${y}`) },
  columna_cervical: { anterior: ['M93,72 C96,74 104,74 107,72'], posterior: ['M100,62 L100,78'] },
  pelvis: {
    anterior: ['M78,214 C86,230 94,240 100,246 C106,240 114,230 122,214'],
    posterior: ['M100,222 L100,250', 'M80,244 C88,250 96,250 100,246 C104,250 112,250 120,244'],
  },
};

const reflejarCaja = ([x, y, w, h]) => [M - x - w, y, w, h];

// Formas de una vista, en orden de dibujo: { clave, zona, lado ('der' |
// 'izq' | null), d, caja, reflejada, detalles: [d] }.
export const formasDe = (vista) => {
  const izquierdaDelLienzo = vista === 'anterior' ? 'der' : 'izq';
  const derechaDelLienzo = izquierdaDelLienzo === 'der' ? 'izq' : 'der';
  const centrales = CENTRO.filter((f) => f.vistas.includes(vista)).map((f) => ({
    ...f, clave: f.zona, lado: null, reflejada: false, detalles: DETALLES_CENTRO[f.zona]?.[vista] || [],
  }));
  const laterales = LATERAL.flatMap((f) => [
    { ...f, clave: `${f.zona}-${izquierdaDelLienzo}`, lado: izquierdaDelLienzo, reflejada: false, detalles: DETALLES[f.zona]?.[vista] || [] },
    { ...f, clave: `${f.zona}-${derechaDelLienzo}`, lado: derechaDelLienzo, reflejada: true, caja: reflejarCaja(f.caja), detalles: DETALLES[f.zona]?.[vista] || [] },
  ]);
  // Torso y cabeza primero; luego miembros (el hombro al final de ellos) y
  // encima cara / columna dorsal.
  const encima = centrales.filter((f) => f.zona === 'cara' || f.zona === 'columna_dorsal');
  const base = centrales.filter((f) => !encima.includes(f));
  return [...base, ...laterales, ...encima];
};

// Caja que abarca varias formas (para el detalle ampliado), cuadrada, con
// margen y un tamaño mínimo: se ve la zona y lo que la rodea.
const MINIMO = 96;
export const cajaDe = (formas, margen = 18) => {
  if (!formas.length) return null;
  const x1 = Math.min(...formas.map((f) => f.caja[0])) - margen;
  const y1 = Math.min(...formas.map((f) => f.caja[1])) - margen;
  const x2 = Math.max(...formas.map((f) => f.caja[0] + f.caja[2])) + margen;
  const y2 = Math.max(...formas.map((f) => f.caja[1] + f.caja[3])) + margen;
  const lado = Math.max(x2 - x1, y2 - y1, MINIMO);
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  return [cx - lado / 2, cy - lado / 2, lado, lado];
};

// ¿Se resalta esta forma? zonas: [ids]; lado: el efectivo de la gestión
// (derecho / izquierdo; bilateral o no especificado → ambos lados).
export const resaltada = (forma, zonas, lado) => zonas.includes(forma.zona)
  && (!forma.lado || ladosAResaltar(lado).includes(forma.lado));

// Caja del detalle ampliado de una zona en una vista (null si no se ve en ella).
export const cajaZona = (vista, zona, lado) => cajaDe(formasDe(vista).filter((f) => resaltada(f, [zona], lado)));
