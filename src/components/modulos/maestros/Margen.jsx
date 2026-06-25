import React, { useState, useEffect } from 'react';
import { db } from '../../../firebaseConfig';
import { doc, onSnapshot, updateDoc, setDoc, collection } from 'firebase/firestore';
import { Save, Calculator, Percent, ShieldCheck, Loader2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';

const Margen = () => {
  const [config, setConfig] = useState({ consignacion: [], implantes: {} });
  const [listaPrevisiones, setListaPrevisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/maestros/margenes";

  const datosSemilla = {
    consignacion: [
      { hasta: 300, margen: 500 },
      { hasta: 1000, margen: 400 },
      { hasta: 5000, margen: 300 },
      { hasta: 10000, margen: 250 },
      { hasta: 25000, margen: 200 },
      { hasta: 50000, margen: 160 },
      { hasta: 100000, margen: 140 },
      { hasta: 200000, margen: 80 },
      { hasta: 10000000, margen: 50 }
    ],
    implantes: {}
  };

  useEffect(() => {
    const docRef = doc(db, "maestros_margenes", "configuracion");

    const unsubConfig = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        setConfig(docSnap.data());
      } else {
        await setDoc(docRef, datosSemilla);
        setConfig(datosSemilla);
      }
    });

    const unsubPrevisiones = onSnapshot(collection(db, "maestros_previsiones"), (snapshot) => {
      setListaPrevisiones(snapshot.docs.map(doc => doc.data().nombre));
      setLoading(false);
    });

    return () => { unsubConfig(); unsubPrevisiones(); };
  }, []);

  const handleConsignacionChange = (index, campo, valor) => {
    const nuevosRangos = [...config.consignacion];
    nuevosRangos[index][campo] = Number(valor);
    setConfig(prev => ({ ...prev, consignacion: nuevosRangos }));
  };

  const handleImplanteChange = (nombre, valor) => {
    setConfig(prev => ({
      ...prev,
      implantes: {
        ...prev.implantes,
        [nombre]: Number(valor)
      }
    }));
  };

  const guardarCambios = async () => {
    try {
      const dataToSave = {
        consignacion: config.consignacion,
        implantes: config.implantes || {}
      };

      await updateDoc(doc(db, "maestros_margenes", "configuracion"), dataToSave);
      showToast("Márgenes guardados correctamente", "success");
    } catch (e) {
      console.error("Error al guardar:", e);
      showToast("Error al guardar: " + e.message, "error");
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-[#2383C2]" /></div>;

  return (
    <div className="w-full h-full p-6 bg-gray-50 dark:bg-gray-900 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">

        {hasPermission(PATH_VISTA, "panel_superior") && (
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Calculator className="text-[#0E5B6D] dark:text-[#29a7c0]" /> Configuración de Márgenes
            </h2>
            {hasPermission(PATH_VISTA, "panel_superior", "btn_guardar") && (
              <button onClick={guardarCambios} className="bg-[#2383C2] text-white px-4 py-2 rounded text-[12px] font-bold flex items-center gap-2 hover:bg-[#369BCE] transition">
                <Save size={14} /> Guardar Cambios
              </button>
            )}
          </div>
        )}

        {hasPermission(PATH_VISTA, "seccion_consignacion") && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-300 uppercase text-[12px]">
              <Percent size={16} className="text-amber-600 dark:text-amber-500" /> Consignación (Rangos Precio)
            </h3>
            <div className="space-y-2">
              {(config.consignacion || []).map((r, i) => {
                const canEditRanges = hasPermission(PATH_VISTA, "seccion_consignacion", "inputs_rangos");
                return (
                  <div key={i} className="flex gap-4 items-center">
                    <input
                      type="number"
                      value={r.hasta}
                      readOnly={!canEditRanges}
                      onChange={(e) => handleConsignacionChange(i, 'hasta', e.target.value)}
                      className={`w-full border p-2 rounded text-[12px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] ${
                        !canEditRanges ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed border-gray-200 dark:border-gray-700' : ''
                      }`}
                      placeholder="Hasta ($)"
                    />
                    <input
                      type="number"
                      value={r.margen}
                      readOnly={!canEditRanges}
                      onChange={(e) => handleConsignacionChange(i, 'margen', e.target.value)}
                      className={`w-full border p-2 rounded text-[12px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] ${
                        !canEditRanges ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed border-gray-200 dark:border-gray-700' : ''
                      }`}
                      placeholder="Margen (%)"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasPermission(PATH_VISTA, "seccion_implantes") && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-bold mb-4 flex items-center gap-2 text-gray-700 dark:text-gray-300 uppercase text-[12px]">
              <ShieldCheck size={16} className="text-blue-600 dark:text-blue-400" /> Implantes (Por Previsión)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {listaPrevisiones.map((nombre) => {
                const canEditImplantes = hasPermission(PATH_VISTA, "seccion_implantes", "inputs_previsiones");
                return (
                  <div key={nombre} className="flex justify-between items-center p-3 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <span className="font-bold text-[12px] text-gray-700 dark:text-gray-200">{nombre}</span>
                    <input
                      type="number"
                      value={(config.implantes && config.implantes[nombre] !== undefined) ? config.implantes[nombre] : 30}
                      readOnly={!canEditImplantes}
                      onChange={(e) => handleImplanteChange(nombre, e.target.value)}
                      className={`w-16 border rounded p-1 text-center text-[12px] bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] ${
                        !canEditImplantes ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed border-gray-200 dark:border-gray-700' : ''
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Margen;