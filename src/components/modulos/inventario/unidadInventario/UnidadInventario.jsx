import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import {
  Boxes,
  Search,
  X,
  Truck
} from 'lucide-react';
import Spinner from '../../../ui/Spinner';

const COL_TRANSITO = "inventario_transito";

const UnidadInventario = () => {
  const [transitoDocs, setTransitoDocs] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [filtroTexto, setFiltroTexto] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    // Ordenamos por la fecha de registro o creación del documento en tránsito
    const qTransito = query(collection(db, COL_TRANSITO), orderBy("fechaRegistro", "desc"));
    const unsub = onSnapshot(qTransito, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTransitoDocs(docs);
      setCargando(false);
    }, (error) => {
      console.error("Error al cargar inventario en tránsito:", error);
      setCargando(false);
    });

    return () => unsub();
  }, []);

  const filas = useMemo(() => {
    const texto = filtroTexto.trim().toLowerCase();
    const desde = fechaDesde ? new Date(`${fechaDesde}T00:00:00`) : null;
    const hasta = fechaHasta ? new Date(`${fechaHasta}T23:59:59`) : null;

    const resultado = [];

    transitoDocs.forEach((docItem) => {
      // Leemos la fecha del documento de tránsito
      const rawFecha = docItem.fechaRegistro || docItem.fecha;
      const fechaCierreDate = rawFecha?.toDate ? rawFecha.toDate() : null;

      if (desde && (!fechaCierreDate || fechaCierreDate < desde)) return;
      if (hasta && (!fechaCierreDate || fechaCierreDate > hasta)) return;

      // Leemos la lista de ítems de tránsito
      const itemsList = docItem.items || docItem.itemsEgresados || [];

      const itemsCoincidentes = itemsList.filter((item) => {
        if (!texto) return true;
        return (
          item.codigo?.toLowerCase().includes(texto) ||
          item.referencia?.toLowerCase().includes(texto) ||
          item.tipo?.toLowerCase().includes(texto) ||
          item.descripcion?.toLowerCase().includes(texto)
        );
      });

      if (texto && itemsCoincidentes.length === 0) return;

      itemsCoincidentes.forEach((item, idx) => {
        resultado.push({
          rowId: `${docItem.id}-${idx}`,
          docId: docItem.id,
          numeroDocumento: docItem.numeroDocumento || docItem.folio || '—',
          solicitante: docItem.solicitante || docItem.usuarioTransito || 'N/A',
          destino: docItem.destino || docItem.tipoDestino || 'N/A',
          fechaCierre: fechaCierreDate,
          procesadoPor: docItem.procesadoPor || docItem.usuario || 'Usuario',
          codigo: item.codigo || '—',
          referencia: item.referencia || '—',
          descripcion: item.tipo || item.descripcion || item.codigo || '—',
          lote: item.lote || 'S/L',
          vencimiento: item.vencimiento || 'S/V',
          // Usamos cantidadTraspasada como Cantidad Stock
          cantidadStock: item.cantidadTraspasada ?? item.cantidadEgresada ?? item.cantidad ?? 0,
          observacionInsumo: item.observacionInsumo || item.observacion || '—'
        });
      });
    });

    return resultado;
  }, [transitoDocs, filtroTexto, fechaDesde, fechaHasta]);

  const limpiarFiltros = () => {
    setFiltroTexto('');
    setFechaDesde('');
    setFechaHasta('');
  };

  const hayFiltrosActivos = filtroTexto.trim() !== '' || fechaDesde !== '' || fechaHasta !== '';

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">

      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Cargando tránsito...</h3>
          </div>
        </div>
      )}

      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <Truck size={14} className="text-[#2383C2]" />
          UNIDAD DE INVENTARIO (EN TRÁNSITO)
        </h2>
      </div>

      <div className="px-3 py-2 flex flex-wrap items-end gap-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20">
        <div className="w-64">
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Referencia / Descripción</label>
          <div className="relative">
            <Search className="absolute left-2 top-1.5 text-gray-400 dark:text-gray-500" size={13} />
            <input
              value={filtroTexto}
              onChange={(e) => setFiltroTexto(e.target.value)}
              className="w-full h-7 pl-7 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
              placeholder="Buscar código, referencia o descripción..."
            />
          </div>
        </div>

        <div className="w-[130px]">
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Desde</label>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
          />
        </div>

        <div className="w-[130px]">
          <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Hasta</label>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
          />
        </div>

        {hayFiltrosActivos && (
          <button
            type="button"
            onClick={limpiarFiltros}
            className="h-7 px-3 bg-gray-200 dark:bg-gray-700 rounded font-bold text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            <X size={13} /> Limpiar
          </button>
        )}
      </div>

      <div className="flex-grow overflow-auto">
        {filas.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 p-8 text-center">
            <Boxes size={36} className="mb-2 text-gray-300 dark:text-gray-600" />
            <p className="font-semibold text-[12px]">
              {hayFiltrosActivos ? 'No hay resultados para los filtros aplicados' : 'No se encontraron registros en tránsito'}
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
              <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8 text-center">#</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Doc N°</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Referencia</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Código</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Descripción</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 text-center">Cantidad Stock</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Lote</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Vencimiento</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Destino</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Observación Insumo</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Procesado por</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Solicitante</th>
                <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700">Cierre</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, index) => (
                <tr key={fila.rowId} className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold text-center">{index + 1}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">{fila.numeroDocumento}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{fila.referencia}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{fila.codigo}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">{fila.descripcion}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-center text-gray-700 dark:text-gray-200 font-semibold">{fila.cantidadStock}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{fila.lote}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400">{fila.vencimiento}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70">
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400">
                      {fila.destino}
                    </span>
                  </td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{fila.observacionInsumo}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400">{fila.procesadoPor}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{fila.solicitante || 'N/A'}</td>
                  <td className="py-1 px-2 border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">{fila.fechaCierre ? fila.fechaCierre.toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UnidadInventario;