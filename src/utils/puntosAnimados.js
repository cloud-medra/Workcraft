// Selección de puntos para PuntosAnimados (decoración del login).

// Variedad de efectos: algunos solo brillan, otros brillan y crecen
// levemente, y algunos emiten una onda. La suma de pesos es 1.
const EFECTOS = [
  { efecto: 'brillo', peso: 0.4 },
  { efecto: 'brilloCrece', peso: 0.35 },
  { efecto: 'onda', peso: 0.25 },
];

const elegirEfecto = (r) => {
  let acumulado = 0;
  for (const { efecto, peso } of EFECTOS) {
    acumulado += peso;
    if (r < acumulado) return efecto;
  }
  return EFECTOS[EFECTOS.length - 1].efecto;
};

// Elige el próximo punto: nunca uno que esté destacado ni uno de los últimos
// turnos (así no se repite el mismo dos veces seguidas y el orden se siente
// aleatorio). Devuelve también un efecto y una duración entre 1,8 y 2,4 s.
export const elegirSiguiente = (total, activos, recientes, azar = Math.random) => {
  const todos = Array.from({ length: total }, (_, i) => i);
  const bloqueados = new Set([...activos, ...recientes]);
  let candidatos = todos.filter((i) => !bloqueados.has(i));
  if (!candidatos.length) {
    const ultimo = recientes[recientes.length - 1];
    candidatos = todos.filter((i) => !activos.includes(i) && i !== ultimo);
  }
  return {
    indice: candidatos[Math.floor(azar() * candidatos.length)],
    efecto: elegirEfecto(azar()),
    duracion: Math.round(1800 + azar() * 600),
  };
};
