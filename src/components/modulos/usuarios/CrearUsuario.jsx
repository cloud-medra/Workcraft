import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from "../../../firebaseConfig";
import { MODULES } from '../../../config/modulesConfig.jsx';
import { COMPONENT_MAPS } from '../../../config/componentMaps.jsx';
import { enviarCredenciales } from '../../../services/emailService';
import { useToast } from '../../../context/ToastContext';
import { useModal } from '../../../context/ModalContext';
import { User, Plus, Trash2, Search, Pencil, Save, X, ShieldCheck, Loader2, Eye, EyeOff, LayoutGrid } from 'lucide-react';

const CrearUsuario = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    nombreUsuario: '',
    email: '',
    rol: 'usuario',
    estado: 'ACTIVO',
    permisos: {},
    permisosGranulares: {}
  });
  const [busqueda, setBusqueda] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [vistaActivaGranular, setVistaActivaGranular] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "usuarios"), orderBy("nombreCompleto"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaUsuarios = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(listaUsuarios);
    });
    return () => unsubscribe();
  }, []);

  const { showToast } = useToast();
  const { confirmAction } = useModal();

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return 'N/A';
    const date = new Date(fechaStr);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleRolChange = (nuevoRol) => {
    setFormData(prev => {
      const nuevosPermisos = { ...prev.permisos };

      if (nuevoRol !== 'dev') {
        Object.keys(nuevosPermisos).forEach(moduloKey => {
          nuevosPermisos[moduloKey] = nuevosPermisos[moduloKey].filter(
            path => path !== '/configuracion/crear-usuario'
          );
        });
      }

      return {
        ...prev,
        rol: nuevoRol,
        permisos: nuevosPermisos,
        ...(vistaActivaGranular === '/configuracion/crear-usuario' && { vistaActivaGranular: null })
      };
    });

    if (vistaActivaGranular === '/configuracion/crear-usuario' && nuevoRol !== 'dev') {
      setVistaActivaGranular(null);
    }
  };

  const toggleSubItem = (moduloKey, subItemPath) => {
    setFormData(prev => {
      const currentModuloPermisos = prev.permisos[moduloKey] || [];
      const yaEstaMarcado = currentModuloPermisos.includes(subItemPath);

      const updatedPermisos = yaEstaMarcado
        ? currentModuloPermisos.filter(path => path !== subItemPath)
        : [...currentModuloPermisos, subItemPath];

      let updatedGranulares = { ...prev.permisosGranulares };

      if (!yaEstaMarcado && COMPONENT_MAPS[subItemPath]) {
        const secciones = COMPONENT_MAPS[subItemPath].sections || {};
        const granularInicial = {};

        Object.keys(secciones).forEach(secKey => {
          const elementos = secciones[secKey].elements || {};
          granularInicial[secKey] = {
            visible: true,
            elements: Object.keys(elementos).reduce((acc, elKey) => {
              acc[elKey] = true;
              return acc;
            }, {})
          };
        });

        updatedGranulares[subItemPath] = granularInicial;
      }

      if (yaEstaMarcado) {
        delete updatedGranulares[subItemPath];
      }

      return {
        ...prev,
        permisos: { ...prev.permisos, [moduloKey]: updatedPermisos },
        permisosGranulares: updatedGranulares
      };
    });
  };

  const toggleGranularSection = (viewPath, sectionKey) => {
    setFormData(prev => {
      const granular = JSON.parse(JSON.stringify(prev.permisosGranulares || {}));

      if (!granular[viewPath]) granular[viewPath] = {};
      if (!granular[viewPath][sectionKey]) granular[viewPath][sectionKey] = { visible: true, elements: {} };

      const nuevoEstadoVisible = !granular[viewPath][sectionKey].visible;
      granular[viewPath][sectionKey].visible = nuevoEstadoVisible;

      if (!nuevoEstadoVisible) {
        granular[viewPath][sectionKey].elements = {};
      } else {
        const elementosDelMapa = COMPONENT_MAPS[viewPath]?.sections[sectionKey]?.elements || {};
        granular[viewPath][sectionKey].elements = {};
        Object.keys(elementosDelMapa).forEach(elKey => {
          granular[viewPath][sectionKey].elements[elKey] = true;
        });
      }

      return { ...prev, permisosGranulares: granular };
    });
  };

  const toggleGranularElement = (viewPath, sectionKey, elementKey) => {
    setFormData(prev => {
      const granular = JSON.parse(JSON.stringify(prev.permisosGranulares || {}));

      if (!granular[viewPath]) granular[viewPath] = {};
      if (!granular[viewPath][sectionKey]) granular[viewPath][sectionKey] = { visible: true, elements: {} };
      if (!granular[viewPath][sectionKey].elements) granular[viewPath][sectionKey].elements = {};

      const estadoActual = granular[viewPath][sectionKey].elements[elementKey] !== false;
      granular[viewPath][sectionKey].elements[elementKey] = !estadoActual;

      return { ...prev, permisosGranulares: granular };
    });
  };

  const handleGuardar = async (e) => {
    e.preventDefault();

    if (!formData.nombreCompleto.trim() || !formData.email.trim() || !formData.nombreUsuario.trim()) {
      return showToast("Todos los campos principales son obligatorios", "error");
    }

    setLoading(true);

    try {
      const payload = {
        nombreCompleto: formData.nombreCompleto,
        nombreUsuario: formData.nombreUsuario,
        rol: formData.rol,
        permisos: formData.permisos || {},
        permisosGranulares: formData.permisosGranulares || {}
      };

      if (editingId) {

        await updateDoc(doc(db, "usuarios", editingId), {
          ...payload,
          estado: formData.estado
        });

        showToast("Usuario y permisos avanzados actualizados", "success");
        cancelarEdicion();
      } else {
        const passwordTemporal = "Medra2026*";
        const secondaryApp = initializeApp(firebaseConfig, 'secondary');
        const secondaryAuth = getAuth(secondaryApp);

        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          formData.email.trim(),
          passwordTemporal
        );
        const uid = userCredential.user.uid;
        await secondaryAuth.signOut();

        const dataToSave = {
          ...payload,
          email: formData.email.trim(),
          estado: 'ACTIVO',
          passwordChanged: false,
          createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, "usuarios", uid), dataToSave);

        await enviarCredenciales({
          nombre: formData.nombreCompleto,
          email: formData.email.trim(),
          passwordTemporal,
        });

        showToast("¡Usuario creado con éxito!", "success");
        cancelarEdicion();
      }
    } catch (error) {
      console.error("[Guardar] Error crítico en la transacción:", error);
      showToast(`Error al guardar: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    confirmAction(
      "Eliminar Usuario",
      "¿Estás seguro de eliminar este usuario de la base de datos?",
      async () => {
        try {
          await deleteDoc(doc(db, "usuarios", id));
          showToast("Usuario eliminado correctamente", "info");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  const iniciarEdicion = (u) => {
    setEditingId(u.id);
    setFormData({
      nombreCompleto: u.nombreCompleto || '',
      nombreUsuario: u.nombreUsuario || '',
      email: u.email || '',
      rol: u.rol || 'usuario',
      estado: u.estado || 'ACTIVO',
      permisos: u.permisos || {},
      permisosGranulares: u.permisosGranulares || {}
    });
    setVistaActivaGranular(null);
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setVistaActivaGranular(null);
    setFormData({ nombreCompleto: '', nombreUsuario: '', email: '', rol: 'usuario', estado: 'ACTIVO', permisos: {}, permisosGranulares: {} });
  };

  const usuariosFiltrados = usuarios.filter(u =>
    u.nombreCompleto?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.nombreUsuario?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0">
      <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
        <User size={16} className="text-[#0E5B6D]" /> {editingId ? "EDITAR USUARIO Y PERMISOS" : "REGISTRO Y CONTROL DE USUARIOS"}
      </h2>

      <form onSubmit={handleGuardar} className="p-4 flex flex-col gap-4 border-b border-gray-200 bg-gray-50/50">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-[220px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
            <input required value={formData.nombreCompleto} onChange={e => setFormData({ ...formData, nombreCompleto: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#0E5B6D] bg-white" placeholder="Ej: Juan Pérez" />
          </div>
          <div className="w-[180px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre de Usuario</label>
            <input required value={formData.nombreUsuario} onChange={e => setFormData({ ...formData, nombreUsuario: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#0E5B6D] bg-white" placeholder="Ej: jperez" />
          </div>
          <div className="w-[220px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email</label>
            <input required type="email" disabled={!!editingId} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#0E5B6D] bg-white disabled:bg-gray-100 disabled:text-gray-400" placeholder="Ej: juan@medra.cl" />
          </div>
          <div className="w-[140px]">
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Rol</label>
            <select value={formData.rol} onChange={e => handleRolChange(e.target.value)} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none bg-white">
              <option value="usuario">Usuario Estándar</option>
              <option value="editor">Editor</option>
              <option value="admin">Administrador</option>
              <option value="dev">Desarrollador</option>
            </select>
          </div>
          {editingId && (
            <div className="w-[120px]">
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Estado</label>
              <select value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none bg-white">
                <option value="ACTIVO">ACTIVO</option>
                <option value="INACTIVO">INACTIVO</option>
              </select>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className={`h-8 px-4 rounded font-bold text-[12px] flex items-center gap-2 text-white transition ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#3b4a6b] hover:bg-[#2d3a56]'} disabled:opacity-50`}>
              {loading ? <><Loader2 className="animate-spin" size={14} /> Procesando...</> : editingId ? <><Save size={14} /> Actualizar</> : <><Plus size={14} /> Registrar</>}
            </button>
            {editingId && (
              <button type="button" onClick={cancelarEdicion} className="h-8 px-4 bg-gray-200 rounded font-bold text-[12px] text-gray-600 flex items-center gap-2 hover:bg-gray-300 transition"><X size={14} /> Cancelar</button>
            )}
          </div>
        </div>

        <div className="border-t border-gray-200 pt-3 mt-1">
          <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5 mb-2">
            <ShieldCheck size={14} className="text-[#0E5B6D]" /> 1. Accesos a Módulos y Pantallas Básicas
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
            {Object.keys(MODULES).map((mKey) => (
              <div key={mKey} className="bg-white p-2 rounded border border-gray-200 shadow-sm flex flex-col">
                <span className="block text-[10px] font-black text-[#0E5B6D] border-b border-gray-100 pb-1 mb-2 uppercase truncate">{MODULES[mKey].label}</span>
                <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                  {MODULES[mKey].subItems?.map((sub) => {
                    const esModuloUsuarios = sub.path === '/configuracion/crear-usuario';
                    const estaBloqueadoPorRol = esModuloUsuarios && formData.rol !== 'dev';

                    const estaMarcado = estaBloqueadoPorRol ? false : (formData.permisos[mKey]?.includes(sub.path) || false);
                    const tieneEstructuraGranular = !!COMPONENT_MAPS[sub.path];

                    return (
                      <div key={sub.path} className={`flex items-center justify-between p-1 rounded transition group ${estaBloqueadoPorRol ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                        <label className={`flex items-start gap-1.5 text-[10px] flex-grow truncate ${estaBloqueadoPorRol ? 'text-gray-400 font-medium cursor-not-allowed' : 'text-gray-600 cursor-pointer'}`}>
                          <input
                            type="checkbox"
                            className="w-3 h-3 mt-0.5 accent-[#0E5B6D] rounded border-gray-300 flex-shrink-0 disabled:opacity-50"
                            checked={estaMarcado}
                            disabled={estaBloqueadoPorRol}
                            onChange={() => toggleSubItem(mKey, sub.path)}
                          />
                          <span className="leading-tight truncate" title={estaBloqueadoPorRol ? "Exclusivo para Desarrolladores" : sub.label}>
                            {sub.label} {estaBloqueadoPorRol && "🔒"}
                          </span>
                        </label>

                        {estaMarcado && tieneEstructuraGranular && editingId && (
                          <button type="button" onClick={() => setVistaActivaGranular(vistaActivaGranular === sub.path ? null : sub.path)} className={`p-0.5 rounded ml-1 transition-colors ${vistaActivaGranular === sub.path ? 'bg-[#0E5B6D] text-white' : 'text-gray-400 hover:text-[#0E5B6D]'}`} title="Configurar control granular (Secciones y Datos)">
                            <LayoutGrid size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>

      <div className="bg-gray-50 p-3 flex justify-between items-center border-b border-gray-200">
        <div className="relative w-72">
          <Search className="absolute left-2 top-2 text-gray-400" size={14} />
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-full h-8 pl-8 pr-2 border border-gray-300 rounded text-[12px] outline-none bg-white focus:border-[#0E5B6D]" placeholder="Buscar por nombre, usuario o email..." />
        </div>
      </div>

      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[12px] border-collapse">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr className="text-gray-600 uppercase font-bold text-[11px]">
              <th className="p-3 border-b border-r border-gray-200 w-10">#</th>
              <th className="p-3 border-b border-r border-gray-200">Nombre Completo</th>
              <th className="p-3 border-b border-r border-gray-200">Usuario</th>
              <th className="p-3 border-b border-r border-gray-200">Email</th>
              <th className="p-3 border-b border-r border-gray-200">Rol</th>
              <th className="p-3 border-b border-r border-gray-200">Estado</th>
              <th className="p-3 border-b border-r border-gray-200">Fecha Alta</th>
              <th className="p-3 border-b border-gray-200 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuariosFiltrados.map((u, index) => (
              <tr key={u.id} className="border-l-4 border-transparent hover:border-[#0E5B6D] hover:bg-gray-50/80 transition-colors">
                <td className="p-3 border-b border-r border-gray-200 text-gray-500 font-bold">{index + 1}</td>
                <td className="p-3 border-b border-r border-gray-200 text-gray-700 font-medium">{u.nombreCompleto}</td>
                <td className="p-3 border-b border-r border-gray-200 text-gray-600">{u.nombreUsuario}</td>
                <td className="p-3 border-b border-r border-gray-200 text-gray-600">{u.email}</td>
                <td className="p-3 border-b border-r border-gray-200">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-gray-200 text-gray-700">{u.rol}</span>
                </td>
                <td className="p-3 border-b border-r border-gray-200">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${u.estado === 'INACTIVO' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{u.estado || 'ACTIVO'}</span>
                </td>
                <td className="p-3 border-b border-r border-gray-200 text-gray-500">{formatearFecha(u.createdAt)}</td>
                <td className="p-3 border-b border-gray-200 text-center">
                  <div className="flex justify-center gap-3">
                    <button onClick={() => iniciarEdicion(u)} className="text-blue-600 hover:text-blue-800 transition" title="Editar usuario y granularidad"><Pencil size={15} /></button>
                    <button onClick={() => handleDelete(u.id)} className="text-red-500 hover:text-red-700 transition" title="Eliminar"><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingId && vistaActivaGranular && COMPONENT_MAPS[vistaActivaGranular] && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center">
              <span className="text-[13px] font-bold text-[#0E5B6D] uppercase flex items-center gap-2">
                <LayoutGrid size={16} /> 2. Control Granular Avanzado: <span className="underline font-black text-gray-800">{COMPONENT_MAPS[vistaActivaGranular].label}</span>
              </span>
              <button type="button" onClick={() => setVistaActivaGranular(null)} className="text-gray-400 hover:text-gray-600 bg-gray-200/50 hover:bg-gray-200 p-1 rounded-full transition">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 bg-gray-50/30 flex-grow max-h-[calc(85vh-110px)]">
              {Object.keys(COMPONENT_MAPS[vistaActivaGranular]?.sections || {}).map((secKey) => {
                const seccion = COMPONENT_MAPS[vistaActivaGranular].sections[secKey];
                const seccionVisible = formData.permisosGranulares[vistaActivaGranular]?.[secKey]?.visible !== false;

                return (
                  <div key={secKey} className={`p-4 rounded-lg border bg-white shadow-sm transition-all ${seccionVisible ? 'border-gray-200' : 'border-red-200 bg-red-50/10'}`}>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
                      <button type="button" onClick={() => toggleGranularSection(vistaActivaGranular, secKey)} className={`flex items-center gap-1.5 text-[12px] font-bold uppercase transition ${seccionVisible ? 'text-gray-800' : 'text-red-600 font-medium'}`}>
                        {seccionVisible ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} />}
                        {seccion.label}
                      </button>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${seccionVisible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {seccionVisible ? 'SECCIÓN VISIBLE' : 'SECCIÓN OCULTA'}
                      </span>
                    </div>

                    {seccionVisible && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {Object.keys(seccion.elements).map((elKey) => {
                          const elemento = seccion.elements[elKey];
                          const elementoActivo = formData.permisosGranulares[vistaActivaGranular]?.[secKey]?.elements?.[elKey] !== false;

                          return (
                            <button
                              key={elKey}
                              type="button"
                              onClick={() => toggleGranularElement(vistaActivaGranular, secKey, elKey)}
                              className={`p-2.5 rounded border text-left text-[11px] font-medium flex items-center justify-between gap-2 transition ${elementoActivo ? 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100' : 'border-red-200 bg-red-50/40 text-red-700 line-through'}`}
                            >
                              <span className="truncate">{elemento.label}</span>
                              {elementoActivo ? <Eye size={14} className="text-green-600 flex-shrink-0" /> : <EyeOff size={14} className="text-red-500 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button type="button" onClick={() => setVistaActivaGranular(null)} className="px-4 h-8 bg-[#0E5B6D] text-white font-bold text-[12px] rounded hover:bg-[#0b4857] transition shadow-sm">
                Listo, Guardar Cambios Temporales
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrearUsuario;