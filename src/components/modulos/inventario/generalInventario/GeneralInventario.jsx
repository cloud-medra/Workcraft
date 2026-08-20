import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  collection,
  onSnapshot,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { Package, Plus, Trash2, Search, Pencil, Save, X, Layers, ChevronDown, Filter } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useModal } from '../../../../context/ModalContext';
import { useUser } from '../../../../context/UserContext';
import { useGranularPermission } from '../../../../hooks/useGranularPermission';
import Spinner from '../../../ui/Spinner';

const GeneralInventario = () => {
  const [cajas, setCajas] = useState([]);
  const [catalogoCodigos, setCatalogoCodigos] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Estados para los filtros avanzados de la tabla
  const [filtros, setFiltros] = useState({
    nombreCaja: '',
    ubicacion: '',
    contenido: ''
  });

  // Estado para la Caja principal
  const [formDataCaja, setFormDataCaja] = useState({
    nombreCaja: '',
    ubicacion: '',
    descripcion: ''
  });

  // Estado para los ítems dentro de la caja
  const [itemsCaja, setItemsCaja] = useState([
    { codigoId: '', codigo: '', tipo: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }
  ]);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const COL_BASE = "inventario_general";
  const COL_MAESTRO_CODIGOS = "maestros_codigos";

  // Cargar cajas de inventario en tiempo real
  useEffect(() => {
    const q = query(collection(db, COL_BASE), orderBy("fechaRegistro", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCajas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Cargar el catálogo desde maestros_codigos
  useEffect(() => {
    const cargarCatalogo = async () => {
      try {
        const snap = await getDocs(query(collection(db, COL_MAESTRO_CODIGOS), orderBy("fechaRegistro", "desc")));
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCatalogoCodigos(lista);
      } catch (error) {
        console.error("Error al cargar el catálogo de códigos:", error);
      }
    };
    cargarCatalogo();
  }, []);

  // Manejador para agregar una nueva línea de ítem
  const agregarLineaItem = () => {
    setItemsCaja([...itemsCaja, { codigoId: '', codigo: '', tipo: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }]);
  };

  // Manejador para eliminar una línea de ítem
  const eliminarLineaItem = (index) => {
    if (itemsCaja.length === 1) {
      return showToast("La caja debe tener al menos un ítem registrado", "error");
    }
    setItemsCaja(itemsCaja.filter((_, i) => i !== index));
  };

  // Actualizar un campo específico de un ítem
  const handleItemChange = (index, campo, valor) => {
    const nuevosItems = [...itemsCaja];
    nuevosItems[index][campo] = valor;
    setItemsCaja(nuevosItems);
  };

  // Seleccionar un ítem del catálogo y auto-completar el precioNeto
  const seleccionarCodigoCatalogo = (index, cat) => {
    const nuevosItems = [...itemsCaja];
    nuevosItems[index] = {
      ...nuevosItems[index],
      codigoId: cat.id,
      codigo: cat.codigo || '',
      tipo: cat.descriptorAuto || cat.tipo || '',
      precio: Number(cat.precioNeto) || Number(cat.precio) || 0
    };
    setItemsCaja(nuevosItems);
  };

  const handleGuardarCaja = async (e) => {
    e.preventDefault();
    if (!formDataCaja.nombreCaja.trim()) {
      return showToast("El nombre de la caja es obligatorio", "error");
    }

    for (const item of itemsCaja) {
      if (!item.tipo.trim() || item.cantidad <= 0) {
        return showToast("Todos los ítems deben tener un tipo/descriptor válido y cantidad mayor a cero", "error");
      }
    }

    setCargando(true);
    try {
      const dataAEnviar = {
        ...formDataCaja,
        items: itemsCaja,
        registradoPor: userData?.nombreCompleto || userData?.nombre || 'Usuario',
        fechaRegistro: editingId ? undefined : serverTimestamp(),
        ultimaModificacion: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, COL_BASE, editingId), dataAEnviar);
        showToast("Caja actualizada correctamente", "success");
      } else {
        await addDoc(collection(db, COL_BASE), dataAEnviar);
        showToast("Caja registrada correctamente", "success");
      }

      limpiarFormulario();
    } catch (error) {
      showToast("Error al guardar la caja: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const limpiarFormulario = () => {
    setFormDataCaja({ nombreCaja: '', ubicacion: '', descripcion: '' });
    setItemsCaja([{ codigoId: '', codigo: '', tipo: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }]);
    setEditingId(null);
  };

  const iniciarEdicion = (caja) => {
    setEditingId(caja.id);
    setFormDataCaja({
      nombreCaja: caja.nombreCaja || '',
      ubicacion: caja.ubicacion || '',
      descripcion: caja.descripcion || ''
    });
    setItemsCaja(caja.items && caja.items.length > 0 ? caja.items : [{ codigoId: '', codigo: '', tipo: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }]);
  };

  const handleDelete = (id) => {
    confirmAction(
      "Eliminar Caja de Inventario",
      "¿Estás seguro de eliminar esta caja y todo su contenido? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteDoc(doc(db, COL_BASE, id));
          showToast("Caja eliminada correctamente", "info");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  // Lógica de filtrado avanzado por cada campo específico
  const cajasFiltradas = cajas.filter(c => {
    const coincideNombre = c.nombreCaja.toLowerCase().includes(filtros.nombreCaja.toLowerCase());
    const coincideUbicacion = (c.ubicacion || '').toLowerCase().includes(filtros.ubicacion.toLowerCase());
    const coincideContenido = !filtros.contenido || c.items?.some(i => 
      i.tipo?.toLowerCase().includes(filtros.contenido.toLowerCase()) || 
      i.codigo?.toLowerCase().includes(filtros.contenido.toLowerCase())
    );

    return coincideNombre && coincideUbicacion && coincideContenido;
  });

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Procesando inventario...</h3>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <Package size={14} className="text-[#2383C2]" />
          {editingId ? "EDITAR CAJA / CONTENEDOR" : "INVENTARIO GENERAL POR CAJAS"}
        </h2>
      </div>

      {/* Formulario Dinámico de Caja y Contenido */}
      <form onSubmit={handleGuardarCaja} className="px-3 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20 flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="w-[220px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Nombre / Código de Caja</label>
            <input required value={formDataCaja.nombreCaja} onChange={e => setFormDataCaja({ ...formDataCaja, nombreCaja: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="Ej: Caja Instrumental #1" />
          </div>
          <div className="w-[180px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Ubicación (Estante/Bodega)</label>
            <input value={formDataCaja.ubicacion} onChange={e => setFormDataCaja({ ...formDataCaja, ubicacion: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="Ej: Estante A-2" />
          </div>
        </div>

        {/* Sección de Ítems Internos con Autocompletado */}
        <div className="border border-gray-200 dark:border-gray-700 rounded p-2 bg-white dark:bg-gray-900">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-gray-700 dark:text-gray-300 uppercase text-[10px] flex items-center gap-1">
              <Layers size={12} className="text-[#2383C2]" /> Contenido de la Caja (Búsqueda por Referencia, Código, Descriptor o Empresa)
            </span>
            <button type="button" onClick={agregarLineaItem} className="text-[10px] bg-blue-50 dark:bg-blue-950/50 text-[#2383C2] px-2 py-1 rounded font-bold hover:bg-blue-100 transition cursor-pointer">
              + Agregar otro ítem
            </button>
          </div>

          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
            {itemsCaja.map((item, index) => (
              <FilaItemAutocompletado
                key={index}
                item={item}
                index={index}
                catalogoCodigos={catalogoCodigos}
                handleItemChange={handleItemChange}
                seleccionarCodigoCatalogo={seleccionarCodigoCatalogo}
                eliminarLineaItem={eliminarLineaItem}
              />
            ))}
          </div>
        </div>

        {/* Botones de acción del formulario */}
        <div className="flex gap-2">
          <button type="submit" className={`h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1.5 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'} text-white transition cursor-pointer`}>
            {editingId ? <><Save size={13} /> Actualizar Caja</> : <><Plus size={13} /> Registrar Caja</>}
          </button>
          {editingId && (
            <button type="button" onClick={limpiarFormulario} className="h-7 px-3 bg-gray-200 dark:bg-gray-700 rounded font-bold text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-gray-300 transition cursor-pointer">
              <X size={13} /> Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Barra de Filtros Avanzados para la Tabla */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2">
        <span className="font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1 mr-1">
          <Filter size={12} className="text-[#2383C2]" /> Filtros:
        </span>
        <div className="relative">
          <Search className="absolute left-2 top-1.5 text-gray-400" size={12} />
          <input
            value={filtros.nombreCaja}
            onChange={e => setFiltros({ ...filtros, nombreCaja: e.target.value })}
            className="w-44 h-6 pl-6 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[10px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            placeholder="Filtrar por Caja..."
          />
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1.5 text-gray-400" size={12} />
          <input
            value={filtros.ubicacion}
            onChange={e => setFiltros({ ...filtros, ubicacion: e.target.value })}
            className="w-40 h-6 pl-6 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[10px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            placeholder="Filtrar por Ubicación..."
          />
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1.5 text-gray-400" size={12} />
          <input
            value={filtros.contenido}
            onChange={e => setFiltros({ ...filtros, contenido: e.target.value })}
            className="w-48 h-6 pl-6 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[10px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
            placeholder="Filtrar por Contenido/Ítem..."
          />
        </div>
        {(filtros.nombreCaja || filtros.ubicacion || filtros.contenido) && (
          <button
            onClick={() => setFiltros({ nombreCaja: '', ubicacion: '', contenido: '' })}
            className="text-[10px] text-red-500 hover:text-red-700 font-semibold px-2 py-0.5 bg-red-50 dark:bg-red-950/40 rounded transition cursor-pointer"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabla Principal */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
            <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8 text-center">#</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-48">Caja / Ubicación</th>
              <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Contenido Detallado</th>
              <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 text-center w-20">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cajasFiltradas.length > 0 ? (
              cajasFiltradas.map((caja, index) => (
                <tr key={caja.id} className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="py-2 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 font-bold text-center align-top">{index + 1}</td>
                  <td className="py-2 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 align-top">
                    <div className="font-bold text-gray-800 dark:text-gray-100">{caja.nombreCaja}</div>
                    <div className="text-gray-400 text-[9px]">Ubicación: {caja.ubicacion || 'No especificada'}</div>
                  </td>
                  <td className="py-2 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 align-top">
                    <div className="flex flex-col gap-1">
                      {caja.items?.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 items-center gap-1 bg-gray-50 dark:bg-gray-800/60 px-2 py-1 rounded border border-gray-200/60 dark:border-gray-700/60 text-[10px]">
                          <div className="col-span-2 font-bold text-emerald-600 dark:text-emerald-400 truncate" title={item.codigo}>
                            {item.codigo ? `[${item.codigo}]` : '-'}
                          </div>
                          <div className="col-span-4 font-bold text-[#2383C2] truncate" title={item.tipo}>
                            {item.tipo}
                          </div>
                          <div className="col-span-2 text-emerald-700 dark:text-emerald-300 font-semibold truncate">
                            Precio: ${Number(item.precio || 0).toLocaleString()}
                          </div>
                          <div className="col-span-1 text-gray-600 dark:text-gray-400 font-semibold">
                            Cant: {item.cantidad}
                          </div>
                          <div className="col-span-1.5 text-gray-500 truncate" title={item.lote}>
                            Lote: {item.lote || 'N/A'}
                          </div>
                          <div className="col-span-1.5 text-gray-500 truncate" title={item.vencimiento}>
                            Venc: {item.vencimiento || 'N/A'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-2 border-b border-gray-200 dark:border-gray-700 text-center align-top">
                    <div className="flex justify-center gap-2 pt-1">
                      <button onClick={() => iniciarEdicion(caja)} title="Editar Caja" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 transition cursor-pointer">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(caja.id)} title="Eliminar Caja" className="text-red-500 hover:text-red-700 transition cursor-pointer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="py-4 text-center text-gray-400 italic text-[10px]">
                  No se encontraron cajas que coincidan con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Sub-componente auxiliar con Portal y campo de Precio Bloqueado con formato de miles
const FilaItemAutocompletado = ({ item, index, catalogoCodigos, handleItemChange, seleccionarCodigoCatalogo, eliminarLineaItem }) => {
  const [textoBusqueda, setTextoBusqueda] = useState(item.tipo || '');
  const [abierto, setAbierto] = useState(false);
  const [coordenadas, setCoordenadas] = useState({ top: 0, left: 0, width: 0 });
  const refInputContainer = useRef(null);

  useEffect(() => {
    setTextoBusqueda(item.tipo || '');
  }, [item.tipo]);

  const abrirDropdown = () => {
    if (refInputContainer.current) {
      const rect = refInputContainer.current.getBoundingClientRect();
      setCoordenadas({
        top: rect.bottom + window.scrollY + 2,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
    setAbierto(true);
  };

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (refInputContainer.current && !refInputContainer.current.contains(e.target)) {
        const dropdownMenu = document.getElementById(`dropdown-portal-${index}`);
        if (!dropdownMenu || !dropdownMenu.contains(e.target)) {
          setAbierto(false);
        }
      }
    };
    document.addEventListener("mousedown", handleClickFuera);
    return () => document.removeEventListener("mousedown", handleClickFuera);
  }, [index]);

  const codigosFiltrados = catalogoCodigos.filter(cat => {
    const queryStr = textoBusqueda.toLowerCase();
    const referencia = (cat.referencia || '').toLowerCase();
    const codigo = (cat.codigo || '').toLowerCase();
    const descriptorAuto = (cat.descriptorAuto || '').toLowerCase();
    const empresa = (cat.empresa || '').toLowerCase();
    
    return referencia.includes(queryStr) || 
           codigo.includes(queryStr) || 
           descriptorAuto.includes(queryStr) || 
           empresa.includes(queryStr);
  });

  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1.5 rounded border border-gray-200 dark:border-gray-700 relative">
      <div className="flex-1 relative" ref={refInputContainer}>
        <div className="flex items-center">
          <input
            required
            placeholder="Buscar por referencia, código, descriptor o empresa..."
            value={textoBusqueda}
            onChange={(e) => {
              setTextoBusqueda(e.target.value);
              handleItemChange(index, 'tipo', e.target.value);
              abrirDropdown();
            }}
            onFocus={abrirDropdown}
            className="w-full h-6 px-1.5 pr-6 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none focus:border-[#2383C2]"
          />
          <button
            type="button"
            onClick={() => {
              if (abierto) setAbierto(false);
              else abrirDropdown();
            }}
            className="absolute right-1 text-gray-400 hover:text-gray-600 cursor-pointer"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {abierto && ReactDOM.createPortal(
          <div
            id={`dropdown-portal-${index}`}
            style={{
              position: 'absolute',
              top: `${coordenadas.top}px`,
              left: `${coordenadas.left}px`,
              width: `${coordenadas.width}px`,
              zIndex: 999999
            }}
            className="max-h-48 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded shadow-2xl"
          >
            {codigosFiltrados.length > 0 ? (
              codigosFiltrados.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => {
                    seleccionarCodigoCatalogo(index, cat);
                    setTextoBusqueda(cat.descriptorAuto || cat.referencia || '');
                    setAbierto(false);
                  }}
                  className="px-2.5 py-1.5 hover:bg-blue-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 text-[10px]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-gray-800 dark:text-gray-100">
                        {cat.referencia || 'S/Ref'}
                      </span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        [{cat.codigo || 'S/Cod'}]
                      </span>
                      <span className="text-[#2383C2]">
                        {cat.descriptorAuto || 'S/Descriptor'}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 italic">
                        ({cat.empresa || 'S/Empresa'})
                      </span>
                    </div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1 rounded">
                      ${Number(cat.precioNeto || cat.precio || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-2.5 py-2 text-gray-400 text-[10px] italic">
                No se encontraron coincidencias
              </div>
            )}
          </div>,
          document.body
        )}
      </div>

      <input
        readOnly
        value={`$ ${Number(item.precio || 0).toLocaleString()}`}
        className="w-28 h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 outline-none cursor-not-allowed select-none font-semibold text-center"
        title="Precio automático desde el catálogo (No modificable)"
      />

      <input
        required
        type="number"
        min="1"
        placeholder="Cant."
        value={item.cantidad}
        onChange={e => handleItemChange(index, 'cantidad', parseInt(e.target.value) || 0)}
        className="w-16 h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none"
      />
      <input
        placeholder="Lote"
        value={item.lote}
        onChange={e => handleItemChange(index, 'lote', e.target.value)}
        className="w-24 h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none"
      />
      <input
        type="date"
        value={item.vencimiento}
        onChange={e => handleItemChange(index, 'vencimiento', e.target.value)}
        className="w-28 h-6 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[10px] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none"
      />

      <button
        type="button"
        onClick={() => eliminarLineaItem(index)}
        className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};

export default GeneralInventario;