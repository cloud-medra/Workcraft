import React, { useState, useEffect } from 'react';
import { db, auth } from '../../../../firebaseConfig';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { 
  Send, PlusCircle, CheckSquare, AlignLeft, 
  Trash2, Edit2, Plus, X, ArrowUp, ArrowDown 
} from 'lucide-react';

import { useToast } from '../../../../context/ToastContext';
import ModalConfirm from '../../../../components/ui/ModalConfirm';
import Spinner from '../../../../components/ui/Spinner';

const NotasAdmin = ({ userData }) => {
  const { showToast } = useToast();

  const [tipo, setTipo] = useState('texto');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');
  const [items, setItems] = useState(['']);
  const [cargando, setCargando] = useState(false);
  const [cargandoNotas, setCargandoNotas] = useState(true);
  const [editandoId, setEditandoId] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idParaEliminar, setIdParaEliminar] = useState(null);
  const [notas, setNotas] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'administracion_notas'), orderBy('orden', 'asc'));
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const docs = snapshot.docs.map((d, index) => ({
          id: d.id,
          ...d.data(),
          orden: d.data().orden !== undefined ? d.data().orden : index
        }));
        setNotas(docs);
        setCargandoNotas(false);
      },
      (error) => {
        console.error('Error al escuchar notas:', error);
        setCargandoNotas(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleItemChange = (index, value) => {
    const nuevosItems = [...items];
    nuevosItems[index] = value;
    setItems(nuevosItems);
  };

  const agregarItem = () => setItems([...items, '']);
  const eliminarItem = (index) => setItems(items.filter((_, i) => i !== index));

  const resetFormulario = () => {
    setTitulo('');
    setContenido('');
    setItems(['']);
    setTipo('texto');
    setEditandoId(null);
  };

  const moverNota = async (index, direccion) => {
    const nuevoIndex = direccion === 'arriba' ? index - 1 : index + 1;
    if (nuevoIndex < 0 || nuevoIndex >= notas.length) return;

    const notaActual = notas[index];
    const notaDestino = notas[nuevoIndex];

    const ordenActual = typeof notaActual.orden === 'number' ? notaActual.orden : index;
    const ordenDestino = typeof notaDestino.orden === 'number' ? notaDestino.orden : nuevoIndex;

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, 'administracion_notas', notaActual.id), { orden: ordenDestino });
      batch.update(doc(db, 'administracion_notas', notaDestino.id), { orden: ordenActual });
      await batch.commit();
    } catch (error) {
      console.error('Error al reordenar:', error);
      showToast('Error al cambiar la posición', 'error');
    }
  };

  const handleGuardarNota = async (e) => {
    e.preventDefault();

    const autorNombre =
      userData?.nombreCompleto ||
      userData?.nombre ||
      userData?.displayName ||
      auth.currentUser?.displayName ||
      auth.currentUser?.nombreCompleto ||
      'Administrador';

    if (tipo === 'texto' && !contenido.trim()) return;
    if (tipo === 'checklist' && items.filter((i) => i.trim()).length === 0) return;

    setCargando(true);

    try {
      if (editandoId) {
        const payloadActualizacion = {
          titulo: titulo.trim(),
          tipo,
          ...(tipo === 'texto'
            ? { contenido: contenido.trim(), items: [] }
            : {
                contenido: '',
                items: items
                  .filter((i) => i.trim())
                  .map((texto) => ({ texto: texto.trim(), completado: false })),
              }),
        };
        await updateDoc(doc(db, 'administracion_notas', editandoId), payloadActualizacion);
        showToast('Nota actualizada con éxito', 'success');
      } else {
        const batch = writeBatch(db);
        
        notas.forEach((n, idx) => {
          const ordenValido = typeof n.orden === 'number' ? n.orden : idx;
          batch.update(doc(db, 'administracion_notas', n.id), { orden: ordenValido + 1 });
        });

        const nuevaNotaRef = doc(collection(db, 'administracion_notas'));
        batch.set(nuevaNotaRef, {
          titulo: titulo.trim(),
          tipo,
          autor: autorNombre,
          fecha: serverTimestamp(),
          orden: 0,
          ...(tipo === 'texto'
            ? { contenido: contenido.trim() }
            : {
                items: items
                  .filter((i) => i.trim())
                  .map((texto) => ({ texto: texto.trim(), completado: false })),
              }),
        });

        await batch.commit();
        showToast('Nota publicada correctamente', 'success');
      }
      resetFormulario();
    } catch (error) {
      console.error('Error al guardar:', error);
      showToast('Ocurrió un error al guardar', 'error');
    } finally {
      setCargando(false);
    }
  };

  const handleEditar = (nota) => {
    setEditandoId(nota.id);
    setTipo(nota.tipo || 'texto');
    setTitulo(nota.titulo || '');
    if (nota.tipo === 'checklist') {
      setItems(nota.items?.map((i) => i.texto) || ['']);
      setContenido('');
    } else {
      setContenido(nota.contenido || '');
      setItems(['']);
    }
  };

  const solicitarEliminacion = (id) => {
    setIdParaEliminar(id);
    setIsModalOpen(true);
  };

  const handleConfirmarEliminar = async () => {
    if (!idParaEliminar) return;

    try {
      await deleteDoc(doc(db, 'administracion_notas', idParaEliminar));
      showToast('Nota eliminada correctamente', 'success');
    } catch (error) {
      console.error('Error al eliminar:', error);
      showToast('Error al eliminar la nota', 'error');
    } finally {
      setIdParaEliminar(null);
    }
  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="lg:col-span-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col gap-4">
        <div className="border-b border-gray-100 dark:border-gray-700 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-100 uppercase tracking-wide flex items-center gap-2">
              <PlusCircle size={16} className="text-[#2383C2]" />
              {editandoId ? 'Editar Nota' : 'Administrador de Notas'}
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {editandoId ? 'Modifica los campos deseados' : 'Crea notas de texto o listas interactivas para el panel.'}
            </p>
          </div>
          {editandoId && (
            <button
              onClick={resetFormulario}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
              title="Cancelar edición"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {!editandoId && (
          <div className="grid grid-cols-2 gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setTipo('texto')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded transition-all ${
                tipo === 'texto'
                  ? 'bg-white dark:bg-gray-800 text-[#2383C2] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <AlignLeft size={14} /> Texto Libre
            </button>
            <button
              type="button"
              onClick={() => setTipo('checklist')}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold rounded transition-all ${
                tipo === 'checklist'
                  ? 'bg-white dark:bg-gray-800 text-[#2383C2] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <CheckSquare size={14} /> Checklist
            </button>
          </div>
        )}

        <form onSubmit={handleGuardarNota} className="flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
              Título (Opcional)
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Tareas pendientes / Aviso"
              className="w-full text-xs p-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
            />
          </div>

          {tipo === 'texto' ? (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Contenido
              </label>
              <textarea
                rows={4}
                value={contenido}
                onChange={(e) => setContenido(e.target.value)}
                placeholder="Escribe el mensaje..."
                required
                className="w-full text-xs p-2 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Elementos de la lista
              </label>
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => handleItemChange(idx, e.target.value)}
                      placeholder={`Tarea ${idx + 1}`}
                      className="w-full text-xs p-1.5 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-200 focus:outline-none focus:border-[#2383C2]"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarItem(idx)}
                        className="text-gray-400 hover:text-rose-500 p-1"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={agregarItem}
                className="mt-2 text-[11px] text-[#2383C2] hover:underline font-semibold flex items-center gap-1"
              >
                <Plus size={12} /> Añadir elemento
              </button>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-2">
            {editandoId && (
              <button
                type="button"
                onClick={resetFormulario}
                disabled={cargando}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold px-3 py-2 rounded"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={cargando}
              className="bg-[#2383C2] hover:bg-[#1b6aa0] text-white text-xs font-bold px-4 py-2 rounded flex items-center gap-2 transition-colors disabled:opacity-50 min-w-[120px] justify-center"
            >
              {cargando ? (
                <>
                  <Spinner size="sm" color="#ffffff" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>{editandoId ? 'Guardar Cambios' : 'Publicar Nota'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="lg:col-span-7 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide">
            Notas Publicadas ({notas.length})
          </span>
        </div>

        <div className="flex flex-col gap-2.5 max-h-[380px] overflow-y-auto pr-1">
          {cargandoNotas ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
              <Spinner size="md" color="#2383C2" />
              <span className="text-xs">Cargando notas...</span>
            </div>
          ) : notas.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-8">
              No hay notas publicadas en el sistema.
            </p>
          ) : (
            notas.map((nota, idx) => (
              <div
                key={nota.id}
                className={`p-3 border rounded-lg flex flex-col gap-1.5 transition-all ${
                  editandoId === nota.id
                    ? 'border-[#2383C2] bg-sky-50/30 dark:bg-sky-950/20'
                    : 'border-gray-100 dark:border-gray-700/60 bg-gray-50 dark:bg-gray-900/40 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {nota.tipo === 'checklist' ? (
                      <CheckSquare size={14} className="text-[#2383C2] shrink-0" />
                    ) : (
                      <AlignLeft size={14} className="text-[#2383C2] shrink-0" />
                    )}
                    {nota.titulo && (
                      <h4 className="text-xs font-bold text-gray-800 dark:text-gray-100">
                        {nota.titulo}
                      </h4>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <div className="flex items-center bg-gray-200/60 dark:bg-gray-700/60 rounded mr-1">
                      <button
                        onClick={() => moverNota(idx, 'arriba')}
                        disabled={idx === 0}
                        className="p-1 text-gray-500 dark:text-gray-300 hover:text-[#2383C2] disabled:opacity-25 disabled:hover:text-gray-500 transition-colors"
                        title="Mover arriba"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        onClick={() => moverNota(idx, 'abajo')}
                        disabled={idx === notas.length - 1}
                        className="p-1 text-gray-500 dark:text-gray-300 hover:text-[#2383C2] disabled:opacity-25 disabled:hover:text-gray-500 transition-colors"
                        title="Mover abajo"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    <button
                      onClick={() => handleEditar(nota)}
                      className="p-1 text-gray-400 hover:text-[#2383C2] dark:hover:text-sky-400 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => solicitarEliminacion(nota.id)}
                      className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {nota.tipo === 'checklist' ? (
                  <ul className="flex flex-col gap-1 pl-1">
                    {nota.items?.map((item, i) => (
                      <li key={i} className="text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        <span>{item.texto}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11.5px] text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {nota.contenido}
                  </p>
                )}

                <div className="flex items-center justify-between border-t border-gray-200/50 dark:border-gray-700/50 pt-1.5 mt-1 text-[9px] text-gray-400 dark:text-gray-500">
                  <span>Por: {nota.autor}</span>
                  {nota.fecha?.seconds && (
                    <span>{new Date(nota.fecha.seconds * 1000).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ModalConfirm
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleConfirmarEliminar}
        title="¿Eliminar nota?"
        message="Esta acción no se puede deshacer. La nota se eliminará permanentemente."
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
};

export default NotasAdmin;