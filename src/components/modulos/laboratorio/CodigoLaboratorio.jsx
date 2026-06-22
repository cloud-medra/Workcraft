import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Package, Plus, Trash2, Search, Pencil, Save, X } from 'lucide-react';
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

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/laboratorio/codigos";
  const COL_CODIGOS = "laboratorio_codigos";

  useEffect(() => {
    const q = query(collection(db, COL_CODIGOS), orderBy("referencia", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCodigos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formData.referencia || !formData.codigo || !formData.precio) {
      return showToast("Referencia, código y precio son obligatorios", "error");
    }

    setCargando(true);
    const dataAEnviar = {
      ...formData,
      referencia: formData.referencia.toUpperCase(),
      descripcion: formData.descripcion.toUpperCase(),
      precio: Number(formData.precio),
      registradoPor: userData?.nombreCompleto || 'Usuario',
      fechaRegistro: new Date()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, COL_CODIGOS, editingId), dataAEnviar);
        showToast("Código actualizado correctamente", "success");
      } else {
        await addDoc(collection(db, COL_CODIGOS), dataAEnviar);
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
    confirmAction(
      "Eliminar Código",
      "¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteDoc(doc(db, COL_CODIGOS, id));
          showToast("Código eliminado correctamente", "info");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  const codigosFiltrados = codigos.filter(c =>
    c.referencia?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.descripcion?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0 relative">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
          <Spinner size="md" />
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
        <Package size={16} className="text-[#2383C2]" /> {editingId ? "EDITAR CÓDIGO" : "GESTIÓN DE CÓDIGOS"}
      </h2>

      {hasPermission(PATH_VISTA, "formulario_registro") && (
        <form onSubmit={handleGuardar} className="p-4 flex flex-wrap items-end gap-4 border-b border-gray-200 bg-gray-50">
          <div className="w-[150px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Referencia</label>
            <input
              required
              value={formData.referencia}
              onChange={e => setFormData({ ...formData, referencia: e.target.value.toUpperCase() })}
              className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#2383C2] uppercase"
            />
          </div>
          <div className="w-[150px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Código</label>
            <input required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#2383C2]" />
          </div>
          <div className="w-[150px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Precio</label>
            <input type="number" required value={formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#2383C2]" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descripción</label>
            <input
              value={formData.descripcion}
              onChange={e => setFormData({ ...formData, descripcion: e.target.value.toUpperCase() })}
              className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#2383C2] uppercase"
            />
          </div>

          <button type="submit" className={`h-8 px-4 rounded font-bold text-[12px] flex items-center gap-2 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#3b4a6b] hover:bg-[#2d3a56]'} text-white`}>
            {editingId ? <><Save size={14} /> Actualizar</> : <><Plus size={14} /> Registrar</>}
          </button>

          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ referencia: '', codigo: '', precio: '', descripcion: '' }) }} className="h-8 px-4 bg-gray-200 rounded font-bold text-[12px] text-gray-600 flex items-center gap-2">
              <X size={14} /> Cancelar
            </button>
          )}
        </form>
      )}

      {hasPermission(PATH_VISTA, "barra_busqueda") && (
        <div className="bg-gray-50 p-3 flex justify-between items-center border-b border-gray-200">
          <div className="relative w-72">
            <Search className="absolute left-2 top-2 text-gray-400" size={14} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none" placeholder="Buscar..." />
          </div>
        </div>
      )}

      {hasPermission(PATH_VISTA, "tabla_datos") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="bg-gray-100 sticky top-0">
              <tr className="text-gray-600 uppercase font-bold text-[11px]">
                <th className="p-3 border-b border-r border-gray-200">Referencia</th>
                <th className="p-3 border-b border-r border-gray-200">Código</th>
                <th className="p-3 border-b border-r border-gray-200">Descripción</th>
                <th className="p-3 border-b border-r border-gray-200">Precio</th>
                <th className="p-3 border-b border-gray-200 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {codigosFiltrados.map((c) => (
                <tr key={c.id} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50 transition-colors">
                  <td className="p-3 border-b border-r border-gray-200 font-bold text-gray-700">{c.referencia}</td>
                  <td className="p-3 border-b border-r border-gray-200">{c.codigo}</td>
                  <td className="p-3 border-b border-r border-gray-200 text-gray-600">{c.descripcion}</td>
                  <td className="p-3 border-b border-r border-gray-200 font-medium text-[#2383C2]">$ {Number(c.precio).toLocaleString('es-CL')}</td>
                  <td className="p-3 border-b border-gray-200 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => { setEditingId(c.id); setFormData(c); }} className="text-blue-600 hover:text-blue-800"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
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

export default CodigoLaboratorio;