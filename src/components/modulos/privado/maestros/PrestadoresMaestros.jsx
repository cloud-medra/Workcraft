// src/components/maestros/PrestadoresMaestros.jsx
import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Stethoscope, Plus, Trash2, Search, Pencil, Save, X, History } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useModal } from '../../../context/ModalContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';

const PrestadoresMaestros = () => {
  const [prestadores, setPrestadores] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', especialidad: '', comentarios: '' });
  const [busqueda, setBusqueda] = useState('');
  const [editingId, setEditingId] = useState(null);

  // Estados para el Drawer Lateral de Historial / Logs
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedPrestadorForLog, setSelectedPrestadorForLog] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/maestros/prestadores";
  const COL_BASE = "maestros_prestadores";

  useEffect(() => {
    const q = query(collection(db, COL_BASE), orderBy("fechaRegistro", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPrestadores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
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

  // Helper para auditoría usando subcolección interna
  const registrarLog = async (prestadorId, accion, detalles) => {
    try {
      const logsSubcollectionRef = collection(db, COL_BASE, prestadorId, "logs");
      await addDoc(logsSubcollectionRef, {
        accion,
        detalles,
        usuario: userData?.nombreCompleto || 'Usuario Desconocido',
        usuarioEmail: userData?.email || '',
        fecha: new Date(),
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error al registrar log de auditoría:", err);
    }
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.especialidad.trim()) {
      return showToast("Nombre y Especialidad son obligatorios", "error");
    }

    const nombreTrimmed = formData.nombre.trim().toLowerCase();

    // Validar Nombre duplicado (excluyendo el registro actual si se está editando)
    const existeNombre = prestadores.some(p => 
      p.nombre.trim().toLowerCase() === nombreTrimmed && p.id !== editingId
    );
    if (existeNombre) {
      return showToast("Ya existe un prestador registrado con este Nombre", "error");
    }

    try {
      if (editingId) {
        const prestadorExistente = prestadores.find(p => p.id === editingId);
        
        const dataAEnviar = {
          ...formData,
          fechaRegistro: prestadorExistente?.fechaRegistro || new Date(),
          registradoPor: prestadorExistente?.registradoPor || userData?.nombreCompleto || 'Usuario'
        };

        await updateDoc(doc(db, COL_BASE, editingId), dataAEnviar);

        await registrarLog(editingId, 'EDICION', {
          nombreAnterior: prestadorExistente?.nombre,
          nombreNuevo: formData.nombre,
          especialidadAnterior: prestadorExistente?.especialidad,
          especialidadNueva: formData.especialidad,
          comentariosAnteriores: prestadorExistente?.comentarios,
          comentariosNuevos: formData.comentarios
        });

        showToast("Prestador actualizado correctamente", "success");
      } else {
        const dataAEnviar = {
          ...formData,
          fechaRegistro: new Date(),
          registradoPor: userData?.nombreCompleto || 'Usuario'
        };

        const docRef = await addDoc(collection(db, COL_BASE), dataAEnviar);

        await registrarLog(docRef.id, 'CREACION', {
          nombre: formData.nombre,
          especialidad: formData.especialidad,
          comentarios: formData.comentarios
        });

        showToast("Prestador registrado correctamente", "success");
      }
      setFormData({ nombre: '', especialidad: '', comentarios: '' });
      setEditingId(null);
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    }
  };

  const handleDelete = (id) => {
    const prestadorAEliminar = prestadores.find(p => p.id === id);

    confirmAction(
      "Eliminar Prestador",
      "¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.",
      async () => {
        try {
          await registrarLog(id, 'ELIMINACION', {
            nombre: prestadorAEliminar?.nombre || '',
            especialidad: prestadorAEliminar?.especialidad || ''
          });

          await deleteDoc(doc(db, COL_BASE, id));

          showToast("Prestador eliminado correctamente", "info");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  const iniciarEdicion = (p) => {
    setEditingId(p.id);
    setFormData({ nombre: p.nombre, especialidad: p.especialidad || '', comentarios: p.comentarios || '' });
  };

  const abrirHistorialLogs = async (prestador) => {
    setSelectedPrestadorForLog(prestador);
    setShowLogModal(true);
    setLoadingLogs(true);

    try {
      const q = query(
        collection(db, COL_BASE, prestador.id, "logs"),
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

  const prestadoresFiltrados = prestadores.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.especialidad && p.especialidad.toLowerCase().includes(busqueda.toLowerCase())) ||
    (p.comentarios && p.comentarios.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 px-3 py-2 flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <Stethoscope size={14} className="text-[#2383C2]" /> {editingId ? "EDITAR PRESTADOR" : "REGISTRO DE PRESTADORES"}
      </h2>

      {hasPermission(PATH_VISTA, "formulario_registro") && (
        <form onSubmit={handleGuardar} className="px-3 py-2 flex flex-wrap items-end gap-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20">
          {hasPermission(PATH_VISTA, "formulario_registro", "input_nombre") && (
            <div className="w-[220px]">
              <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Nombre del Prestador</label>
              <input required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="Ej: Dr. Juan Pérez" />
            </div>
          )}

          {hasPermission(PATH_VISTA, "formulario_registro", "input_especialidad") && (
            <div className="w-[180px]">
              <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Especialidad</label>
              <input required value={formData.especialidad} onChange={e => setFormData({ ...formData, especialidad: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="Ej: Cardiología" />
            </div>
          )}

          {hasPermission(PATH_VISTA, "formulario_registro", "input_comentarios") && (
            <div className="w-[220px]">
              <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Comentarios Extras</label>
              <input value={formData.comentarios} onChange={e => setFormData({ ...formData, comentarios: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="Ej: Turnos matutinos" />
            </div>
          )}

          {((!editingId && hasPermission(PATH_VISTA, "formulario_registro", "btn_registrar")) ||
            (editingId && hasPermission(PATH_VISTA, "formulario_registro", "btn_actualizar"))) && (
              <button type="submit" className={`h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1.5 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'} text-white transition`}>
                {editingId ? <><Save size={13} /> Actualizar</> : <><Plus size={13} /> Registrar</>}
              </button>
            )}

          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ nombre: '', especialidad: '', comentarios: '' }) }} className="h-7 px-3 bg-gray-200 dark:bg-gray-700 rounded font-bold text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
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
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-7 pl-7 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2] dark:focus:border-[#2383C2]" placeholder="Buscar por nombre, especialidad..." />
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
                {hasPermission(PATH_VISTA, "tabla_datos", "col_especialidad") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Especialidad</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_comentarios") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Comentarios</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_registrador") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Registrado por</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_fecha") && <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha</th>}
                <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {prestadoresFiltrados.map((p, index) => (
                <tr key={p.id} className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold text-center">{index + 1}</td>
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_nombre") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">{p.nombre}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_especialidad") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{p.especialidad}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_comentarios") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 italic">{p.comentarios || 'Sin comentarios'}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_registrador") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400">{p.registradoPor || 'N/A'}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_fecha") && <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400">{formatearFecha(p.fechaRegistro)}</td>}

                  <td className="py-1 px-2 border-b border-gray-200 dark:border-gray-700 text-center">
                    <div className="flex justify-center gap-2">
                      {hasPermission(PATH_VISTA, "tabla_datos", "action_log") && (
                        <button onClick={() => abrirHistorialLogs(p)} title="Ver Historial / Logs" className="text-gray-500 hover:text-[#2383C2] dark:hover:text-[#2383C2] transition">
                          <History size={13} />
                        </button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_datos", "action_editar") && (
                        <button onClick={() => iniciarEdicion(p)} title="Editar" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">
                          <Pencil size={13} />
                        </button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_datos", "action_eliminar") && (
                        <button onClick={() => handleDelete(p.id)} title="Eliminar" className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition">
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

      {/* Backdrop y Panel Lateral Derecha (Drawer) */}
      <div 
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 ${
          showLogModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setShowLogModal(false)}
      />

      <aside 
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ease-in-out text-[11px] ${
          showLogModal ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cabecera Fija del Panel */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50/80 dark:bg-gray-900/80 shrink-0">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="p-1.5 rounded-md bg-[#2383C2]/10 dark:bg-[#2383C2]/20 text-[#2383C2]">
              <History size={16} />
            </div>
            <div className="truncate">
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate">
                Historial de Cambios
              </h3>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                {selectedPrestadorForLog?.nombre}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-semibold">
              {logsList.length} logs
            </span>
            <button 
              onClick={() => setShowLogModal(false)} 
              className="p-1 rounded-md text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contenido con Scroll Vertical */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loadingLogs ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
              <div className="w-6 h-6 border-2 border-[#2383C2] border-t-transparent rounded-full animate-spin mb-2" />
              <p className="text-[10px]">Cargando historial...</p>
            </div>
          ) : logsList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 text-center px-4">
              <History size={32} className="mb-2 opacity-30" />
              <p className="text-[11px] font-medium">Sin registros</p>
              <p className="text-[10px]">No hay actividad documentada para este prestador.</p>
            </div>
          ) : (
            logsList.map((log) => (
              <div key={log.id} className="p-3 border border-gray-200 dark:border-gray-700/80 rounded-lg bg-gray-50/50 dark:bg-gray-900/30 text-[10px] space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                    log.accion === 'CREACION' ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' :
                    log.accion === 'EDICION' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' :
                    'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                  }`}>
                    {log.accion}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-[9px] font-mono">
                    {formatearFecha(log.fecha)}
                  </span>
                </div>

                <p className="text-gray-700 dark:text-gray-300 font-semibold">
                  Usuario: <span className="font-normal text-gray-600 dark:text-gray-400">{log.usuario}</span>
                </p>

                <div className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-2 rounded border border-gray-200/80 dark:border-gray-700 text-[10px]">
                  {log.accion === 'CREACION' && (
                    <div className="space-y-1">
                      <p><strong className="text-gray-500 dark:text-gray-400">Nombre:</strong> {log.detalles?.nombre}</p>
                      <p><strong className="text-gray-500 dark:text-gray-400">Especialidad:</strong> {log.detalles?.especialidad}</p>
                      <p><strong className="text-gray-500 dark:text-gray-400">Comentarios:</strong> {log.detalles?.comentarios || 'N/A'}</p>
                    </div>
                  )}

                  {log.accion === 'EDICION' && (
                    <ul className="space-y-1">
                      {log.detalles?.nombreAnterior !== log.detalles?.nombreNuevo && (
                        <li className="flex flex-col gap-0.5">
                          <span className="text-gray-400 text-[9px] font-bold">Nombre</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-red-500 dark:text-red-400 font-medium">{log.detalles?.nombreAnterior}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">{log.detalles?.nombreNuevo}</span>
                          </div>
                        </li>
                      )}
                      {log.detalles?.especialidadAnterior !== log.detalles?.especialidadNueva && (
                        <li className="flex flex-col gap-0.5">
                          <span className="text-gray-400 text-[9px] font-bold">Especialidad</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-red-500 dark:text-red-400 font-medium">{log.detalles?.especialidadAnterior}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">{log.detalles?.especialidadNueva}</span>
                          </div>
                        </li>
                      )}
                      {log.detalles?.comentariosAnteriores !== log.detalles?.comentariosNuevos && (
                        <li className="flex flex-col gap-0.5">
                          <span className="text-gray-400 text-[9px] font-bold">Comentarios</span>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-red-500 dark:text-red-400 font-medium">{log.detalles?.comentariosAnteriores || 'Ninguno'}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">{log.detalles?.comentariosNuevos || 'Ninguno'}</span>
                          </div>
                        </li>
                      )}
                    </ul>
                  )}

                  {log.accion === 'ELIMINACION' && (
                    <p className="text-red-500 dark:text-red-400 font-medium">
                      Registro eliminado ({log.detalles?.nombre} - {log.detalles?.especialidad})
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pie Fijo del Panel */}
        <div className="px-4 py-2.5 border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900/80 shrink-0">
          <button 
            onClick={() => setShowLogModal(false)} 
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-bold transition"
          >
            Cerrar
          </button>
        </div>
      </aside>
    </div>
  );
};

export default PrestadoresMaestros;