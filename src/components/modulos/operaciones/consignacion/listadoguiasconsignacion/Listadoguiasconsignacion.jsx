import React, { useEffect, useMemo, useState } from 'react';
import { collectionGroup, query, where, orderBy, getDocs } from 'firebase/firestore';

// ⚠️ Ajusta estas rutas según dónde ubiques finalmente este archivo dentro de
// components/modulos/... (mismo patrón que EmpresasMaestros.jsx).
import { db } from '../../../../../firebaseConfig';
import { useToast } from '../../../../../context/ToastContext';
import Spinner from '../../../../../components/ui/Spinner';

import {
  ClipboardList,
  Search,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Package,
  AlertCircle,
} from 'lucide-react';

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const COL_BASE = 'consignacion_registros';

// El collectionGroup 'detalles' es compartido con otros módulos (por
// ejemplo Implantes), así que hay que filtrar por el prefijo real de la
// ruta para no mezclar documentos de otra colección.
const filtrarSoloConsignacion = (docs) =>
  docs.filter((d) => d.ref.path.startsWith(`${COL_BASE}/`));

const ListadoGuiasConsignacion = () => {
  const { showToast } = useToast();

  // --- Calendario real: qué años/meses tienen registros en Firestore ---
  // Forma: { "2026": [8, 9], "2025": [12] }
  const [calendario, setCalendario] = useState({});
  const [cargandoCalendario, setCargandoCalendario] = useState(true);
  const [listo, setListo] = useState(false); // true cuando ya se calcularon los valores por defecto

  const [año, setAño] = useState('');
  const [mesNumero, setMesNumero] = useState('');

  const [cargando, setCargando] = useState(false);
  const [productos, setProductos] = useState([]); // documentos crudos de "detalles"
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [guiaExpandidaId, setGuiaExpandidaId] = useState(null);

  // --- Años disponibles (ordenados desc) y meses disponibles para el año actual ---
  const añosDisponibles = useMemo(
    () => Object.keys(calendario).sort((a, b) => Number(b) - Number(a)),
    [calendario]
  );

  const mesesDisponibles = useMemo(
    () => (calendario[año] ? [...calendario[año]].sort((a, b) => a - b) : []),
    [calendario, año]
  );

  // --- 1) Escanear toda la colección para saber qué años/meses tienen datos ---
  const cargarCalendario = async () => {
    setCargandoCalendario(true);
    try {
      const q = query(collectionGroup(db, 'detalles'), orderBy('fechaEmision', 'asc'));
      const snapshot = await getDocs(q);

      const docsConsignacion = filtrarSoloConsignacion(snapshot.docs);

      const mapa = {};
      docsConsignacion.forEach((doc) => {
        const fecha = doc.data().fechaEmision;
        if (!fecha || fecha.length < 7) return;
        const [y, m] = fecha.split('-');
        const mesNum = Number(m);
        if (!mapa[y]) mapa[y] = new Set();
        mapa[y].add(mesNum);
      });

      const resultado = {};
      Object.keys(mapa).forEach((y) => {
        resultado[y] = Array.from(mapa[y]);
      });

      setCalendario(resultado);
      return resultado;
    } catch (err) {
      console.error('Error al cargar el calendario de guías:', err);
      showToast('No se pudo determinar los años/meses con registros', 'error');
      return {};
    } finally {
      setCargandoCalendario(false);
    }
  };

  // --- 2) Cargar los productos del mes/año seleccionado ---
  const cargarMes = async (añoSel = año, mesSel = mesNumero) => {
    if (!añoSel || !mesSel) return;
    setCargando(true);
    setError('');
    try {
      const mesStr = String(mesSel).padStart(2, '0');
      const inicioMes = `${añoSel}-${mesStr}-01`;
      const finMes =
        Number(mesSel) === 12
          ? `${Number(añoSel) + 1}-01-01`
          : `${añoSel}-${String(Number(mesSel) + 1).padStart(2, '0')}-01`;

      const q = query(
        collectionGroup(db, 'detalles'),
        where('fechaEmision', '>=', inicioMes),
        where('fechaEmision', '<', finMes),
        orderBy('fechaEmision', 'desc')
      );

      const snapshot = await getDocs(q);

      const docsConsignacion = filtrarSoloConsignacion(snapshot.docs);

      setProductos(docsConsignacion.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error('Error al cargar guías de consignación:', err);
      if (err?.code === 'failed-precondition') {
        setError(
          'Falta un índice de Firestore para esta consulta. Revisa la consola del navegador: el error trae un enlace para crearlo automáticamente (tarda 1-2 minutos en activarse).'
        );
      } else {
        setError('No se pudieron cargar las guías de este mes.');
      }
      showToast('No se pudieron cargar las guías', 'error');
    } finally {
      setCargando(false);
    }
  };

  // --- Al montar: calcular calendario y elegir año/mes por defecto (los más recientes con datos) ---
  useEffect(() => {
    (async () => {
      const cal = await cargarCalendario();
      const años = Object.keys(cal).sort((a, b) => Number(b) - Number(a));
      if (años.length > 0) {
        const añoDefault = años[0];
        const mesesDelAño = [...cal[añoDefault]].sort((a, b) => a - b);
        const mesDefault = mesesDelAño[mesesDelAño.length - 1];
        setAño(añoDefault);
        setMesNumero(mesDefault);
        cargarMes(añoDefault, mesDefault);
      }
      setListo(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Si cambia el año seleccionado, asegurar que el mes elegido sea válido para ese año ---
  useEffect(() => {
    if (!listo || !año) return;
    const meses = calendario[año] ? [...calendario[año]].sort((a, b) => a - b) : [];
    if (meses.length === 0) return;
    if (!meses.includes(Number(mesNumero))) {
      const nuevoMes = meses[meses.length - 1]; // el más reciente disponible de ese año
      setMesNumero(nuevoMes);
      return; // el próximo efecto (mesNumero) disparará la carga
    }
    cargarMes(año, mesNumero);
    setGuiaExpandidaId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [año, listo]);

  useEffect(() => {
    if (!listo || !año || !mesNumero) return;
    cargarMes(año, mesNumero);
    setGuiaExpandidaId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesNumero]);

  const recargarTodo = async () => {
    const cal = await cargarCalendario();
    if (año && cal[año] && cal[año].includes(Number(mesNumero))) {
      cargarMes(año, mesNumero);
    } else {
      const años = Object.keys(cal).sort((a, b) => Number(b) - Number(a));
      if (años.length > 0) {
        const añoDefault = años[0];
        const mesesDelAño = [...cal[añoDefault]].sort((a, b) => a - b);
        const mesDefault = mesesDelAño[mesesDelAño.length - 1];
        setAño(añoDefault);
        setMesNumero(mesDefault);
      } else {
        setAño('');
        setMesNumero('');
        setProductos([]);
      }
    }
  };

  // --- Agrupar los productos sueltos en guías (por número de documento) ---
  const guias = useMemo(() => {
    const grupos = {};
    productos.forEach((p) => {
      const clave = p.numeroDocumento || '(sin número)';
      if (!grupos[clave]) {
        grupos[clave] = {
          id: clave,
          numeroGuia: p.numeroGuia || '',
          numeroDocumento: p.numeroDocumento || '',
          fechaEmision: p.fechaEmision || '',
          descripcionPrimerItem: p.descripcionPrimerItem || '',
          productos: [],
        };
      }
      grupos[clave].productos.push(p);
      // Compatibilidad con guías guardadas antes de este campo: si no vino
      // grabado, se usa la descripción del primer producto del grupo.
      if (!grupos[clave].descripcionPrimerItem && grupos[clave].productos.length === 1) {
        grupos[clave].descripcionPrimerItem = p.descripcion || '';
      }
    });
    return Object.values(grupos).sort((a, b) => (b.fechaEmision || '').localeCompare(a.fechaEmision || ''));
  }, [productos]);

  // --- Filtro de búsqueda (por guía/documento o por contenido de algún producto) ---
  const guiasFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return guias;
    return guias.filter((g) => {
      const coincideCabecera =
        g.numeroGuia.toLowerCase().includes(texto) || g.numeroDocumento.toLowerCase().includes(texto);
      const coincideProducto = g.productos.some(
        (p) =>
          p.codigo?.toLowerCase().includes(texto) ||
          p.descripcion?.toLowerCase().includes(texto) ||
          p.lote?.toLowerCase().includes(texto)
      );
      return coincideCabecera || coincideProducto;
    });
  }, [guias, busqueda]);

  const formatearFecha = (fechaISO) => {
    if (!fechaISO) return 'N/A';
    const [y, m, d] = fechaISO.split('-');
    return `${d}-${m}-${y}`;
  };

  const sinDatosEnAbsoluto = !cargandoCalendario && listo && añosDisponibles.length === 0;
  const mostrandoOverlay = cargando || (cargandoCalendario && !listo);

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {mostrandoOverlay && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Cargando...</h3>
          </div>
        </div>
      )}

      {/* --- CABECERA --- */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <ClipboardList size={14} className="text-[#2383C2]" />
          GUÍAS DE CONSIGNACIÓN
        </h2>

        <button
          onClick={recargarTodo}
          disabled={mostrandoOverlay}
          className="p-1 rounded-md text-gray-500 hover:text-[#2383C2] dark:text-gray-400 dark:hover:text-[#2383C2] hover:bg-gray-100 dark:hover:bg-gray-700 transition disabled:opacity-50"
          title="Recargar"
        >
          <RefreshCw size={15} className={mostrandoOverlay ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* --- BARRA DE BÚSQUEDA / FILTROS --- */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex flex-wrap justify-between items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <div className="relative w-60">
          <Search className="absolute left-2 top-1.5 text-gray-400 dark:text-gray-500" size={13} />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            disabled={sinDatosEnAbsoluto}
            className="w-full h-7 pl-7 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2] dark:focus:border-[#2383C2] disabled:opacity-50"
            placeholder="Buscar por N° de guía, documento, código, lote..."
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={mesNumero}
            onChange={(e) => setMesNumero(Number(e.target.value))}
            disabled={mesesDisponibles.length === 0}
            className="h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 disabled:opacity-50"
          >
            {mesesDisponibles.length === 0 && <option value="">Sin meses</option>}
            {mesesDisponibles.map((m) => (
              <option key={m} value={m}>{NOMBRES_MESES[m - 1]}</option>
            ))}
          </select>

          <select
            value={año}
            onChange={(e) => setAño(e.target.value)}
            disabled={añosDisponibles.length === 0}
            className="h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 disabled:opacity-50"
          >
            {añosDisponibles.length === 0 && <option value="">Sin años</option>}
            {añosDisponibles.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 whitespace-nowrap">
            {guiasFiltradas.length} guías
          </span>
        </div>
      </div>

      {/* --- ERROR --- */}
      {error && (
        <div className="mx-3 mt-2 flex items-start gap-2 text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* --- TABLA --- */}
      {sinDatosEnAbsoluto ? (
        <div className="flex-grow flex items-center justify-center text-[11px] text-gray-400 dark:text-gray-500">
          Aún no hay ninguna guía de consignación ingresada.
        </div>
      ) : (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
              <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8 text-center">#</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8"></th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">N° Guía</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">N° Documento</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Descripción</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha Emisión</th>
                <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 text-center">N° Productos</th>
              </tr>
            </thead>
            <tbody>
              {!mostrandoOverlay && !error && guiasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-gray-400 dark:text-gray-500">
                    No hay guías ingresadas para {NOMBRES_MESES[mesNumero - 1]} de {año}
                    {busqueda && ' que coincidan con la búsqueda'}.
                  </td>
                </tr>
              )}

              {guiasFiltradas.map((guia, index) => {
                const expandida = guiaExpandidaId === guia.id;
                return (
                  <React.Fragment key={guia.id}>
                    <tr
                      onClick={() => setGuiaExpandidaId(expandida ? null : guia.id)}
                      className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors cursor-pointer"
                    >
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold text-center">
                        {index + 1}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-400 text-center">
                        {expandida ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">
                        {guia.numeroGuia || 'N/A'}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                        {guia.numeroDocumento || 'N/A'}
                      </td>
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 max-w-[220px]">
                        <span className="block truncate" title={guia.descripcionPrimerItem}>
                          {guia.descripcionPrimerItem || 'N/A'}
                        </span>
                      </td>
                      <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400">
                        {formatearFecha(guia.fechaEmision)}
                      </td>
                      <td className="py-1 px-2 border-b border-gray-200 dark:border-gray-700/70 text-center">
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          <Package size={10} />
                          {guia.productos.length}
                        </span>
                      </td>
                    </tr>

                    {expandida && (
                      <tr>
                        <td colSpan={7} className="p-0 border-b border-gray-200 dark:border-gray-700/70 bg-gray-50/60 dark:bg-gray-900/30">
                          <table className="w-full text-left text-[11px] border-collapse">
                            <thead>
                              <tr className="text-gray-500 dark:text-gray-400 uppercase font-bold text-[9px]">
                                <th className="py-1 px-2 pl-9 border-b border-gray-200 dark:border-gray-700">Código</th>
                                <th className="py-1 px-2 border-b border-gray-200 dark:border-gray-700">Descripción</th>
                                <th className="py-1 px-2 border-b border-gray-200 dark:border-gray-700">Lote</th>
                                <th className="py-1 px-2 border-b border-gray-200 dark:border-gray-700">Vencimiento</th>
                                <th className="py-1 px-2 border-b border-gray-200 dark:border-gray-700 w-16">Cant.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {guia.productos.map((p) => (
                                <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                                  <td className="py-1 px-2 pl-9 text-gray-700 dark:text-gray-200 font-mono text-[10.5px]">
                                    {p.codigo || 'N/A'}
                                  </td>
                                  <td className="py-1 px-2 text-gray-600 dark:text-gray-300">
                                    {p.descripcion || 'N/A'}
                                  </td>
                                  <td className="py-1 px-2 text-gray-600 dark:text-gray-300">
                                    {p.lote || 'N/A'}
                                  </td>
                                  <td className="py-1 px-2 text-gray-600 dark:text-gray-300">
                                    {p.vencimiento || 'N/A'}
                                  </td>
                                  <td className="py-1 px-2 text-gray-600 dark:text-gray-300">
                                    {p.cantidad ?? 'N/A'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ListadoGuiasConsignacion;