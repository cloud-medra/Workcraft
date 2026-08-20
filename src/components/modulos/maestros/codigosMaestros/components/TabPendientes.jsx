import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../../firebaseConfig';
import { Clock, Plus, Trash2, Search, Pencil, Save, X, ChevronDown } from 'lucide-react';
import { useToast } from '../../../../../context/ToastContext';
import { useModal } from '../../../../../context/ModalContext';
import { useUser } from '../../../../../context/UserContext';
import { useGranularPermission } from '../../../../../hooks/useGranularPermission';
import Spinner from '../../../../ui/Spinner';

const TabPendientes = () => {
  const [registros, setRegistros] = useState([]);
  const [empresasMaestro, setEmpresasMaestro] = useState([]);
  const [formData, setFormData] = useState({
    referencia: '',
    descriptorEmpresa: '',
    empresa: '',
    tipo: '',
    segmento: '',
    clase: '',
    descriptorAuto: '',
    precioNeto: '',
    cx: '',
    observacion: ''
  });
  const [busqueda, setBusqueda] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Estado para controlar la visibilidad del desplegable de empresas
  const [mostrarDropdownEmpresa, setMostrarDropdownEmpresa] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/maestros/codigos-pendientes";
  const COL_BASE = "maestros_codigos";

  const formatearMiles = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '';
    const num = valor.toString().replace(/\D/g, '');
    if (num === '') return '';
    return new Intl.NumberFormat('es-ES').format(num);
  };

  useEffect(() => {
    const q = query(collection(db, COL_BASE), orderBy("fechaRegistro", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(item => !item.codigo || item.codigo.trim() === '');
      setRegistros(datos);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "maestros_empresas"), orderBy("nombre", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmpresasMaestro(lista);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const parts = [formData.referencia, formData.descriptorEmpresa].filter(Boolean);
    if (parts.length > 0) {
      setFormData(prev => ({ ...prev, descriptorAuto: parts.join(' ').toUpperCase() }));
    } else {
      setFormData(prev => ({ ...prev, descriptorAuto: '' }));
    }
  }, [formData.referencia, formData.descriptorEmpresa]);

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

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!formData.referencia.trim() || !formData.empresa.trim()) {
      return showToast("Referencia y Empresa son obligatorios", "error");
    }

    setCargando(true);
    try {
      const dataUpper = Object.keys(formData).reduce((acc, key) => {
        acc[key] = typeof formData[key] === 'string' ? formData[key].toUpperCase() : formData[key];
        return acc;
      }, {});

      const precioLimpio = parseFloat(dataUpper.precioNeto.toString().replace(/\./g, '')) || 0;

      if (editingId) {
        const registroExistente = registros.find(l => l.id === editingId);
        const dataAEnviar = {
          ...dataUpper,
          precioNeto: precioLimpio,
          fechaRegistro: registroExistente?.fechaRegistro || new Date(),
          registradoPor: registroExistente?.registradoPor || userData?.nombreCompleto || 'Usuario'
        };

        await updateDoc(doc(db, COL_BASE, editingId), dataAEnviar);
        showToast("Registro pendiente actualizado correctamente", "success");
      } else {
        const dataAEnviar = {
          ...dataUpper,
          precioNeto: precioLimpio,
          codigo: '', 
          fechaRegistro: serverTimestamp(),
          registradoPor: userData?.nombreCompleto || 'Usuario'
        };

        await addDoc(collection(db, COL_BASE), dataAEnviar);
        showToast("Registro pendiente guardado correctamente", "success");
      }

      setFormData({
        referencia: '',
        descriptorEmpresa: '',
        empresa: '',
        tipo: '',
        segmento: '',
        clase: '',
        descriptorAuto: '',
        precioNeto: '',
        cx: '',
        observacion: ''
      });
      setEditingId(null);
    } catch (error) {
      showToast("Error al guardar: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleDelete = (id) => {
    confirmAction(
      "Eliminar Pendiente",
      "¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.",
      async () => {
        try {
          await deleteDoc(doc(db, COL_BASE, id));
          showToast("Registro eliminado correctamente", "info");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  const iniciarEdicion = (item) => {
    setEditingId(item.id);
    setFormData({
      referencia: item.referencia || '',
      descriptorEmpresa: item.descriptorEmpresa || '',
      empresa: item.empresa || '',
      tipo: item.tipo || '',
      segmento: item.segmento || '',
      clase: item.clase || '',
      descriptorAuto: item.descriptorAuto || '',
      precioNeto: formatearMiles(item.precioNeto),
      cx: item.cx || '',
      observacion: item.observacion || ''
    });
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setFormData({
      referencia: '',
      descriptorEmpresa: '',
      empresa: '',
      tipo: '',
      segmento: '',
      clase: '',
      descriptorAuto: '',
      precioNeto: '',
      cx: '',
      observacion: ''
    });
  };

  const empresasFiltradasLista = empresasMaestro.filter(emp =>
    emp.nombre.toLowerCase().includes((formData.empresa || '').toLowerCase())
  );

  const registrosFiltrados = registros.filter(item =>
    (item.referencia && item.referencia.toLowerCase().includes(busqueda.toLowerCase())) ||
    (item.empresa && item.empresa.toLowerCase().includes(busqueda.toLowerCase())) ||
    (item.descriptorEmpresa && item.descriptorEmpresa.toLowerCase().includes(busqueda.toLowerCase()))
  );

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Procesando...</h3>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <Clock size={14} className="text-[#2383C2]" />
          {editingId ? "EDITAR REGISTRO PENDIENTE" : "REGISTROS SIN CÓDIGO (PENDIENTES)"}
        </h2>
      </div>

      {/* Formulario */}
      {hasPermission(PATH_VISTA, "formulario_registro") && (
        <form onSubmit={handleGuardar} className="px-3 py-2 flex flex-wrap items-end gap-2.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/30 dark:bg-gray-800/20">
          <div className="w-[150px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Referencia</label>
            <input required value={formData.referencia} onChange={e => setFormData({ ...formData, referencia: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="Referencia" />
          </div>

          <div className="w-[170px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Descriptor Empresa</label>
            <input value={formData.descriptorEmpresa} onChange={e => setFormData({ ...formData, descriptorEmpresa: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="Descriptor empresa" />
          </div>

          {/* Campo Empresa Autocompletable / Buscador */}
          <div className="w-[160px] relative">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Empresa</label>
            <div className="relative flex items-center">
              <input 
                required 
                type="text"
                value={formData.empresa} 
                onChange={e => {
                  setFormData({ ...formData, empresa: e.target.value.toUpperCase() });
                  setMostrarDropdownEmpresa(true);
                }}
                onFocus={() => setMostrarDropdownEmpresa(true)}
                onBlur={() => setTimeout(() => setMostrarDropdownEmpresa(false), 200)}
                className="w-full h-7 pl-2 pr-6 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2]" 
                placeholder="Buscar empresa..." 
              />
              <ChevronDown size={12} className="absolute right-2 text-gray-400 pointer-events-none" />
            </div>

            {/* Lista Desplegable de Autocompletado */}
            {mostrarDropdownEmpresa && (
              <ul className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
                {empresasFiltradasLista.length > 0 ? (
                  empresasFiltradasLista.map(emp => (
                    <li
                      key={emp.id}
                      onMouseDown={() => {
                        setFormData({ ...formData, empresa: emp.nombre.toUpperCase() });
                        setMostrarDropdownEmpresa(false);
                      }}
                      className="px-2 py-1.5 hover:bg-[#2383C2]/10 dark:hover:bg-gray-800 cursor-pointer text-gray-800 dark:text-gray-100 text-[11px] uppercase truncate"
                    >
                      {emp.nombre}
                    </li>
                  ))
                ) : (
                  <li className="px-2 py-1.5 text-gray-400 text-[10px] italic">No hay resultados</li>
                )}
              </ul>
            )}
          </div>

          <div className="w-[130px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Tipo</label>
            <select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} className="w-full h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
              <option value="">Seleccione...</option>
              <option value="COTIZACION">COTIZACION</option>
              <option value="CONSIGNACION">CONSIGNACION</option>
            </select>
          </div>

          <div className="w-[150px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Segmento</label>
            <select value={formData.segmento} onChange={e => setFormData({ ...formData, segmento: e.target.value })} className="w-full h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
              <option value="">Seleccione...</option>
              <option value="IMPLANTES">IMPLANTES</option>
              <option value="CONSIGNACION">CONSIGNACION</option>
              <option value="HEMODINAMIA">HEMODINAMIA</option>
            </select>
          </div>

          <div className="w-[130px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Clase</label>
            <select value={formData.clase} onChange={e => setFormData({ ...formData, clase: e.target.value })} className="w-full h-7 px-1.5 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100">
              <option value="">Seleccione...</option>
              <option value="IMPLANTE">IMPLANTE</option>
              <option value="INSUMOS">INSUMOS</option>
              <option value="PAD">PAD</option>
            </select>
          </div>

          <div className="w-[190px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Descriptor Auto (Maestro)</label>
            <input readOnly value={formData.descriptorAuto} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 outline-none" placeholder="Autogenerado" />
          </div>

          <div className="w-[110px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Precio Neto</label>
            <input 
              type="text" 
              value={formData.precioNeto} 
              onChange={e => {
                const valorRaw = e.target.value.replace(/\D/g, '');
                setFormData({ ...formData, precioNeto: formatearMiles(valorRaw) });
              }} 
              className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" 
              placeholder="0" 
            />
          </div>

          <div className="w-[110px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">CX</label>
            <input value={formData.cx} onChange={e => setFormData({ ...formData, cx: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="CX" />
          </div>

          <div className="w-[180px]">
            <label className="block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-0.5">Observación</label>
            <input value={formData.observacion} onChange={e => setFormData({ ...formData, observacion: e.target.value })} className="w-full h-7 px-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none focus:border-[#2383C2] bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100" placeholder="Observación" />
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            <button type="submit" className={`h-7 px-3 rounded font-bold text-[11px] flex items-center gap-1.5 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'} text-white transition`}>
              {editingId ? <><Save size={13} /> Actualizar</> : <><Plus size={13} /> Registrar</>}
            </button>

            {editingId && (
              <button type="button" onClick={cancelarEdicion} className="h-7 px-3 bg-gray-200 dark:bg-gray-700 rounded font-bold text-[11px] text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                <X size={13} /> Cancelar
              </button>
            )}
          </div>
        </form>
      )}

      {/* Barra de Búsqueda */}
      {hasPermission(PATH_VISTA, "barra_busqueda") && (
        <div className="bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
          <div className="relative w-60">
            <Search className="absolute left-2 top-1.5 text-gray-400 dark:text-gray-500" size={13} />
            <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-7 pl-7 pr-2 border border-gray-300 dark:border-gray-600 rounded text-[11px] outline-none bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:border-[#2383C2]" placeholder="Buscar por referencia o empresa..." />
          </div>
        </div>
      )}

      {/* Tabla */}
      {hasPermission(PATH_VISTA, "tabla_datos") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-10">
              <tr className="text-gray-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700 w-8 text-center">#</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Referencia</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Desc. Empresa</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Empresa</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Tipo</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Segmento</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Clase</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Desc. Auto</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Precio Neto</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Estado</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Registrado por</th>
                <th className="py-1.5 px-2 border-b border-r border-gray-200 dark:border-gray-700">Fecha</th>
                <th className="py-1.5 px-2 border-b border-gray-200 dark:border-gray-700 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {registrosFiltrados.map((item, index) => (
                <tr key={item.id} className="border-l-2 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400 font-bold text-center">{index + 1}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-700 dark:text-gray-200 font-medium">{item.referencia}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{item.descriptorEmpresa}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{item.empresa}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{item.tipo}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{item.segmento}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">{item.clase}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400">{item.descriptorAuto}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300">
                    ${new Intl.NumberFormat('es-ES').format(item.precioNeto || 0)}
                  </td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center gap-1 w-max">
                      <Clock size={10} /> Sin Código
                    </span>
                  </td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400">{item.registradoPor || 'N/A'}</td>
                  <td className="py-1 px-2 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-500 dark:text-gray-400">{formatearFecha(item.fechaRegistro)}</td>
                  <td className="py-1 px-2 border-b border-gray-200 dark:border-gray-700 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => iniciarEdicion(item)} title="Editar" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} title="Eliminar" className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition">
                        <Trash2 size={13} />
                      </button>
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

export default TabPendientes;