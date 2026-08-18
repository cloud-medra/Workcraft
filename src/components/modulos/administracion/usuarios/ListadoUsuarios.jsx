import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { Trash2, User, AtSign, Loader2, Search } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';

const ListadoUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { confirmAction } = useModal();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "usuarios"), (snapshot) => {
      const listaUsuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(listaUsuarios);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = (id, nombre) => {
    confirmAction(
      "Eliminar Usuario",
      `¿Estás seguro de eliminar a ${nombre}? Esta acción no se puede deshacer.`,
      async () => {
        try {
          await deleteDoc(doc(db, "usuarios", id));
          showToast("Usuario eliminado correctamente.", "success");
        } catch (error) {
          showToast("Error al eliminar usuario.", "error");
        }
      }
    );
  };

  const usuariosFiltrados = usuarios.filter(u =>
    u.nombreCompleto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.nombreUsuario?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0">
      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 p-4 flex items-center gap-2 border-b border-gray-200 dark:border-gray-700">
        <User size={16} className="text-[#2383C2]" /> LISTADO Y CONTROL DE USUARIOS
      </h2>

      <div className="bg-gray-50 dark:bg-gray-800/40 p-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2 text-gray-400 dark:text-gray-500" size={14} />
          <input 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
            className="w-full h-8 pl-8 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[12px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2] dark:focus:border-[#2383C2] transition-colors" 
            placeholder="Buscar por nombre, usuario o email..." 
          />
        </div>
      </div>

      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[11px]">
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-10">#</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Nombre Completo</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Usuario</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Email</th>
              <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Rol</th>
              <th className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="p-12 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex justify-center items-center gap-2 text-[12px]">
                    <Loader2 className="animate-spin text-[#2383C2]" size={16} /> Cargando lista de usuarios...
                  </div>
                </td>
              </tr>
            ) : usuariosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-12 text-center text-gray-400 dark:text-gray-500 text-[12px]">
                  No se encontraron usuarios que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              usuariosFiltrados.map((u, index) => (
                <tr 
                  key={u.id} 
                  className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
                >
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold">{index + 1}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">{u.nombreCompleto}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                    <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                      <AtSign size={12} className="text-[#2383C2]/70" /> {u.nombreUsuario}
                    </span>
                  </td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{u.email}</td>
                  <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70">
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      {u.rol}
                    </span>
                  </td>
                  <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center">
                    <button
                      onClick={() => handleDelete(u.id, u.nombreCompleto)}
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
                      title="Eliminar Usuario"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListadoUsuarios;