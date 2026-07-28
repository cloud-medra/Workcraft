import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Microscope, Plus, Trash2, Search, Pencil, Save, X, History } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useModal } from '../../../context/ModalContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';

const EmpresasLaboratorios = () => {
  const [laboratorios, setLaboratorios] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', rut: '', estado: 'ACTIVO' });
  const [busqueda, setBusqueda] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Estados para el Modal de Historial / Logs
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLabForLog, setSelectedLabForLog] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/empresas";

  useEffect(() => {
    const q = query(collection(db, "laboratorio_empresas"), orderBy("fechaRegistro", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLaboratorios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const formatearRut = (rut) => {
    let valor = rut.replace(/[^0-9kK]/g, '');
    if (valor.length < 2) return valor;
    const cuerpo = valor.slice(0, -1);
    const dv = valor.slice(-1).toUpperCase();
    const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${cuerpoFormateado}-${dv}`;
  };

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

  // Helper para auditoría
  const registrarLog = async (laboratorioId, accion, detalles) => {
    try {
      await addDoc(collection(db, "laboratorio_empresas_logs"), {
        laboratorioId,
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
    if (!formData.nombre.trim() || !formData.rut.trim()) {
      return showToast("Nombre y RUT son obligatorios", "error");
    }

    const rutFormateado = formatearRut(formData.rut);

    try {
      if (editingId) {
        const labExistente = laboratorios.find(l => l.id === editingId);
        
        const dataAEnviar = {
          ...formData,
          rut: rutFormateado,
          fechaRegistro: labExistente?.fechaRegistro || new Date(),
          registradoPor: labExistente?.registradoPor || userData?.nombreCompleto || 'Usuario'
        };

        await updateDoc(doc(db, "laboratorio_empresas", editingId), dataAEnviar);

        await registrarLog(editingId, 'EDICION', {
          nombreAnterior: labExistente?.nombre,
          nombreNuevo: formData.nombre,
          rutAnterior: labExistente?.rut,
          rutNuevo: rutFormateado,
          estadoAnterior: labExistente?.estado,
          estadoNuevo: formData.estado
        });

        showToast("Laboratorio actualizado correctamente", "success");
      } else {
        const dataAEnviar = {
          ...formData,
          rut: rutFormateado,
          fechaRegistro: new Date(),
          registradoPor: userData?.nombreCompleto || 'Usuario'
        };

        const docRef = await addDoc(collection(db, "laboratorio_empresas"), dataAEnviar);

        await registrarLog(docRef.id, 'CREACION', {
          nombre: formData.nombre,
          rut: rutFormateado,
          estado: formData.estado
        });

        showToast("Laboratorio registrado correctamente", "success");
      }
      setFormData({ nombre: '', rut: '', estado: 'ACTIVO' });
      setEditingId(null);
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    }
  };

  const handleDelete = (id) => {
    const labAEliminar = laboratorios.find(l => l.id === id);

    confirmAction(
      "Eliminar Laboratorio",
      "¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteDoc(doc(db, "laboratorio_empresas", id));

          await registrarLog(id, 'ELIMINACION', {
            nombre: labAEliminar?.nombre || '',
            rut: labAEliminar?.rut || ''
          });

          showToast("Laboratorio eliminado correctamente", "info");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  const iniciarEdicion = (l) => {
    setEditingId(l.id);
    setFormData({ nombre: l.nombre, rut: l.rut, estado: l.estado || 'ACTIVO' });
  };

  const abrirHistorialLogs = async (lab) => {
    setSelectedLabForLog(lab);
    setShowLogModal(true);
    setLoadingLogs(true);

    try {
      const q = query(
        collection(db, "laboratorio_empresas_logs"),
        where("laboratorioId", "==", lab.id),
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

  const laboratoriosFiltrados = laboratorios.filter(l =>
    l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (l.rut && l.rut.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 px-3 py-2 flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <Microscope size={14} className="text-[#2383C2]" /> {editingId ? "EDITAR LABORATORIO" : "REGISTRO DE LABORATORIOS"}
      </h2>

      {hasPermission(PATH_VISTA, "formulario_registro") && (
        <form onSubmit={handleGuardar} className="px-3 py-2 flex flex-wrap items-end gap-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20">
          {hasPermission(PATH_VISTA, "formulario_registro", "input_nombre") && (
            <div className="w-[240px]">
              <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Nombre Laboratorio</label>
              <input required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="Ej: Laboratorio Central" />
            </div>
          )}

          {hasPermission(PATH_VISTA, "formulario_registro", "input_rut") && (
            <div className="w-[150px]">
              <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">RUT</label>
              <input required value={formData.rut} onChange={e => setFormData({ ...formData, rut: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="Ej: 123456789" />
            </div>
          )}

          {editingId && hasPermission(PATH_VISTA, "formulario_registro", "select_estado") && (
            <div className="w-[100px]">
              <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Estado</label>
              <select value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} className="w-full h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          )}

          {((!editingId && hasPermission(PATH_VISTA, "formulario_registro", "btn_registrar")) ||
            (editingId && hasPermission(PATH_VISTA, "formulario_registro", "btn_actualizar"))) && (
              <button type="submit" className={`h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1.5 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'} text-white transition`}>
                {editingId ? <><Save size={13} /> Actualizar</> : <><Plus size={13} /> Registrar</>}
              </button>
            )}

          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ nombre: '', rut: '', estado: 'ACTIVO' }) }} className="h-7 px-3 bg-gray-200 dark:bg-gray-700 rounded font-bold text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
              <X size={13} /> Cancelar
            </button>
          )}
        </form>
      )}

      {hasPermission(PATH_VISTA, "barra_busqueda") && (
        <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          {hasPermission(PATH_VISTA, "barra_busqueda", "input_buscar") && (
            <div className="relative w-60">
              <Search className="absolute left-2 top-1.5 text-gray-400 dark:text-gray-500" size={13} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-7 pl-7 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2] dark:focus:border-[#2383C2]" placeholder="Buscar por nombre o rut..." />
            </div>
          )}
        </div>
      )}

      {hasPermission(PATH_VISTA, "tabla_datos") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
              <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8 text-center">#</th>
                {hasPermission(PATH_VISTA, "tabla_datos", "col_nombre") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Nombre</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_rut") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">RUT</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_estado") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Estado</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_registrador") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Registrado por</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_fecha") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha</th>}
                <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {laboratoriosFiltrados.map((l, index) => (
                <tr key={l.id} className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold text-center">{index + 1}</td>
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_nombre") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">{l.nombre}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_rut") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{l.rut}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_estado") && (
                    <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${l.estado === 'INACTIVO' ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'}`}>
                        {l.estado || 'ACTIVO'}
                      </span>
                    </td>
                  )}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_registrador") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400">{l.registradoPor || 'N/A'}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_fecha") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400">{formatearFecha(l.fechaRegistro)}</td>}

                  <td className="py-1 px-2 border-b border-gray-200 dark:border-gray-700 text-center">
                    <div className="flex justify-center gap-2">
                      {hasPermission(PATH_VISTA, "tabla_datos", "action_log") && (
                        <button onClick={() => abrirHistorialLogs(l)} title="Ver Historial / Logs" className="text-gray-500 hover:text-[#2383C2] dark:hover:text-[#2383C2] transition">
                          <History size={13} />
                        </button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_datos", "action_editar") && (
                        <button onClick={() => iniciarEdicion(l)} title="Editar" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">
                          <Pencil size={13} />
                        </button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_datos", "action_eliminar") && (
                        <button onClick={() => handleDelete(l.id)} title="Eliminar" className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
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
                <History size={14} className="text-[#2383C2] shrink-0" /> Historial - {selectedLabForLog?.nombre}
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
                <p className="text-[10px] text-center text-gray-500 dark:text-gray-400 py-6">No hay logs registrados para este laboratorio.</p>
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
                          <p><strong>Nombre:</strong> {log.detalles?.nombre}</p>
                          <p><strong>RUT:</strong> {log.detalles?.rut}</p>
                          <p><strong>Estado:</strong> {log.detalles?.estado}</p>
                        </div>
                      )}

                      {log.accion === 'EDICION' && (
                        <ul className="space-y-0.5 list-disc list-inside">
                          {log.detalles?.nombreAnterior !== log.detalles?.nombreNuevo && (
                            <li>Nombre: <span className="text-red-500 font-medium">{log.detalles?.nombreAnterior}</span> {'->'} <span className="text-green-600 font-medium">{log.detalles?.nombreNuevo}</span></li>
                          )}
                          {log.detalles?.rutAnterior !== log.detalles?.rutNuevo && (
                            <li>RUT: <span className="text-red-500 font-medium">{log.detalles?.rutAnterior}</span> {'->'} <span className="text-green-600 font-medium">{log.detalles?.rutNuevo}</span></li>
                          )}
                          {log.detalles?.estadoAnterior !== log.detalles?.estadoNuevo && (
                            <li>Estado: <span className="text-red-500 font-medium">{log.detalles?.estadoAnterior}</span> {'->'} <span className="text-green-600 font-medium">{log.detalles?.estadoNuevo}</span></li>
                          )}
                        </ul>
                      )}

                      {log.accion === 'ELIMINACION' && (
                        <p className="text-red-500">Registro eliminado ({log.detalles?.nombre} - {log.detalles?.rut})</p>
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

export default EmpresasLaboratorios;