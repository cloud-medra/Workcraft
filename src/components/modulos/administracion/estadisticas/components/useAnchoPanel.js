import { useState } from 'react';

// Ancho del panel de detalle de Estadísticas, ajustable arrastrando su borde
// izquierdo (hacia la izquierda crece). Se recuerda en localStorage del
// navegador, por usuario. El máximo es el 70 % de la ventana; el CSS del
// panel también lo aplica, así se respeta al achicar la ventana.
export const ANCHO_MIN = 280;
export const ANCHO_DEFECTO = 576; // = max-w-xl, el ancho original del panel
const FRACCION_MAX = 0.7;
const PASO_TECLADO = 16;

export const claveAnchoPanel = (usuario) => `workcraft:anchoPanel:${usuario || 'anonimo'}:estadisticas`;

const leerAncho = (clave) => {
  try {
    const v = Number(localStorage.getItem(clave));
    return Number.isFinite(v) && v >= ANCHO_MIN ? Math.round(v) : ANCHO_DEFECTO;
  } catch {
    return ANCHO_DEFECTO;
  }
};

const guardarAncho = (clave, ancho) => {
  try {
    if (ancho === ANCHO_DEFECTO) localStorage.removeItem(clave);
    else localStorage.setItem(clave, String(ancho));
  } catch { /* sin localStorage: el ancho dura mientras la pantalla está abierta */ }
};

const limitar = (v) => {
  const maximo = Math.max(ANCHO_MIN, Math.floor(window.innerWidth * FRACCION_MAX));
  return Math.round(Math.min(maximo, Math.max(ANCHO_MIN, v)));
};

// Devuelve el ancho, si se está arrastrando y las props de la manija
// (separador accesible: también se ajusta con ← → y doble clic restablece).
export const useAnchoPanel = (usuario) => {
  const clave = claveAnchoPanel(usuario);
  const [ancho, setAncho] = useState(() => leerAncho(clave));
  const [arrastrando, setArrastrando] = useState(false);

  const fijar = (v) => {
    const nuevo = limitar(v);
    setAncho(nuevo);
    guardarAncho(clave, nuevo);
  };

  // Arrastre con pointer capture: los movimientos siguen llegando a la
  // manija aunque el mouse salga de ella. La selección de texto y el cursor
  // se fijan en el body solo mientras dura.
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const manija = e.currentTarget;
    const xInicial = e.clientX;
    // Se parte del ancho real (puede estar recortado por el máximo del CSS).
    const anchoInicial = manija.parentElement?.getBoundingClientRect().width || ancho;
    let ultimo = ancho;
    const cursorPrevio = document.body.style.cursor;
    const seleccionPrevia = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    manija.setPointerCapture?.(e.pointerId);
    setArrastrando(true);

    const mover = (ev) => {
      ultimo = limitar(anchoInicial + (xInicial - ev.clientX));
      setAncho(ultimo);
    };
    const soltar = () => {
      manija.removeEventListener('pointermove', mover);
      manija.removeEventListener('pointerup', soltar);
      manija.removeEventListener('pointercancel', soltar);
      document.body.style.cursor = cursorPrevio;
      document.body.style.userSelect = seleccionPrevia;
      setArrastrando(false);
      guardarAncho(clave, ultimo);
    };
    manija.addEventListener('pointermove', mover);
    manija.addEventListener('pointerup', soltar);
    manija.addEventListener('pointercancel', soltar);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); fijar(ancho + PASO_TECLADO); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); fijar(ancho - PASO_TECLADO); }
  };

  return {
    ancho,
    arrastrando,
    propsManija: {
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-label': 'Ancho del panel',
      'aria-valuenow': ancho,
      'aria-valuemin': ANCHO_MIN,
      tabIndex: 0,
      onPointerDown,
      onKeyDown,
      onDoubleClick: () => fijar(ANCHO_DEFECTO),
    },
  };
};
