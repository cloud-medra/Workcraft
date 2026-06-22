import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Barcode, Plus, Search, Pencil, Save, Filter } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';

const Codigos = () => {
  const [codigos, setCodigos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState('');
  const [formData, setFormData] = useState({
    referencia: '', detalle: '', precioCosto: '', empresa: '',
    codigo: '', descripcion: '', tipo: 'IMPLANTE', atributo: 'COTIZACION',
    historialPrecios: []
  });
  const [busqueda, setBusqueda] = useState('');
  const [filtroSinCodigo, setFiltroSinCodigo] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isManualDesc, setIsManualDesc] = useState(false);

  const { showToast } = useToast();
  const { userData } = useUser();
  const { hasPermission } = useGranularPermission();

  const PATH_VISTA = "/maestros/codigos";

  const formatMiles = (val) => val ? Number(val).toLocaleString('es-CL') : '';

  useEffect(() => {
    const fetchEmpresas = async () => {
      const snap = await getDocs(collection(db, "maestros_empresas"));
      setEmpresas(snap.docs.map(d => d.data().nombre));
    };
    fetchEmpresas();
  }, []);

  const cargarCodigosPorEmpresa = async (empresa) => {
    if (!empresa) {
      setCodigos([]);
      return;
    }
    const q = query(collection(db, "maestros_codigos"), where("empresa", "==", empresa));
    const snap = await getDocs(q);
    setCodigos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleEmpresaChange = (e) => {
    const emp = e.target.value;
    setEmpresaSeleccionada(emp);
    cargarCodigosPorEmpresa(emp);
  };

  useEffect(() => {
    if (!editingId && !isManualDesc && formData.codigo === '') {
      const autoDesc = `${formData.referencia} ${formData.detalle}`.trim().toUpperCase();
      if (formData.descripcion !== autoDesc) {
        setFormData(prev => ({ ...prev, descripcion: autoDesc }));
      }
    }
  }, [formData.referencia, formData.detalle, formData.codigo, editingId, isManualDesc]);

  const handlePrecioChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, precioCosto: rawValue }));
  };

  const handleCodigoChange = (val) => {
    const upperVal = val.toUpperCase();
    setIsManualDesc(true);
    setFormData(prev => ({
      ...prev,
      codigo: upperVal,
      descripcion: editingId ? prev.descripcion : ''
    }));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      const nuevoPrecio = Number(formData.precioCosto);
      let historial = [...(formData.historialPrecios || [])];
      if (editingId && nuevoPrecio !== Number(formData.precioOriginal)) {
        historial.push({ precio: Number(formData.precioOriginal), fecha: new Date() });
      }
      const dataToSave = {
        ...formData,
        referencia: formData.referencia.toUpperCase(),
        detalle: formData.detalle.toUpperCase(),
        descripcion: formData.descripcion.toUpperCase(),
        codigo: formData.codigo.toUpperCase(),
        precioCosto: nuevoPrecio,
        historialPrecios: historial,
        registradoPor: userData?.nombreCompleto || 'Usuario',
        fechaRegistro: editingId ? formData.fechaRegistro : new Date()
      };
      if (editingId) {
        await updateDoc(doc(db, "maestros_codigos", editingId), dataToSave);
        showToast("Código actualizado", "success");
      } else {
        await addDoc(collection(db, "maestros_codigos"), dataToSave);
        showToast("Código registrado", "success");
      }
      setFormData({ referencia: '', detalle: '', precioCosto: '', empresa: '', codigo: '', descripcion: '', tipo: 'IMPLANTE', atributo: 'COTIZACION', historialPrecios: [] });
      setEditingId(null);
      setIsManualDesc(false);
      cargarCodigosPorEmpresa(empresaSeleccionada);
    } catch (error) { showToast("Error: " + error.message, "error"); }
  };

  const codigosFiltrados = codigos.filter(c => {
    const matchBusqueda = (c.codigo?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
      (c.descripcion?.toLowerCase() || '').includes(busqueda.toLowerCase()) ||
      (c.referencia?.toLowerCase() || '').includes(busqueda.toLowerCase());
    const matchFiltro = filtroSinCodigo ? (!c.codigo || c.codigo === '') : true;
    return matchBusqueda && matchFiltro;
  });

  const inputClass = "w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#2383C2] transition-colors";
  const descClass = `${inputClass} ${!formData.descripcion ? 'border-red-500' : ''}`;

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0">
      <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
        <Barcode size={16} className="text-[#2383C2]" /> {editingId ? "EDITAR CÓDIGO" : "REGISTRO DE CÓDIGOS"}
      </h2>

      {hasPermission(PATH_VISTA, "formulario_registro") && (
        <form onSubmit={handleGuardar} className="p-4 flex flex-wrap items-end gap-4 border-b border-gray-200">
          {hasPermission(PATH_VISTA, "formulario_registro", "input_referencia") && (
            <div style={{ width: '150px' }}><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Referencia</label><input required value={formData.referencia} onChange={e => setFormData({ ...formData, referencia: e.target.value.toUpperCase() })} className={inputClass} /></div>
          )}
          {hasPermission(PATH_VISTA, "formulario_registro", "input_detalle") && (
            <div style={{ width: '200px' }}><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Detalle</label><input required value={formData.detalle} onChange={e => setFormData({ ...formData, detalle: e.target.value.toUpperCase() })} className={inputClass} /></div>
          )}
          {hasPermission(PATH_VISTA, "formulario_registro", "input_precio") && (
            <div style={{ width: '120px' }}><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Precio Costo</label><input required value={formatMiles(formData.precioCosto)} onChange={handlePrecioChange} className={inputClass} /></div>
          )}
          {hasPermission(PATH_VISTA, "formulario_registro", "select_empresa") && (
            <div className="w-[200px]"><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Empresa</label><select required value={formData.empresa} onChange={e => setFormData({ ...formData, empresa: e.target.value })} className={inputClass}><option value="">Seleccione...</option>{empresas.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
          )}
          {hasPermission(PATH_VISTA, "formulario_registro", "input_codigo") && (
            <div className="w-[150px]"><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Código</label><input value={formData.codigo} onChange={e => handleCodigoChange(e.target.value)} className={inputClass} /></div>
          )}
          {hasPermission(PATH_VISTA, "formulario_registro", "input_descripcion") && (
            <div className="w-[300px]"><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Descripción</label><input required value={formData.descripcion} onChange={e => { setIsManualDesc(true); setFormData({ ...formData, descripcion: e.target.value.toUpperCase() }); }} className={descClass} /></div>
          )}
          {hasPermission(PATH_VISTA, "formulario_registro", "select_tipo") && (
            <div className="w-[120px]"><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Tipo</label><select value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })} className={inputClass}><option value="IMPLANTE">IMPLANTE</option><option value="CONSIGNACION">CONSIGNACION</option><option value="PAD">PAD</option></select></div>
          )}
          {hasPermission(PATH_VISTA, "formulario_registro", "select_atributo") && (
            <div className="w-[120px]"><label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Atributo</label><select value={formData.atributo} onChange={e => setFormData({ ...formData, atributo: e.target.value })} className={inputClass}><option value="COTIZACION">COTIZACION</option><option value="CONSIGNACION">CONSIGNACION</option></select></div>
          )}

          {((!editingId && hasPermission(PATH_VISTA, "formulario_registro", "btn_registrar")) ||
            (editingId && hasPermission(PATH_VISTA, "formulario_registro", "btn_actualizar"))) && (
              <button type="submit" className={`h-8 px-4 rounded font-bold text-[12px] flex items-center gap-2 ${editingId ? 'bg-amber-600' : 'bg-[#3b4a6b]'} text-white`}>
                {editingId ? <><Save size={14} /> Actualizar</> : <><Plus size={14} /> Registrar</>}
              </button>
            )}
        </form>
      )}

      {hasPermission(PATH_VISTA, "barra_filtros") && (
        <div className="bg-gray-50 p-3 border-b border-gray-200 flex items-center gap-4">
          {hasPermission(PATH_VISTA, "barra_filtros", "select_empresa_filtro") && (
            <div className="w-48">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Empresa Filtro</label>
              <select value={empresaSeleccionada} onChange={handleEmpresaChange} className={inputClass}>
                <option value="">Seleccione...</option>
                {empresas.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          )}
          {hasPermission(PATH_VISTA, "barra_filtros", "input_buscar") && (
            <div className="relative w-72">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Buscar</label>
              <Search className="absolute left-2 top-[26px] text-gray-400" size={14} />
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} disabled={!empresaSeleccionada} className={inputClass + " pl-8"} placeholder="Buscar..." />
            </div>
          )}
          {hasPermission(PATH_VISTA, "barra_filtros", "btn_toggle_sin_codigo") && (
            <button onClick={() => setFiltroSinCodigo(!filtroSinCodigo)} className={`mt-4 flex items-center gap-2 px-3 h-8 rounded text-[11px] font-bold ${filtroSinCodigo ? 'bg-[#2383C2] text-white' : 'bg-gray-200 text-gray-700'}`}>
              <Filter size={14} /> {filtroSinCodigo ? 'MOSTRANDO SIN CÓDIGO' : 'FILTRAR SIN CÓDIGO'}
            </button>
          )}
        </div>
      )}

      {hasPermission(PATH_VISTA, "tabla_datos") && (
        <div className="flex-grow overflow-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-gray-100 sticky top-0 text-gray-600 uppercase font-bold text-[11px]">
              <tr>
                {hasPermission(PATH_VISTA, "tabla_datos", "col_referencia") && <th className="p-3 border-b border-r border-gray-200">Ref</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_detalle") && <th className="p-3 border-b border-r border-gray-200">Detalle</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_precio") && <th className="p-3 border-b border-r border-gray-200">Precio</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_empresa") && <th className="p-3 border-b border-r border-gray-200">Empresa</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_codigo") && <th className="p-3 border-b border-r border-gray-200">Código</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_descripcion") && <th className="p-3 border-b border-r border-gray-200">Descripción</th>}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_tipo_atributo") && (
                  <>
                    <th className="p-3 border-b border-r border-gray-200">Tipo</th>
                    <th className="p-3 border-b border-r border-gray-200">Atrib</th>
                  </>
                )}
                {hasPermission(PATH_VISTA, "tabla_datos", "col_historial") && <th className="p-3 border-b border-r border-gray-200">Último Precio Ant.</th>}
                <th className="p-3 border-b border-gray-200 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {codigosFiltrados.map(c => (
                <tr key={c.id} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50">
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_referencia") && <td className="p-3 border-b border-r border-gray-200">{c.referencia}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_detalle") && <td className="p-3 border-b border-r border-gray-200">{c.detalle}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_precio") && <td className="p-3 border-b border-r border-gray-200 font-bold">$ {formatMiles(c.precioCosto)}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_empresa") && <td className="p-3 border-b border-r border-gray-200">{c.empresa}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_codigo") && <td className="p-3 border-b border-r border-gray-200 font-bold text-[#2383C2]">{c.codigo || '-'}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_descripcion") && <td className="p-3 border-b border-r border-gray-200">{c.descripcion}</td>}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_tipo_atributo") && (
                    <>
                      <td className="p-3 border-b border-r border-gray-200">{c.tipo}</td>
                      <td className="p-3 border-b border-r border-gray-200">{c.atributo}</td>
                    </>
                  )}
                  {hasPermission(PATH_VISTA, "tabla_datos", "col_historial") && (
                    <td className="p-3 border-b border-r border-gray-200 text-[10px] text-gray-500">
                      {c.historialPrecios?.length > 0
                        ? `$ ${formatMiles(c.historialPrecios[c.historialPrecios.length - 1].precio)} - ${c.historialPrecios[c.historialPrecios.length - 1].fecha.toDate().toLocaleDateString('es-CL')}`
                        : '-'}
                    </td>
                  )}
                  <td className="p-3 border-b border-gray-200 text-center">
                    {hasPermission(PATH_VISTA, "tabla_datos", "action_editar") && (
                      <button onClick={() => { setEditingId(c.id); setFormData({ ...c, precioOriginal: c.precioCosto }); setIsManualDesc(true); }} className="text-blue-600"><Pencil size={15} /></button>
                    )}
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

export default Codigos;