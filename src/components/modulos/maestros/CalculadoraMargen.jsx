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

  if (loading) return <div className="p-6 flex items-center justify-center"><Loader2 className="animate-spin text-[#0E5B6D]" /></div>;

  const resConsig = precio ? calcularConsignacion(precio) : null;

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calculator /> Calculadora de Márgenes</h2>

      {hasPermission(PATH_VISTA, "zona_ingreso") && (
        <>
          {hasPermission(PATH_VISTA, "zona_ingreso", "input_precio") && (
            <input
              type="number"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              placeholder="Ingrese precio base..."
              className="w-64 p-2 border rounded mb-6 outline-none focus:border-[#0E5B6D]"
            />
          )}
        </>
      )}

      {precio && hasPermission(PATH_VISTA, "tabla_simulacion") && (
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr className="bg-gray-100 uppercase">
              <th className="p-2 border">Tipo</th>
              <th className="p-2 border">Previsión</th>
              <th className="p-2 border">Margen (%)</th>
              <th className="p-2 border">Valor Margen</th>
              <th className="p-2 border">Precio Final</th>
            </tr>
          </thead>
          <tbody>
            {hasPermission(PATH_VISTA, "tabla_simulacion", "fila_consignacion") && resConsig && (
              <tr className="bg-amber-50">
                <td className="p-2 border font-bold">Consignación</td>
                <td className="p-2 border">TODAS</td>
                <td className="p-2 border">{resConsig.margen}%</td>
                <td className="p-2 border">${resConsig.monto.toLocaleString()}</td>
                <td className="p-2 border font-bold">${resConsig.total.toLocaleString()}</td>
              </tr>
            )}

            {hasPermission(PATH_VISTA, "tabla_simulacion", "filas_implantes") && (
              <>
                {previsiones.map(prev => {
                  const res = calcularImplante(precio, prev);
                  return (
                    <tr key={prev} className="hover:bg-gray-50">
                      <td className="p-2 border text-gray-500">Implante</td>
                      <td className="p-2 border">{prev}</td>
                      <td className="p-2 border">{res.margen}%</td>
                      <td className="p-2 border">${res.monto.toLocaleString()}</td>
                      <td className="p-2 border font-bold">${res.total.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CalculadoraMargen;