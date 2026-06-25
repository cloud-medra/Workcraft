import React, { useState, useEffect } from 'react';
import { db } from '../../../firebaseConfig';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { Calculator, Loader2 } from 'lucide-react';
import { useGranularPermission } from '../../../hooks/useGranularPermission';

const CalculadoraMargen = () => {
  const [precio, setPrecio] = useState('');
  const [config, setConfig] = useState(null);
  const [previsiones, setPrevisiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/maestros/calculadora-margen";

  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, "maestros_margenes", "configuracion"), (doc) => {
      if (doc.exists()) setConfig(doc.data());
    });
    const unsubPrev = onSnapshot(collection(db, "maestros_previsiones"), (snap) => {
      setPrevisiones(snap.docs.map(d => d.data().nombre));
      setLoading(false);
    });
    return () => { unsubConfig(); unsubPrev(); };
  }, []);

  const calcularConsignacion = (p) => {
    const precioNum = Number(p);
    const rango = config?.consignacion.sort((a, b) => a.hasta - b.hasta)
      .find(r => precioNum <= r.hasta) || { margen: 50 };
    const montoMargen = (precioNum * rango.margen) / 100;
    return { margen: rango.margen, monto: montoMargen, total: precioNum + montoMargen };
  };

  const calcularImplante = (p, nombre) => {
    const precioNum = Number(p);
    const margen = config?.implantes[nombre] ?? 30;
    const montoMargen = (precioNum * margen) / 100;
    return { margen, monto: montoMargen, total: precioNum + montoMargen };
  };

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="animate-spin text-[#2383C2]" /></div>;

  const resConsig = precio ? calcularConsignacion(precio) : null;

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-transparent dark:border-gray-700">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
        <Calculator className="text-[#2383C2]" /> Calculadora de Márgenes
      </h2>

      {hasPermission(PATH_VISTA, "zona_ingreso") && (
        <>
          {hasPermission(PATH_VISTA, "zona_ingreso", "input_precio") && (
            <input
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="Ingrese precio base..."
              className="w-64 p-2 border border-gray-300 dark:border-gray-600 rounded mb-6 outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            />
          )}
        </>
      )}

      {precio && hasPermission(PATH_VISTA, "tabla_simulacion") && (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse border border-gray-200 dark:border-gray-700">
            <thead>
              <tr className="bg-gray-100 dark:bg-gray-900 uppercase text-gray-700 dark:text-gray-300 font-bold">
                <th className="p-2 border border-gray-200 dark:border-gray-700 text-left">Tipo</th>
                <th className="p-2 border border-gray-200 dark:border-gray-700 text-left">Previsión</th>
                <th className="p-2 border border-gray-200 dark:border-gray-700 text-left">Margen (%)</th>
                <th className="p-2 border border-gray-200 dark:border-gray-700 text-left">Valor Margen</th>
                <th className="p-2 border border-gray-200 dark:border-gray-700 text-left">Precio Final</th>
              </tr>
            </thead>
            <tbody className="text-gray-700 dark:text-gray-200">
              {hasPermission(PATH_VISTA, "tabla_simulacion", "fila_consignacion") && resConsig && (
                <tr className="bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 border-b border-gray-200 dark:border-gray-700">
                  <td className="p-2 border border-gray-200 dark:border-gray-700 font-bold">Consignación</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">TODAS</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">{resConsig.margen}%</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700">${resConsig.monto.toLocaleString()}</td>
                  <td className="p-2 border border-gray-200 dark:border-gray-700 font-bold">${resConsig.total.toLocaleString()}</td>
                </tr>
              )}

              {hasPermission(PATH_VISTA, "tabla_simulacion", "filas_implantes") && (
                <>
                  {previsiones.map(prev => {
                    const res = calcularImplante(precio, prev);
                    return (
                      <tr key={prev} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="p-2 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">Implante</td>
                        <td className="p-2 border border-gray-200 dark:border-gray-700 font-medium">{prev}</td>
                        <td className="p-2 border border-gray-200 dark:border-gray-700">{res.margen}%</td>
                        <td className="p-2 border border-gray-200 dark:border-gray-700">${res.monto.toLocaleString()}</td>
                        <td className="p-2 border border-gray-200 dark:border-gray-700 font-bold text-gray-900 dark:text-gray-100">${res.total.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CalculadoraMargen;