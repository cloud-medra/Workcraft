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
      implantes: { ...prev.implantes, [nombre]: Number(valor) }
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

  const baseInputClass = "w-full h-8 px-2 border rounded text-[12px] outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] transition-colors bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed";

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0">

      <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-2 uppercase">
          <Calculator size={16} className="text-[#2383C2]" /> Configuración de Márgenes
        </h2>
        {hasPermission(PATH_VISTA, "panel_superior") && hasPermission(PATH_VISTA, "panel_superior", "btn_guardar") && (
          <button onClick={guardarCambios} className="h-8 px-4 bg-[#2383C2] hover:bg-[#369BCE] text-white rounded font-bold text-[12px] flex items-center gap-2 transition">
            <Save size={14} /> Guardar Cambios
          </button>
        )}
      </div>

      <div className="flex-grow overflow-auto p-4 space-y-6 bg-gray-50/30 dark:bg-gray-800/10">

        {hasPermission(PATH_VISTA, "seccion_consignacion") && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300 uppercase text-[12px]">
                <Percent size={15} className="text-[#2383C2]" /> Consignación (Rangos Precio)
              </h3>
            </div>

            <div className="p-4">
              <table className="w-full text-left text-[12px] border-collapse max-w-2xl">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400 uppercase font-bold text-[10px]">
                    <th className="pb-2 pr-4 w-1/2">Hasta ($)</th>
                    <th className="pb-2 pl-2 w-1/2">Margen (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {(config.consignacion || []).map((r, i) => {
                    const canEditRanges = hasPermission(PATH_VISTA, "seccion_consignacion", "inputs_rangos");
                    return (
                      <tr key={i}>
                        <td className="py-1 pr-4">
                          <input
                            type="number"
                            value={r.hasta}
                            disabled={!canEditRanges}
                            onChange={(e) => handleConsignacionChange(i, 'hasta', e.target.value)}
                            className={baseInputClass}
                            placeholder="Hasta ($)"
                          />
                        </td>
                        <td className="py-1 pl-2">
                          <input
                            type="number"
                            value={r.margen}
                            disabled={!canEditRanges}
                            onChange={(e) => handleConsignacionChange(i, 'margen', e.target.value)}
                            className={baseInputClass}
                            placeholder="Margen (%)"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasPermission(PATH_VISTA, "seccion_implantes") && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-bold flex items-center gap-2 text-gray-700 dark:text-gray-300 uppercase text-[12px]">
                <ShieldCheck size={15} className="text-[#2383C2]" /> Implantes (Por Previsión)
              </h3>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {listaPrevisiones.map((nombre) => {
                const canEditImplantes = hasPermission(PATH_VISTA, "seccion_implantes", "inputs_previsiones");
                return (
                  <div key={nombre} className="flex justify-between items-center p-2.5 border border-gray-200 dark:border-gray-700/70 rounded bg-gray-50/50 dark:bg-gray-800/20 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors gap-2">
                    <span className="font-bold text-[11px] text-gray-700 dark:text-gray-200 flex-grow min-w-0 break-words line-clamp-2">
                      {nombre}
                    </span>
                    <div className="relative flex items-center flex-shrink-0">
                      <input
                        type="number"
                        value={(config.implantes && config.implantes[nombre] !== undefined) ? config.implantes[nombre] : 30}
                        disabled={!canEditImplantes}
                        onChange={(e) => handleImplanteChange(nombre, e.target.value)}
                        className="w-14 h-7 pl-1 pr-4 border rounded text-right text-[11px] font-bold outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] transition-colors bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-1 text-[10px] font-bold text-gray-400 dark:text-gray-500 pointer-events-none">%</span>
                    </div>
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