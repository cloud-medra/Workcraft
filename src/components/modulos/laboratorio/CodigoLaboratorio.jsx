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

  const inputClass = "w-full h-8 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[11px] outline-none focus:border-[#2383C2]";
  const labelClass = "block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1";

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-5">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[15px]">Procesando...</h3>
          </div>
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 p-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <Package size={16} className="text-[#2383C2]" /> {editingId ? "EDITAR CÓDIGO" : "GESTIÓN DE CÓDIGOS"}
      </h2>

      {hasPermission(PATH_VISTA, "formulario", "ver_seccion") && (
        <form onSubmit={handleGuardar} className="p-4 flex flex-wrap items-end gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {hasPermission(PATH_VISTA, "formulario", "input_referencia") && (
            <div className="w-[130px]">
              <label className={labelClass}>Referencia</label>
              <input required value={formData.referencia} onChange={e => setFormData({ ...formData, referencia: e.target.value.toUpperCase() })} className={`${inputClass} uppercase`} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_codigo") && (
            <div className="w-[130px]">
              <label className={labelClass}>Código</label>
              <input required value={formData.codigo} onChange={e => setFormData({ ...formData, codigo: e.target.value })} className={inputClass} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_precio") && (
            <div className="w-[130px]">
              <label className={labelClass}>Precio</label>
              <input type="number" required value={formData.precio} onChange={e => setFormData({ ...formData, precio: e.target.value })} className={inputClass} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "input_descripcion") && (
            <div className="flex-1 min-w-[180px]">
              <label className={labelClass}>Descripción</label>
              <input value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value.toUpperCase() })} className={`${inputClass} uppercase`} />
            </div>
          )}
          {hasPermission(PATH_VISTA, "formulario", "btn_registrar") && (
            <button type="submit" className={`h-8 px-4 rounded font-bold text-[12px] flex items-center gap-2 whitespace-nowrap shrink-0 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'} text-white transition`}>
              {editingId ? <><Save size={14} /> Actualizar</> : <><Plus size={14} /> Registrar</>}
            </button>
          )}
          {editingId && hasPermission(PATH_VISTA, "formulario", "btn_cancelar") && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ referencia: '', codigo: '', precio: '', descripcion: '' }) }} className="h-8 px-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded font-bold text-[12px] text-gray-600 dark:text-gray-300 flex items-center gap-2 transition">
              <X size={14} /> Cancelar
            </button>
          )}
        </form>
      )}

      {hasPermission(PATH_VISTA, "busqueda", "barra_busqueda") && (
        <div className="bg-gray-50 dark:bg-gray-800/30 p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          {hasPermission(PATH_VISTA, "busqueda", "input_busqueda") && (
            <div className="relative w-72">
              <Search className="absolute left-2 top-2.5 text-gray-400 dark:text-gray-500" size={13} />
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
            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10 text-gray-600 dark:text-gray-400 uppercase font-bold">
              <tr>
                {hasPermission(PATH_VISTA, "tabla", "col_referencia") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[150px]">Referencia</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_codigo") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[150px]">Código</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_descripcion") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Descripción</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_precio") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[140px]">Precio</th>}
                {hasPermission(PATH_VISTA, "tabla", "col_acciones") && <th className="p-3 border-b border-gray-200 dark:border-gray-700 w-[90px] text-center">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {codigosFiltrados.map((c) => (
                <tr key={c.id} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  {hasPermission(PATH_VISTA, "tabla", "col_referencia") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-700 dark:text-gray-200">{c.referencia}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_codigo") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400">{c.codigo}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_descripcion") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 truncate">{c.descripcion}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_precio") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-[#2383C2] whitespace-nowrap">$ {Number(c.precio).toLocaleString('es-CL')}</td>}
                  {hasPermission(PATH_VISTA, "tabla", "col_acciones") && (
                    <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                      <div className="flex justify-center gap-3">
                        {hasPermission(PATH_VISTA, "tabla", "btn_editar") && (
                          <button onClick={() => { setEditingId(c.id); setFormData(c); }} className="text-gray-400 hover:text-blue-600 transition inline-flex items-center justify-center p-1">
                            <Pencil size={14} />
                          </button>
                        )}
                        {hasPermission(PATH_VISTA, "tabla", "btn_eliminar") && (
                          <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500 transition inline-flex items-center justify-center p-1">
                            <Trash2 size={14} />
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
    </div>
  );
};

export default CodigoLaboratorio;