import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { useUser } from './UserContext';

// Única fuente de verdad del tema. La usan el toggle "Modo Oscuro" del menú
// del avatar y Ajustes → Tema y Apariencia.
//
// - La preferencia de la cuenta vive en usuarios/{uid}.modoPantalla
//   ('claro' | 'oscuro' | 'sistema') y manda apenas carga el usuario.
// - localStorage guarda la última usada en este navegador: la lee el script
//   de index.html antes de que cargue React (evita el parpadeo claro) y se
//   usa mientras no hay sesión.
// - Se aplica como clase "dark" en <html> (tailwind: @variant dark en index.css).

const TEMAS = ['claro', 'oscuro', 'sistema'];
const CLAVE_TEMA_LOCAL = 'medra.tema';
const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

const leerTemaLocal = () => {
  try {
    const valor = localStorage.getItem(CLAVE_TEMA_LOCAL);
    return TEMAS.includes(valor) ? valor : null;
  } catch {
    return null;
  }
};

const guardarTemaLocal = (valor) => {
  try {
    localStorage.setItem(CLAVE_TEMA_LOCAL, valor);
  } catch {
    // Almacenamiento bloqueado (modo privado, etc.): el tema igual se aplica.
  }
};

const sistemaPrefiereOscuro = () => Boolean(window.matchMedia?.(CONSULTA_OSCURO).matches);

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const { userData, setUserData } = useUser();
  const [temaLocal, setTemaLocal] = useState(() => leerTemaLocal() || 'claro');
  const [sistemaOscuro, setSistemaOscuro] = useState(sistemaPrefiereOscuro);

  const temaCuenta = TEMAS.includes(userData?.modoPantalla) ? userData.modoPantalla : null;
  const tema = temaCuenta || temaLocal;
  const oscuro = tema === 'oscuro' || (tema === 'sistema' && sistemaOscuro);

  // Al cargar la cuenta, su preferencia queda también como la local de este
  // navegador para la próxima carga.
  useEffect(() => {
    if (temaCuenta) guardarTemaLocal(temaCuenta);
  }, [temaCuenta]);

  useEffect(() => {
    const consulta = window.matchMedia?.(CONSULTA_OSCURO);
    if (!consulta) return undefined;
    const alCambiar = (e) => setSistemaOscuro(e.matches);
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  useLayoutEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.toggle('dark', oscuro);
    raiz.style.colorScheme = oscuro ? 'dark' : 'light';
  }, [oscuro]);

  // Aplica al instante y luego guarda en la cuenta. Devuelve false si no se
  // pudo guardar en Firestore (el tema queda aplicado igual en esta sesión).
  const setTema = useCallback(async (nuevo) => {
    if (!TEMAS.includes(nuevo)) return false;
    guardarTemaLocal(nuevo);
    setTemaLocal(nuevo);
    setUserData(prev => (prev ? { ...prev, modoPantalla: nuevo } : prev));

    const uid = auth.currentUser?.uid;
    if (!uid) return true;
    try {
      await updateDoc(doc(db, 'usuarios', uid), { modoPantalla: nuevo });
      return true;
    } catch (error) {
      console.error('Error al guardar la preferencia de tema:', error);
      return false;
    }
  }, [setUserData]);

  const alternarOscuro = useCallback(() => setTema(oscuro ? 'claro' : 'oscuro'), [oscuro, setTema]);

  return (
    <ThemeContext.Provider value={{ tema, oscuro, setTema, alternarOscuro }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
