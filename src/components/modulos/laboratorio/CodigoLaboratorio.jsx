import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Package, Plus, Trash2, Search, Pencil, Save, X, History } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useModal } from '../../../context/ModalContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';
import Spinner from '../../ui/Spinner';

const CodigoLaboratorio = () => {
  const [codigos, setCodigos] = useState([]);
  const [formData, setFormData] = useState({ referencia: '', codigo: '', precio: '', descripcion: '' });
  const [busqueda, setBusqueda] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Estados para el Modal de Historial / Logs
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedCodigoForLog, setSelectedCodigoForLog] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/codigoLaboratorio";
  const COL_CODIGOS = "laboratorio_codigos";
  const COL_LOGS = "laboratorio_codigos_logs";

  useEffect(() => {
    const q = query(collection(db, COL_CODIGOS), orderBy("referencia", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCodigos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper para auditoría de logs
  const registrarLog = async (codigoId, accion, detalles) => {
    try {
      await addDoc(collection(db, COL_LOGS), {
        codigoId,
        accion,
        detalles,
        usuario: userData?.nombreCompleto || 'Usuario Desconocido',
        usuarioEmail: userData?.email || '',
        fecha: new Date()
      });
    } catch (err) {
      console.error("Error al registrar log de auditoría:", err);
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formData.referencia || !formData.codigo || !formData.precio) {
      return showToast("Referencia, código y precio son obligatorios", "error");
    }

    setCargando(true);
    const refUpper = formData.referencia.toUpperCase();
    const descUpper = formData.descripcion.toUpperCase();
    const precioNum = Number(formData.precio);

    try {
      if (editingId) {
        const codigoExistente = codigos.find(c => c.id === editingId);

        const dataAEnviar = {
          ...formData,
          referencia: refUpper,
          descripcion: descUpper,
          precio: precioNum,
          registradoPor: codigoExistente?.registradoPor || userData?.nombreCompleto || 'Usuario',
          fechaRegistro: codigoExistente?.fechaRegistro || new Date()
        };

        await updateDoc(doc(db, COL_CODIGOS, editingId), dataAEnviar);

        await registrarLog(editingId, 'EDICION', {
          referenciaAnterior: codigoExistente?.referencia,
          referenciaNueva: refUpper,
          codigoAnterior: codigoExistente?.codigo,
          codigoNuevo: formData.codigo,
          precioAnterior: codigoExistente?.precio,
          precioNuevo: precioNum,
          descripcionAnterior: codigoExistente?.descripcion,
          descripcionNueva: descUpper
        });

        showToast("Código actualizado correctamente", "success");
      } else {
        const dataAEnviar = {
          ...formData,
          referencia: refUpper,
          descripcion: descUpper,
          precio: precioNum,
          registradoPor: userData?.nombreCompleto || 'Usuario',
          fechaRegistro: new Date()
        };

        const docRef = await addDoc(collection(db, COL_CODIGOS), dataAEnviar);

        await registrarLog(docRef.id, 'CREACION', {
          referencia: refUpper,
          codigo: formData.codigo,
          precio: precioNum,
          descripcion: descUpper
        });

        showToast("Código registrado correctamente", "success");
      }
      setFormData({ referencia: '', codigo: '', precio: '', descripcion: '' });
      setEditingId(null);
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleDelete = (id) => {
    const codigoAEliminar = codigos.find(c => c.id === id);

    confirmAction(
      "Eliminar Código",
      "¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteDoc(doc(db, COL_CODIGOS, id));

          await registrarLog(id, 'ELIMINACION', {
            referencia: codigoAEliminar?.referencia || '',
            codigo: codigoAEliminar?.codigo || '',
            precio: codigoAEliminar?.precio || 0
          });

          showToast("Código eliminado correctamente", "info");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  const abrirHistorialLogs = async (item) => {
    setSelectedCodigoForLog(item);
    setShowLogModal(true);
    setLoadingLogs(true);

    try {
      const q = query(
        collection(db, COL_LOGS),
        where("codigoId", "==", item.id),
        orderBy("fecha", "desc")
      );
      const snapshot = await getDocs(q);
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogsList(logsData);
    } catch (error) {
      console.error("Error cargando logs:", error);
      showToast("Error al cargar el historial", "error");
    } finally {
      setLoadingLogs(false);
    }
  };

  const codigosFiltrados = codigos.filter(c =>
    c.referencia?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const inputClass = "w-full h-7 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[11px] outline-none focus:border-[#2383C2]";
  const labelClass = "block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5";

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Procesando...</h3>
          </div>
        </div>
      )}

      <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 px-3 py-2 flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <Package size={14} className="text-[#2383C2]" /> {editingId ? "EDITAR CÓDIGO" : "GESTIÓN DE CÓDIGOS"}
      </h2>

      {hasPermission(PATH_VISTA, "formulario", "ver_seccion") && (
        <form onSubmit={handleGuardar} className="px-3 py-2 flex flex-wrap items-end gap-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20">
          {hasPermission(PATH_VISTA, "formulario", "input_referencia") && (
            <div className="w-[120px]">
              <label className={labelClass}>Referencia</label>
              <input required value={formData.referencia} onChange={e => setFormData({ ...formData, referencia: e.target.value.toUpperCase() })} className={`${inputClass} uppercase`} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_codigo") && (
            <div className="w-[120px]">
              <label className={labelClass}>Código</label>
              <input required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} className={inputClass} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_precio") && (
            <div className="w-[110px]">
              <label className={labelClass}>Precio</label>
              <input type="number" required value={formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.value })} className={inputClass} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_descripcion") && (
            <div className="flex-1 min-w-[160px]">
              <label className={labelClass}>Descripción</label>
              <input value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value.toUpperCase() })} className={`${inputClass} uppercase`} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "btn_registrar") && (
            <button type="submit" className={`h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1.5 whitespace-nowrap shrink-0 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'} text-white transition`}>
              {editingId ? <><Save size={13} /> Actualizar</> : <><Plus size={13} /> Registrar</>}
            </button>
          )}
          {editingId && hasPermission(PATH_VISTA, "formulario", "btn_cancelar") && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ referencia: '', codigo: '', precio: '', descripcion: '' }) }} className="h-7 px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-bold text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 transition">
              <X size={13} /> Cancelar
            </button>
          )}
        </form>
      )}

      {hasPermission(PATH_VISTA, "busqueda", "barra_busqueda") && (
        <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          {hasPermission(PATH_VISTA, "busqueda", "input_busqueda") && (
            <div className="relative w-60">
              <Search className="absolute left-2 top-1.5 text-gray-400 dark:text-gray-500" size={13} />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className={`${inputClass} pl-7`}
                placeholder="Buscar código o referencia..."
              />
            </div>
          )}
        </div>
      )}

      {hasPermission(PATH_VISTA, "tabla", "ver_tabla") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse table-fixed">
            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10 text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
              <tr>
                {hasPermission(PATH_VISTA, "tabla", "col_referencia") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-[18%]">Referencia</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_codigo") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-[15%]">Código</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_descripcion") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-[42%]">Descripción</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_precio") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-[15%] text-right">Precio</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_acciones") && <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 w-[100px] text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {codigosFiltrados.map((c) => (
                <tr key={c.id} className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  {hasPermission(PATH_VISTA, "tabla", "col_referencia") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-700 dark:text-gray-200 truncate">{c.referencia}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_codigo") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 truncate">{c.codigo}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_descripcion") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 truncate">{c.descripcion}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_precio") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-[#2383C2] text-right whitespace-nowrap">$ {Number(c.precio).toLocaleString('es-CL')}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_acciones") && (
                    <td className="py-1 px-2 border-b border-gray-200 dark:border-gray-700 text-center">
                      <div className="flex justify-center gap-2">
                        {hasPermission(PATH_VISTA, "tabla", "btn_log") && (
                          <button onClick={() => abrirHistorialLogs(c)} title="Ver Historial / Logs" className="text-gray-500 hover:text-[#2383C2] dark:hover:text-[#2383C2] transition">
                            <History size={13} />
                          </button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla", "btn_editar") && (
                          <button onClick={() => { setEditingId(c.id); setFormData(c); }} title="Editar" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">
                            <Pencil size={13} />
                          </button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla", "btn_eliminar") && (
                          <button onClick={() => handleDelete(c.id)} title="Eliminar" className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition">
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Historial de Cambios / Logs */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-lg w-full max-w-lg border border-gray-200 dark:border-gray-700 flex flex-col text-[11px] overflow-hidden">
            
            {/* Cabecera Fija del Modal */}
            <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 shrink-0">
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 flex items-center gap-1.5 truncate">
                <History size={14} className="text-[#2383C2] shrink-0" /> Historial - {selectedCodigoForLog?.referencia} ({selectedCodigoForLog?.codigo})
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 font-medium">({logsList.length} registros)</span>
                <button onClick={() => setShowLogModal(false)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Contenedor con Altura Fija y Scrollbar Interno */}
            <div className="p-3 overflow-y-auto max-h-[380px] min-h-[180px] space-y-2">
              {loadingLogs ? (
                <p className="text-[10px] text-center text-gray-500 dark:text-gray-400 py-6">Cargando historial...</p>
              ) : logsList.length === 0 ? (
                <p className="text-[10px] text-center text-gray-500 dark:text-gray-400 py-6">No hay logs registrados para este código.</p>
              ) : (
                logsList.map((log) => (
                  <div key={log.id} className="p-2 border border-gray-200 dark:border-gray-700 rounded bg-gray-50/70 dark:bg-gray-900/40 text-[10px]">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        log.accion === 'CREACION' ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400' :
                        log.accion === 'EDICION' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                      }`}>
                        {log.accion}
                      </span>
                      <span className="text-gray-400 text-[9px]">{formatearFecha(log.fecha)}</span>
                    </div>

                    <p className="text-gray-700 dark:text-gray-300 font-semibold mb-1">Usuario: <span className="font-normal">{log.usuario}</span></p>

                    <div className="text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-1.5 rounded border border-gray-100 dark:border-gray-700 text-[10px]">
                      {log.accion === 'CREACION' && (
                        <div className="space-y-0.5">
                          <p><strong>Referencia:</strong> {log.detalles?.referencia}</p>
                          <p><strong>Código:</strong> {log.detalles?.codigo}</p>
                          <p><strong>Precio:</strong> $ {Number(log.detalles?.precio || 0).toLocaleString('es-CL')}</p>
                          <p><strong>Descripción:</strong> {log.detalles?.descripcion || 'N/A'}</p>
                        </div>
                      )}

                      {log.accion === 'EDICION' && (
                        <ul className="space-y-0.5 list-disc list-inside">
                          {log.detalles?.referenciaAnterior !== log.detalles?.referenciaNueva && (
                            <li>Referencia: <span className="text-red-500 font-medium">{log.detalles?.referenciaAnterior}</span> {'->'} <span className="text-green-600 font-medium">{log.detalles?.referenciaNueva}</span></li>
                          )}
                          {log.detalles?.codigoAnterior !== log.detalles?.codigoNuevo && (
                            <li>Código: <span className="text-red-500 font-medium">{log.detalles?.codigoAnterior}</span> {'->'} <span className="text-green-600 font-medium">{log.detalles?.codigoNuevo}</span></li>
                          )}
                          {log.detalles?.precioAnterior !== log.detalles?.precioNuevo && (
                            <li>Precio: <span className="text-red-500 font-medium">${Number(log.detalles?.precioAnterior || 0).toLocaleString('es-CL')}</span> {'->'} <span className="text-green-600 font-medium">${Number(log.detalles?.precioNuevo || 0).toLocaleString('es-CL')}</span></li>
                          )}
                          {log.detalles?.descripcionAnterior !== log.detalles?.descripcionNueva && (
                            <li>Descripción: <span className="text-red-500 font-medium">{log.detalles?.descripcionAnterior || 'Vacío'}</span> {'->'} <span className="text-green-600 font-medium">{log.detalles?.descripcionNueva || 'Vacío'}</span></li>
                          )}
                        </ul>
                      )}

                      {log.accion === 'ELIMINACION' && (
                        <p className="text-red-500">Registro eliminado ({log.detalles?.referencia} - {log.detalles?.codigo})</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pie Fijo del Modal */}
            <div className="px-3 py-1.5 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-800 shrink-0">
              <button onClick={() => setShowLogModal(false)} className="px-3 py-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-bold transition">
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default CodigoLaboratorio;