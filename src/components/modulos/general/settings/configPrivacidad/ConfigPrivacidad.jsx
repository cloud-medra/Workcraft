import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Lock, Save } from 'lucide-react';
import { auth, db } from '../../../../../firebaseConfig';
import { useUser } from '../../../../../context/UserContext';
import { useToast } from '../../../../../context/ToastContext';
import Spinner from '../../../../ui/Spinner';
import {
  OPCIONES_NOMBRE_MOSTRAR,
  preferenciaNombreMostrar,
  obtenerNombreMostrar
} from '../../../../../utils/nombreMostrar';

// Ajustes → Configuración de privacidad. Por ahora: "Nombre a mostrar" en
// los saludos, guardado en usuarios/{uid}.nombreMostrar junto al resto de
// preferencias del usuario. Al guardar se actualiza UserContext, así que el
// header y la tarjeta de bienvenida cambian sin recargar.
const ConfigPrivacidad = () => {
  const { userData, setUserData } = useUser();
  const { showToast } = useToast();
  const guardada = preferenciaNombreMostrar(userData);
  const [seleccion, setSeleccion] = useState(guardada);
  const [guardando, setGuardando] = useState(false);

  const vistaPrevia = obtenerNombreMostrar({ ...userData, nombreMostrar: seleccion });
  const hayCambios = seleccion !== guardada;

  const guardar = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      showToast('Tu sesión expiró. Vuelve a iniciar sesión.', 'error');
      return;
    }
    setGuardando(true);
    try {
      await updateDoc(doc(db, 'usuarios', uid), { nombreMostrar: seleccion });
      setUserData(prev => ({ ...prev, nombreMostrar: seleccion }));
      showToast('Preferencia de privacidad guardada', 'success');
    } catch (error) {
      console.error('Error al guardar nombreMostrar:', error);
      showToast('No se pudo guardar la preferencia. Intenta nuevamente.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col gap-4">
        <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2">
            <Lock size={16} className="text-[#2383C2]" />
            Configuración de Privacidad
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Elige qué dato tuyo se muestra en los saludos del sistema. Solo afecta lo que ves tú.
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">Nombre a mostrar</legend>
          {OPCIONES_NOMBRE_MOSTRAR.map(({ valor, label, descripcion, campo }) => {
            const activo = seleccion === valor;
            const dato = String(userData?.[campo] ?? '').trim();
            return (
              <label
                key={valor}
                className={`flex items-center gap-3 border rounded-lg p-2.5 cursor-pointer transition-all ${
                  activo
                    ? 'border-[#2383C2] ring-1 ring-[#2383C2] bg-[#2383C2]/5 dark:bg-[#2383C2]/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="nombreMostrar"
                  value={valor}
                  checked={activo}
                  onChange={() => setSeleccion(valor)}
                  className="accent-[#2383C2]"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-200">{label}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                    {descripcion}: <span className="font-mono">{dato || 'sin dato — se usará el siguiente disponible'}</span>
                  </p>
                </div>
              </label>
            );
          })}
        </fieldset>

        <div className="p-2.5 rounded-md bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-600 dark:text-gray-300">
          Vista previa: <span className="font-semibold">Hola, <span className="text-[#2383C2] font-bold">{vistaPrevia || '—'}</span>.</span>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={guardar}
            disabled={!hayCambios || guardando}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded text-xs font-bold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardando ? <Spinner size="xs" color="#ffffff" /> : <Save size={14} />}
            <span>{guardando ? 'Guardando…' : 'Guardar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigPrivacidad;
