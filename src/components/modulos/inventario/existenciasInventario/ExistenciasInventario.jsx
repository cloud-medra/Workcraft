import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Search, PackageCheck, AlertCircle, DollarSign } from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';
import Spinner from '../../../ui/Spinner';

/**
 * Muestra el resumen de existencias consolidadas mapeando el arreglo 'items' 
 * de la colección 'inventario_general' directamente desde Firestore.
 */
const ExistenciasInventario = ({ cajas: cajasProp }) => {
  const [cajasState, setCajasState] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState('');

  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/inventario/existencias";
  const COL_BASE = "inventario_general";

  // 1. Obtener datos de Firestore si no vienen por props
  useEffect(() => {
    if (Array.isArray(cajasProp) && cajasProp.length > 0) {
      setCajasState(cajasProp);
      setCargando(false);
      return;
    }

    setCargando(true);

    try {
      const q = query(collection(db, COL_BASE), orderBy('fechaRegistro', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          setCajasState(data);
          setCargando(false);
        },
        (error) => {
          console.error('Error al escuchar Firestore:', error);
          setCargando(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error al configurar Firestore:', err);
      setCargando(false);
    }
  }, [cajasProp]);

  const cajas = Array.isArray(cajasProp) && cajasProp.length > 0 ? cajasProp : cajasState;

  // 2. Consolidar ítems agrupándolos e integrando Precio y Valor Total
  const existenciasConsolidadas = useMemo(() => {
    const mapaResumen = {};

    if (!Array.isArray(cajas) || cajas.length === 0) {
      return [];
    }

    cajas.forEach((caja) => {
      if (caja.items && Array.isArray(caja.items)) {
        caja.items.forEach((item) => {
          const refRaw = (item.referencia || '').toString().trim();
          const codigoTexto = (item.codigo || 'S/C').toString().trim();
          const tipoTexto = (item.tipo || item.descripcion || 'Sin descripción').toString().trim();
          const cantidadNum = Number(item.cantidad) || 0;
          const precioNum = Number(item.precio || item.precioUnitario) || 0;
          const loteTexto = (item.lote || '').toString().trim();

          const ref = refRaw !== '' ? refRaw.toUpperCase() : 'SIN REFERENCIA';
          const claveAgrupacion = ref !== 'SIN REFERENCIA' 
            ? `REF_${ref}` 
            : `DESC_${tipoTexto.toUpperCase()}`;

          if (!mapaResumen[claveAgrupacion]) {
            mapaResumen[claveAgrupacion] = {
              clave: claveAgrupacion,
              referencia: ref,
              codigo: codigoTexto,
              tipo: tipoTexto,
              precioUnitario: precioNum,
              cantidadTotal: 0,
              valorTotal: 0,
              totalRegistros: 0,
              lotes: new Set(),
              cajas: new Set()
            };
          }

          // Si el registro actual tiene precio y el guardado era 0, actualiza el precio de referencia
          if (mapaResumen[claveAgrupacion].precioUnitario === 0 && precioNum > 0) {
            mapaResumen[claveAgrupacion].precioUnitario = precioNum;
          }

          mapaResumen[claveAgrupacion].cantidadTotal += cantidadNum;
          mapaResumen[claveAgrupacion].valorTotal += cantidadNum * precioNum;
          mapaResumen[claveAgrupacion].totalRegistros += 1;

          if (loteTexto) mapaResumen[claveAgrupacion].lotes.add(loteTexto);
          if (caja.nombreCaja) mapaResumen[claveAgrupacion].cajas.add(caja.nombreCaja);
        });
      }
    });

    return Object.values(mapaResumen);
  }, [cajas]);

  // 3. Filtrado dinámico
  const existenciasFiltradas = useMemo(() => {
    const termino = filtro.trim().toLowerCase();
    if (!termino) return existenciasConsolidadas;

    return existenciasConsolidadas.filter((item) =>
      item.referencia.toLowerCase().includes(termino) ||
      item.tipo.toLowerCase().includes(termino) ||
      item.codigo.toLowerCase().includes(termino)
    );
  }, [existenciasConsolidadas, filtro]);

  // 4. Métricas globales
  const totalGeneralPiezas = useMemo(() => {
    return existenciasFiltradas.reduce((acc, curr) => acc + curr.cantidadTotal, 0);
  }, [existenciasFiltradas]);

  const totalValorizadoGeneral = useMemo(() => {
    return existenciasFiltradas.reduce((acc, curr) => acc + curr.valorTotal, 0);
  }, [existenciasFiltradas]);

  const totalRegistros = useMemo(() => {
    return existenciasFiltradas.reduce((acc, curr) => acc + curr.totalRegistros, 0);
  }, [existenciasFiltradas]);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Cargando existencias...</h3>
          </div>
        </div>
      )}

      {/* Encabezado */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5 uppercase">
          <Layers size={14} className="text-[#2383C2]" />
          RESUMEN DE EXISTENCIAS CONSOLIDADAS
        </h2>

        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-600">
          {existenciasFiltradas.length} Producto(s) Distinto(s)
        </span>
      </div>

      {/* Buscador y Contadores Rápidos */}
      {hasPermission(PATH_VISTA, "barra_busqueda") && (
        <div className="bg-gray-50/30 dark:bg-gray-800/20 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700">
          {hasPermission(PATH_VISTA, "barra_busqueda", "input_buscar") && (
            <div className="relative w-60">
              <Search className="absolute left-2 top-1.5 text-gray-400 dark:text-gray-500" size={13} />
              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full h-7 pl-7 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2] dark:focus:border-[#2383C2]"
                placeholder="Buscar por ref, código, desc..."
              />
            </div>
          )}

          <div className="flex items-center gap-4 text-[11px] font-medium text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1">
              <PackageCheck size={13} className="text-emerald-500" />
              Total Unidades: <strong className="text-emerald-600 dark:text-emerald-400">{totalGeneralPiezas.toLocaleString('es-ES')}</strong>
            </span>
            <span className="flex items-center gap-1">
              <DollarSign size={13} className="text-[#2383C2]" />
              Valor Total: <strong className="text-[#2383C2] dark:text-sky-400">${totalValorizadoGeneral.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Tabla de existencias */}
      {hasPermission(PATH_VISTA, "tabla_datos") && (
        <div className="flex-grow overflow-auto">
          {!cargando && existenciasFiltradas.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 italic flex flex-col items-center justify-center gap-1">
              <AlertCircle size={20} className="text-gray-400 mb-1" />
              {filtro
                ? `No se encontraron coincidencias para "${filtro}".`
                : 'No hay ítems registrados dentro de las cajas guardadas.'}
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
                <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_referencia") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Referencia</th>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_codigo") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Código</th>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_descripcion") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Descripción / Tipo</th>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_ubicacion") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-center">Ubicación</th>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_entradas") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-center">N° Entradas</th>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_precio") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-right">Precio Unit.</th>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_cantidad") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-right">Cantidad</th>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_total") && <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 text-right">Total Valor</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700/70">
                {existenciasFiltradas.map((item) => (
                  <tr key={item.clave} className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                    {hasPermission(PATH_VISTA, "tabla_datos", "col_referencia") && (
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 font-semibold text-[#2383C2] dark:text-sky-400">
                        {item.referencia}
                      </td>
                    )}
                    {hasPermission(PATH_VISTA, "tabla_datos", "col_codigo") && (
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 font-mono text-gray-600 dark:text-gray-400 text-[10px]">
                        {item.codigo}
                      </td>
                    )}
                    {hasPermission(PATH_VISTA, "tabla_datos", "col_descripcion") && (
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200">
                        {item.tipo}
                      </td>
                    )}
                    {hasPermission(PATH_VISTA, "tabla_datos", "col_ubicacion") && (
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-center">
                        <span className="px-1.5 py-0.2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-medium text-[9px]">
                          {item.cajas.size} Caja(s)
                        </span>
                      </td>
                    )}
                    {hasPermission(PATH_VISTA, "tabla_datos", "col_entradas") && (
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-center">
                        <span className="px-1.5 py-0.2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded font-medium text-[9px]">
                          {item.totalRegistros}
                        </span>
                      </td>
                    )}
                    {hasPermission(PATH_VISTA, "tabla_datos", "col_precio") && (
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-right text-gray-600 dark:text-gray-300 font-mono">
                        ${item.precioUnitario.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    {hasPermission(PATH_VISTA, "tabla_datos", "col_cantidad") && (
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {item.cantidadTotal.toLocaleString('es-ES')}
                      </td>
                    )}
                    {hasPermission(PATH_VISTA, "tabla_datos", "col_total") && (
                      <td className="py-1 px-2 border-b border-gray-200 dark:border-gray-700/70 text-right font-bold text-blue-600 dark:text-blue-400 font-mono">
                        ${item.valorTotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 dark:bg-gray-900 font-bold sticky bottom-0 z-10 border-t border-gray-300 dark:border-gray-700 text-[10px]">
                <tr>
                  <td colSpan={4} className="py-1.5 px-2 text-gray-700 dark:text-gray-200 uppercase">
                    TOTAL GENERAL CONSOLIDADO:
                  </td>
                  <td className="py-1.5 px-2 text-center text-gray-700 dark:text-gray-200">
                    {totalRegistros} Entradas
                  </td>
                  <td className="py-1.5 px-2 text-right text-gray-400 dark:text-gray-500">
                    —
                  </td>
                  <td className="py-1.5 px-2 text-right text-emerald-600 dark:text-emerald-400 text-[11px]">
                    {totalGeneralPiezas.toLocaleString('es-ES')} Ud.
                  </td>
                  <td className="py-1.5 px-2 text-right text-blue-600 dark:text-blue-400 text-[11px] font-mono">
                    ${totalValorizadoGeneral.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default ExistenciasInventario;