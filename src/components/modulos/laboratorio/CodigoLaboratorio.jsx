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

  const PATH_VISTA = "/laboratorio/codigoLaboratorio";
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
      "¿Estás seguro de eliminar este registro?",
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

  const inputClass = "w-full h-8 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-[12px] outline-none focus:border-[#2383C2] dark:focus:border-[#369BCE]";

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative transition-colors">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <Spinner size="md" />
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 p-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <Package size={16} className="text-[#2383C2] dark:text-[#369BCE]" /> {editingId ? "EDITAR CÓDIGO" : "GESTIÓN DE CÓDIGOS"}
      </h2>

      {hasPermission(PATH_VISTA, "formulario", "ver_seccion") && (
        <form onSubmit={handleGuardar} className="p-4 flex flex-wrap items-end gap-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
          {hasPermission(PATH_VISTA, "formulario", "input_referencia") && (
            <div className="w-[150px]">
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Referencia</label>
              <input required value={formData.referencia} onChange={e => setFormData({ ...formData, referencia: e.target.value.toUpperCase() })} className={`${inputClass} uppercase`} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_codigo") && (
            <div className="w-[150px]">
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Código</label>
              <input required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} className={inputClass} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_precio") && (
            <div className="w-[150px]">
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Precio</label>
              <input type="number" required value={formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.value })} className={inputClass} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_descripcion") && (
            <div className="flex-1 min-w-[200px]">
              <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Descripción</label>
              <input value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value.toUpperCase() })} className={`${inputClass} uppercase`} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "btn_registrar") && (
            <button type="submit" className={`h-8 px-4 rounded font-bold text-[12px] flex items-center gap-2 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'} text-white transition-colors`}>
              {editingId ? <><Save size={14} /> Actualizar</> : <><Plus size={14} /> Registrar</>}
            </button>
          )}
          {editingId && hasPermission(PATH_VISTA, "formulario", "btn_cancelar") && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ referencia: '', codigo: '', precio: '', descripcion: '' }) }} className="h-8 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-bold text-[12px] text-gray-600 dark:text-gray-300 flex items-center gap-2 transition-colors">
              <X size={14} /> Cancelar
            </button>
          )}
        </form>
      )}

      {hasPermission(PATH_VISTA, "busqueda", "barra_busqueda") && (
        <div className="bg-gray-50 dark:bg-gray-900/40 p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          {hasPermission(PATH_VISTA, "busqueda", "input_busqueda") && (
            <div className="relative w-72">
              <Search className="absolute left-2 top-2 text-gray-400 dark:text-gray-500" size={14} />
              <input
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="..."
                placeholder="Buscar..."
              />
            </div>
          )}
        </div>
      )}

      {hasPermission(PATH_VISTA, "tabla", "ver_tabla") && (
        <div className="flex-grow overflow-auto bg-white dark:bg-gray-800">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10 text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
              <tr>
                {hasPermission(PATH_VISTA, "tabla", "col_referencia") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Referencia</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_codigo") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Código</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_descripcion") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Descripción</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_precio") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Precio</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_acciones") && <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {codigosFiltrados.map((c) => (
                <tr key={c.id} className="border-l-4 border-transparent hover:border-[#2383C2] dark:hover:border-[#369BCE] hover:bg-gray-50 dark:hover:bg-gray-700/30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 transition-colors">
                  {hasPermission(PATH_VISTA, "tabla", "col_referencia") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200">{c.referencia}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_codigo") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{c.codigo}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_descripcion") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 truncate max-w-[300px]">{c.descripcion}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_precio") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 font-medium text-[#2383C2] dark:text-[#369BCE] whitespace-nowrap">$ {Number(c.precio).toLocaleString('es-CL')}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_acciones") && (
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-3">
                        {hasPermission(PATH_VISTA, "tabla", "btn_editar") && (
                          <button onClick={() => { setEditingId(c.id); setFormData(c); }} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"><Pencil size={15} /></button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla", "btn_eliminar") && (
                          <button onClick={() => handleDelete(c.id)} className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"><Trash2 size={15} /></button>
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
    </div>
  );
};

export default CodigoLaboratorio;