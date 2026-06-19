import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Handshake, Plus, Trash2, Search, Pencil, Save, X } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useModal } from '../../../context/ModalContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';

const Convenios = () => {
  const [convenios, setConvenios] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', estado: 'ACTIVO' });
  const [busqueda, setBusqueda] = useState('');
  const [editingId, setEditingId] = useState(null);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/maestros/convenios";

  useEffect(() => {
    const q = query(collection(db, "maestros_convenios"), orderBy("fechaRegistro", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setConvenios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const formatearFecha = (fecha) => {
    if (!fecha) return 'N/A';
    const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return showToast("El nombre del convenio es obligatorio", "error");

    try {
      if (editingId) {
        await updateDoc(doc(db, "maestros_convenios", editingId), formData);
        showToast("Convenio actualizado correctamente", "success");
      } else {
        await addDoc(collection(db, "maestros_convenios"), {
          ...formData,
          fechaRegistro: new Date(),
          registradoPor: userData?.nombreCompleto || 'Usuario'
        });
        showToast("Convenio registrado correctamente", "success");
      }
      setFormData({ nombre: '', estado: 'ACTIVO' });
      setEditingId(null);
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    }
  };

  const handleDelete = (id) => {
    confirmAction(
      "Eliminar Convenio",
      "¿Estás seguro de eliminar este convenio? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteDoc(doc(db, "maestros_convenios", id));
          showToast("Convenio eliminado correctamente", "info");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  const iniciarEdicion = (m) => {
    setEditingId(m.id);
    setFormData({ nombre: m.nombre, estado: m.estado || 'ACTIVO' });
  };

  const conveniosFiltrados = convenios.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0">
      <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
        <Handshake size={16} className="text-[#0E5B6D]" /> {editingId ? "EDITAR CONVENIO" : "REGISTRO DE CONVENIOS"}
      </h2>

      {hasPermission(PATH_VISTA, "formulario_registro") && (
        <form onSubmit={handleGuardar} className="p-4 flex flex-wrap items-end gap-4 border-b border-gray-200">
          {hasPermission(PATH_VISTA, "formulario_registro", "input_nombre") && (
            <div className="w-[300px]">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre del Convenio</label>
              <input required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#0E5B6D]" />
            </div>
          )}

          {editingId && hasPermission(PATH_VISTA, "formulario_registro", "select_estado") && (
            <div className="w-[120px]">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Estado</label>
              <select value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none">
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          )}

          {((!editingId && hasPermission(PATH_VISTA, "formulario_registro", "btn_registrar")) ||
            (editingId && hasPermission(PATH_VISTA, "formulario_registro", "btn_actualizar"))) && (
              <button type="submit" className={`h-8 px-4 rounded font-bold text-[12px] flex items-center gap-2 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#3b4a6b] hover:bg-[#2d3a56]'} text-white`}>
                {editingId ? <><Save size={14} /> Actualizar</> : <><Plus size={14} /> Registrar</>}
              </button>
            )}

          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ nombre: '', estado: 'ACTIVO' }) }} className="h-8 px-4 bg-gray-200 rounded font-bold text-[12px] text-gray-600 flex items-center gap-2">
              <X size={14} /> Cancelar
            </button>
          )}
        </form>
      )}

      {hasPermission(PATH_VISTA, "barra_busqueda") && (
        <div className="bg-gray-50 p-3 flex justify-between items-center border-b border-gray-200">
          {hasPermission(PATH_VISTA, "barra_busqueda", "input_buscar") && (
            <div className="relative w-72">
              <Search className="absolute left-2 top-2 text-gray-400" size={14} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none" placeholder="Buscar convenio..." />
            </div>
          )}
        </div>
      )}

      {hasPermission(PATH_VISTA, "tabla_datos") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr className="text-gray-600 uppercase font-bold text-[11px]">
                <th className="p-3 border-b border-r border-gray-200 w-10">#</th>
                {hasPermission(PATH_VISTA, "tabla_datos", "col_nombre") && <th className="p-3 border-b border-r border-gray-200">Nombre</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_estado") && <th className="p-3 border-b border-r border-gray-200">Estado</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_registrador") && <th className="p-3 border-b border-r border-gray-200">Registrado por</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_fecha") && <th className="p-3 border-b border-r border-gray-200">Fecha</th>}
                <th className="p-3 border-b border-gray-200 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {conveniosFiltrados.map((c, index) => (
                <tr key={c.id} className="border-l-4 border-transparent hover:border-[#0E5B6D] hover:bg-gray-50">
                  <td className="p-3 border-b border-r border-gray-200 text-gray-500 font-bold">{index + 1}</td>
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_nombre") && <td className="p-3 border-b border-r border-gray-200 text-gray-700 font-medium">{c.nombre}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_estado") && (
                    <td className="p-3 border-b border-r border-gray-200">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${c.estado === 'INACTIVO' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {c.estado || 'ACTIVO'}
                      </span>
                    </td>
                  )}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_registrador") && <td className="p-3 border-b border-r border-gray-200 text-gray-500">{c.registradoPor || 'N/A'}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_fecha") && <td className="p-3 border-b border-r border-gray-200 text-gray-500">{formatearFecha(c.fechaRegistro)}</td>}

                  <td className="p-3 border-b border-gray-200 text-center">
                    <div className="flex justify-center gap-3">
                      {hasPermission(PATH_VISTA, "tabla_datos", "action_editar") && (
                        <button onClick={() => iniciarEdicion(c)} className="text-blue-600 hover:text-blue-800"><Pencil size={15} /></button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_datos", "action_eliminar") && (
                        <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Convenios;