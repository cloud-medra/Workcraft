import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Microscope, Plus, Trash2, Search, Pencil, Save, X } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useModal } from '../../../context/ModalContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';

const Laboratorios = () => {
  const [laboratorios, setLaboratorios] = useState([]);
  const [formData, setFormData] = useState({ nombre: '', rut: '', estado: 'ACTIVO' });
  const [busqueda, setBusqueda] = useState('');
  const [editingId, setEditingId] = useState(null);

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
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.rut.trim()) {
      return showToast("Nombre y RUT son obligatorios", "error");
    }

    const dataAEnviar = {
      ...formData,
      rut: formatearRut(formData.rut),
      fechaRegistro: editingId ? (laboratorios.find(l => l.id === editingId)?.fechaRegistro || new Date()) : new Date(),
      registradoPor: userData?.nombreCompleto || 'Usuario'
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "laboratorio_empresas", editingId), dataAEnviar);
        showToast("Laboratorio actualizado correctamente", "success");
      } else {
        await addDoc(collection(db, "laboratorio_empresas"), dataAEnviar);
        showToast("Laboratorio registrado correctamente", "success");
      }
      setFormData({ nombre: '', rut: '', estado: 'ACTIVO' });
      setEditingId(null);
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    }
  };

  const handleDelete = (id) => {
    confirmAction(
      "Eliminar Laboratorio",
      "¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteDoc(doc(db, "laboratorio_empresas", id));
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

  const laboratoriosFiltrados = laboratorios.filter(l =>
    l.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (l.rut && l.rut.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0">
      <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
        <Microscope size={16} className="text-[#0E5B6D]" /> {editingId ? "EDITAR LABORATORIO" : "REGISTRO DE LABORATORIOS"}
      </h2>

      {hasPermission(PATH_VISTA, "formulario_registro") && (
        <form onSubmit={handleGuardar} className="p-4 flex flex-wrap items-end gap-4 border-b border-gray-200">
          {hasPermission(PATH_VISTA, "formulario_registro", "input_nombre") && (
            <div className="w-[300px]">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre Laboratorio</label>
              <input required value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#0E5B6D]" placeholder="Ej: Laboratorio Central" />
            </div>
          )}

          {hasPermission(PATH_VISTA, "formulario_registro", "input_rut") && (
            <div className="w-[200px]">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">RUT</label>
              <input required value={formData.rut} onChange={e => setFormData({ ...formData, rut: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#0E5B6D]" placeholder="Ej: 123456789" />
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
            <button type="button" onClick={() => { setEditingId(null); setFormData({ nombre: '', rut: '', estado: 'ACTIVO' }) }} className="h-8 px-4 bg-gray-200 rounded font-bold text-[12px] text-gray-600 flex items-center gap-2">
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
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none" placeholder="Buscar por nombre o rut..." />
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
                {hasPermission(PATH_VISTA, "tabla_datos", "col_rut") && <th className="p-3 border-b border-r border-gray-200">RUT</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_estado") && <th className="p-3 border-b border-r border-gray-200">Estado</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_registrador") && <th className="p-3 border-b border-r border-gray-200">Registrado por</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_fecha") && <th className="p-3 border-b border-r border-gray-200">Fecha</th>}
                <th className="p-3 border-b border-gray-200 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {laboratoriosFiltrados.map((l, index) => (
                <tr key={l.id} className="border-l-4 border-transparent hover:border-[#0E5B6D] hover:bg-gray-50">
                  <td className="p-3 border-b border-r border-gray-200 text-gray-500 font-bold">{index + 1}</td>
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_nombre") && <td className="p-3 border-b border-r border-gray-200 text-gray-700 font-medium">{l.nombre}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_rut") && <td className="p-3 border-b border-r border-gray-200 text-gray-600">{l.rut}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_estado") && (
                    <td className="p-3 border-b border-r border-gray-200">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${l.estado === 'INACTIVO' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {l.estado || 'ACTIVO'}
                      </span>
                    </td>
                  )}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_registrador") && <td className="p-3 border-b border-r border-gray-200 text-gray-500">{l.registradoPor || 'N/A'}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_fecha") && <td className="p-3 border-b border-r border-gray-200 text-gray-500">{formatearFecha(l.fechaRegistro)}</td>}

                  <td className="p-3 border-b border-gray-200 text-center">
                    <div className="flex justify-center gap-3">
                      {hasPermission(PATH_VISTA, "tabla_datos", "action_editar") && (
                        <button onClick={() => iniciarEdicion(l)} className="text-blue-600 hover:text-blue-800"><Pencil size={15} /></button>
                      )}
                      {hasPermission(PATH_VISTA, "tabla_datos", "action_eliminar") && (
                        <button onClick={() => handleDelete(l.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
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

export default Laboratorios;