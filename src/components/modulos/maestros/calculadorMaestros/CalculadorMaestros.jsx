import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { Calculator, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useUser } from '../../../../context/UserContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';
import Spinner from '../../../ui/Spinner';

const CalculadorMaestros = () => {
  const [recargos, setRecargos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [precioInput, setPrecioInput] = useState('');
  const [reglaEncontrada, setReglaEncontrada] = useState(null);

  const { showToast } = useToast();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/maestros/calculador";
  const COL_BASE = "maestros_recargos";

  // Cargar reglas de recargos en tiempo real
  useEffect(() => {
    const q = query(collection(db, COL_BASE), orderBy("desde", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecargos(datos);
      setCargando(false);
    }, (error) => {
      console.error("Error al cargar reglas:", error);
      showToast("Error al sincronizar las reglas de recargo", "error");
      setCargando(false);
    });
    return () => unsubscribe();
  }, []);

  // Función para formatear números chilenos
  const formatNumber = (num) => {
    if (num === '' || num === null || isNaN(num)) return '0';
    return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(num);
  };

  // Buscar la regla activa cuando cambia el precio ingresado
  useEffect(() => {
    const precioNum = parseFloat(precioInput);

    if (isNaN(precioNum) || precioInput === '') {
      setReglaEncontrada(null);
      return;
    }

    // Buscar el rango donde desde <= precio <= hasta y que esté ACTIVO
    const regla = recargos.find(r => {
      const desde = parseFloat(r.desde);
      const hasta = parseFloat(r.hasta);
      const esActivo = r.estado !== 'INACTIVO';
      return esActivo && precioNum >= desde && precioNum <= hasta;
    });

    setReglaEncontrada(regla || null);
  }, [precioInput, recargos]);

  // Cálculos corregidos (Multiplicación directa)
  const precioNum = parseFloat(precioInput) || 0;
  const vecesCosto = reglaEncontrada ? parseFloat(reglaEncontrada.vecesCosto) : 0;
  const precioFinal = precioNum * vecesCosto;

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Cargando reglas maestras...</h3>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <Calculator size={14} className="text-[#2383C2]" />
          CALCULADOR DE RECARGOS MAESTROS
        </h2>
      </div>

      {/* Input de Precio */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20 flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full sm:w-72">
          <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
            Ingrese Precio Base ($)
          </label>
          <div className="relative">
            <span className="absolute left-2.5 top-1.5 text-gray-400 font-bold">$</span>
            <input
              type="number"
              step="any"
              value={precioInput}
              onChange={(e) => setPrecioInput(e.target.value)}
              placeholder="Ej: 10000"
              className="w-full h-8 pl-7 pr-3 border border-gray-300 dark:border-gray-600 rounded text-[12px] font-semibold outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
              autoFocus
            />
          </div>
        </div>

        {/* Resumen de regla detectada */}
        <div className="flex-grow flex items-center gap-2">
          {precioInput !== '' && (
            reglaEncontrada ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded text-green-800 dark:text-green-300">
                <CheckCircle2 size={15} className="text-green-600 flex-shrink-0" />
                <div>
                  <span className="font-bold">Regla Aplicada:</span> Rango [{formatNumber(reglaEncontrada.desde)} - {formatNumber(reglaEncontrada.hasta)}] | Factor: <span className="font-bold">{reglaEncontrada.vecesCosto}x</span>
                  {reglaEncontrada.comentario && <span className="block text-[10px] italic">({reglaEncontrada.comentario})</span>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded text-red-800 dark:text-red-300">
                <AlertCircle size={15} className="text-red-600 flex-shrink-0" />
                <span>No se encontró ninguna regla activa para el precio ingresado.</span>
              </div>
            )
          )}
        </div>
      </div>

      {/* Resultados del Cálculo (Ubicados arriba) */}
      <div className="p-4 flex-grow flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto w-full">
          
          {/* Card Precio Base */}
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex flex-col items-center text-center">
            <span className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] mb-1">Precio Ingresado</span>
            <span className="text-[18px] font-extrabold text-gray-800 dark:text-gray-100">
              ${formatNumber(precioNum)}
            </span>
          </div>

          {/* Card Factor Aplicado */}
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col items-center text-center">
            <span className="text-amber-700 dark:text-amber-400 font-bold uppercase text-[10px] mb-1">
              Factor Multiplicador
            </span>
            <span className="text-[18px] font-extrabold text-amber-800 dark:text-amber-300">
              {vecesCosto} x
            </span>
          </div>

          {/* Card Precio Final */}
          <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col items-center text-center">
            <span className="text-[#2383C2] font-bold uppercase text-[10px] mb-1">Precio Final (Multiplicado)</span>
            <span className="text-[18px] font-extrabold text-[#2383C2]">
              ${formatNumber(precioFinal)}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CalculadorMaestros;