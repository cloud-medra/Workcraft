import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Trash2, User, AtSign, Loader2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useModal } from '../../../context/ModalContext';

const ListadoUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
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

  return (
    <div className="max-w-5xl">
      <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        <User className="text-[#0E5B6D]" /> Listado de Usuarios
      </h3>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Nombre</th>
              <th className="p-4 font-semibold text-gray-600">Usuario</th>
              <th className="p-4 font-semibold text-gray-600">Email</th>
              <th className="p-4 font-semibold text-gray-600">Rol</th>
              <th className="p-4 font-semibold text-gray-600 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="5" className="p-12 text-center text-gray-400">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="animate-spin" size={20} /> Cargando usuarios...
                  </div>
                </td>
              </tr>
            ) : (
              usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="p-4 font-bold text-gray-800">{u.nombreCompleto}</td>
                  <td className="p-4">
                    <span className="flex items-center gap-1 text-gray-500 font-medium">
                      <AtSign size={14} className="text-[#0E5B6D]" /> {u.nombreUsuario}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{u.email}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded-full bg-[#0E5B6D]/10 text-[#0E5B6D] text-[10px] font-bold uppercase tracking-wider border border-[#0E5B6D]/20">
                      {u.rol}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => handleDelete(u.id, u.nombreCompleto)}
                      className="text-red-400 hover:text-red-600 transition"
                    >
                      <Trash2 size={18} />
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