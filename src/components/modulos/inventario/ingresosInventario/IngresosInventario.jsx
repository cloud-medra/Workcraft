import React, { useState, useEffect, useRef } from 'react';
import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { Save, PackageCheck, ChevronsUpDown, Check, Building2, Package } from 'lucide-react';
import { useToast } from '../../../../context/ToastContext';
import { useUser } from '../../../../context/UserContext';
import Spinner from '../../../ui/Spinner';
import TablaItemsIngreso from './TablaItemsIngreso';

const COL_BASE = "inventario_general";
const COL_MAESTRO_CODIGOS = "maestros_codigos";
const COL_EMPRESAS = "maestros_empresas";

const IngresosInventario = () => {
  const [catalogoCodigos, setCatalogoCodigos] = useState([]);
  const [listaEmpresas, setListaEmpresas] = useState([]);
  const [listaCajas, setListaCajas] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Estados para Buscador/Desplegable de Empresas
  const [busquedaEmpresa, setBusquedaEmpresa] = useState('');
  const [mostrarEmpresasDropdown, setMostrarEmpresasDropdown] = useState(false);
  const dropdownEmpresaRef = useRef(null);

  // Estados para Buscador/Desplegable de Cajas Destino
  const [busquedaCaja, setBusquedaCaja] = useState('');
  const [mostrarCajasDropdown, setMostrarCajasDropdown] = useState(false);
  const dropdownCajaRef = useRef(null);

  // Clase CSS común con el efecto de enfoque y resplandor azul
  const inputBlueFocusClass = "w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 transition-all outline-none focus:border-[#2383C2] focus:ring-2 focus:ring-[#2383C2]/30 active:border-[#2383C2]";

  // Datos de cabecera del documento de entrada
  const [formDataIngreso, setFormDataIngreso] = useState({
    numeroGuiaFactura: '',
    numeroOrden: '',
    empresa: '',
    empresaId: '',
    nombreCaja: '',
    ubicacion: '',
    observaciones: ''
  });

  // Lista de ítems/referencias a ingresar
  const [itemsIngreso, setItemsIngreso] = useState([
    { codigoId: '', codigo: '', referencia: '', descripcion: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }
  ]);

  const { showToast } = useToast();
  const { userData } = useUser();

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        // Cargar Catálogo de Códigos
        const snapCodigos = await getDocs(query(collection(db, COL_MAESTRO_CODIGOS), orderBy("fechaRegistro", "desc")));
        setCatalogoCodigos(snapCodigos.docs.map(d => ({ id: d.id, ...d.data() })));

        // Cargar Empresas
        const snapEmpresas = await getDocs(collection(db, COL_EMPRESAS));
        const empresasData = snapEmpresas.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            nombre: data.nombre || data.razonSocial || data.nombreEmpresa || 'Sin nombre',
            rut: data.rut || data.rutEmpresa || ''
          };
        });
        empresasData.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setListaEmpresas(empresasData);

        // Cargar Cajas Existentes del Inventario
        const snapInventario = await getDocs(collection(db, COL_BASE));
        const cajasMap = new Map();

        snapInventario.docs.forEach(doc => {
          const data = doc.data();
          if (data.nombreCaja && data.nombreCaja.trim() !== '') {
            const nombreNormalizado = data.nombreCaja.trim();
            if (!cajasMap.has(nombreNormalizado.toLowerCase())) {
              cajasMap.set(nombreNormalizado.toLowerCase(), {
                nombre: nombreNormalizado,
                ubicacion: data.ubicacion || ''
              });
            }
          }
        });

        const cajasUnicas = Array.from(cajasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
        setListaCajas(cajasUnicas);

      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
      }
    };
    cargarDatosIniciales();
  }, []);

  // Manejar clic fuera de los desplegables
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownEmpresaRef.current && !dropdownEmpresaRef.current.contains(event.target)) {
        setMostrarEmpresasDropdown(false);
      }
      if (dropdownCajaRef.current && !dropdownCajaRef.current.contains(event.target)) {
        setMostrarCajasDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setFormDataIngreso(prev => ({ ...prev, [name]: value }));
  };

  const handleSeleccionarEmpresa = (empresa) => {
    setFormDataIngreso(prev => ({
      ...prev,
      empresa: empresa.nombre,
      empresaId: empresa.id
    }));
    setBusquedaEmpresa(empresa.nombre);
    setMostrarEmpresasDropdown(false);
  };

  const handleSeleccionarCaja = (caja) => {
    setFormDataIngreso(prev => ({
      ...prev,
      nombreCaja: caja.nombre,
      ubicacion: caja.ubicacion || prev.ubicacion
    }));
    setBusquedaCaja(caja.nombre);
    setMostrarCajasDropdown(false);
  };

  const empresasFiltradas = listaEmpresas.filter(emp =>
    emp.nombre.toLowerCase().includes(busquedaEmpresa.toLowerCase()) ||
    emp.rut.toLowerCase().includes(busquedaEmpresa.toLowerCase())
  );

  const cajasFiltradas = listaCajas.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCaja.toLowerCase())
  );

  const agregarLineaItem = () => {
    setItemsIngreso([
      ...itemsIngreso,
      { codigoId: '', codigo: '', referencia: '', descripcion: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }
    ]);
  };

  const eliminarLineaItem = (index) => {
    if (itemsIngreso.length === 1) {
      return showToast("Debe ingresar al menos una referencia", "error");
    }
    setItemsIngreso(itemsIngreso.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, campo, valor) => {
    const nuevosItems = [...itemsIngreso];
    nuevosItems[index][campo] = valor;
    setItemsIngreso(nuevosItems);
  };

  const seleccionarCodigoCatalogo = (index, cat) => {
    const nuevosItems = [...itemsIngreso];
    nuevosItems[index] = {
      ...nuevosItems[index],
      codigoId: cat.id,
      codigo: cat.codigo || '',
      referencia: cat.referencia || '',
      descripcion: cat.descriptorAuto || cat.descripcion || cat.tipo || '',
      precio: Number(cat.precioNeto) || Number(cat.precio) || 0
    };
    setItemsIngreso(nuevosItems);
  };

  const registrarLog = async (cajaId, accion, detalles) => {
    try {
      const logsSubcollectionRef = collection(db, COL_BASE, cajaId, "logs");
      await addDoc(logsSubcollectionRef, {
        accion,
        detalles,
        usuario: userData?.nombreCompleto || 'Usuario Desconocido',
        usuarioEmail: userData?.email || '',
        fecha: new Date(),
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error al registrar log de auditoría:", err);
    }
  };

  const handleGuardarIngreso = async (e) => {
    e.preventDefault();

    if (!formDataIngreso.numeroGuiaFactura.trim()) {
      return showToast("El número de Guía o Factura es obligatorio", "error");
    }
    if (!formDataIngreso.nombreCaja.trim()) {
      return showToast("El nombre de la caja destino es obligatorio", "error");
    }

    for (const item of itemsIngreso) {
      if (!item.codigoId || item.cantidad <= 0) {
        return showToast("Todos los ítems deben tener una referencia seleccionada y cantidad mayor a cero", "error");
      }
    }

    setCargando(true);
    try {
      const dataAEnviar = {
        tipoRegistro: 'INGRESO_STOCK',
        numeroGuiaFactura: formDataIngreso.numeroGuiaFactura,
        numeroOrden: formDataIngreso.numeroOrden,
        empresa: formDataIngreso.empresa,
        empresaId: formDataIngreso.empresaId,
        nombreCaja: formDataIngreso.nombreCaja,
        ubicacion: formDataIngreso.ubicacion,
        observaciones: formDataIngreso.observaciones,
        items: itemsIngreso,
        registradoPor: userData?.nombreCompleto || userData?.nombre || 'Usuario',
        fechaRegistro: serverTimestamp(),
        ultimaModificacion: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, COL_BASE), dataAEnviar);

      await registrarLog(docRef.id, 'INGRESO_CON_DOCUMENTO', {
        numeroGuiaFactura: formDataIngreso.numeroGuiaFactura,
        numeroOrden: formDataIngreso.numeroOrden,
        empresa: formDataIngreso.empresa,
        nombreCaja: formDataIngreso.nombreCaja,
        cantidadItems: itemsIngreso.length
      });

      showToast("Ingreso de stock registrado con éxito", "success");
      limpiarFormulario();
    } catch (error) {
      showToast("Error al procesar el ingreso: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const limpiarFormulario = () => {
    setFormDataIngreso({
      numeroGuiaFactura: '',
      numeroOrden: '',
      empresa: '',
      empresaId: '',
      nombreCaja: '',
      ubicacion: '',
      observaciones: ''
    });
    setBusquedaEmpresa('');
    setBusquedaCaja('');
    setItemsIngreso([
      { codigoId: '', codigo: '', referencia: '', descripcion: '', precio: 0, cantidad: 1, lote: '', vencimiento: '' }
    ]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden p-0 relative text-[11px]">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-500/20 dark:bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white/90 dark:bg-gray-800/90 p-4 rounded-xl shadow-xl flex flex-col items-center gap-3">
            <Spinner size="md" color="#2383C2" />
            <h3 className="text-[#2383C2] font-bold text-[13px]">Guardando ingreso de inventario...</h3>
          </div>
        </div>
      )}

      {/* Cabecera */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/80">
        <h2 className="text-[12px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-1.5">
          <PackageCheck size={16} className="text-[#2383C2]" />
          REGISTRO DE INGRESO DE STOCK (GUÍAS / ÓRDENES)
        </h2>
      </div>

      <form onSubmit={handleGuardarIngreso} autoComplete="off" className="p-3 flex flex-col gap-3 overflow-y-auto">
        {/* Datos Documento de Ingreso */}
        <div className="bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-md border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-6 gap-2">
          <div>
            <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">N° Guía / Factura *</label>
            <input
              type="text"
              name="numeroGuiaFactura"
              value={formDataIngreso.numeroGuiaFactura}
              onChange={handleHeaderChange}
              placeholder="Ej: F001-4920"
              autoComplete="off"
              className={inputBlueFocusClass}
              required
            />
          </div>

          <div>
            <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">N° Orden Compra</label>
            <input
              type="text"
              name="numeroOrden"
              value={formDataIngreso.numeroOrden}
              onChange={handleHeaderChange}
              placeholder="Ej: OC-2026-081"
              autoComplete="off"
              className={inputBlueFocusClass}
            />
          </div>

          {/* Campo Empresa (Buscador / Desplegable) */}
          <div className="relative" ref={dropdownEmpresaRef}>
            <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">Empresa</label>
            <div className="relative">
              <input
                type="text"
                value={busquedaEmpresa}
                onFocus={() => setMostrarEmpresasDropdown(true)}
                onChange={(e) => {
                  setBusquedaEmpresa(e.target.value);
                  setFormDataIngreso(prev => ({ ...prev, empresa: e.target.value, empresaId: '' }));
                  setMostrarEmpresasDropdown(true);
                }}
                placeholder="Buscar empresa..."
                autoComplete="off"
                className={`${inputBlueFocusClass} pr-7`}
              />
              <ChevronsUpDown 
                size={14} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
              />
            </div>

            {mostrarEmpresasDropdown && (
              <ul className="absolute z-30 mt-1 max-h-48 w-full min-w-[200px] overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-xs shadow-lg ring-1 ring-black/5 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
                {empresasFiltradas.length === 0 ? (
                  <li className="px-3 py-2 text-gray-400 dark:text-gray-500 italic">
                    No se encontraron empresas
                  </li>
                ) : (
                  empresasFiltradas.map((emp) => (
                    <li
                      key={emp.id}
                      onClick={() => handleSeleccionarEmpresa(emp)}
                      className="cursor-pointer select-none px-3 py-1.5 hover:bg-[#2383C2]/10 dark:hover:bg-[#2383C2]/20 flex items-center justify-between text-gray-700 dark:text-gray-200"
                    >
                      <div className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-[#2383C2]" />
                        <span className="font-medium truncate">{emp.nombre}</span>
                        {emp.rut && <span className="text-[10px] text-gray-400">({emp.rut})</span>}
                      </div>
                      {formDataIngreso.empresaId === emp.id && (
                        <Check size={12} className="text-[#2383C2]" />
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          {/* Campo Nombre Caja (Buscador / Selección o Entrada Manual) */}
          <div className="relative" ref={dropdownCajaRef}>
            <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">Nombre Caja *</label>
            <div className="relative">
              <input
                type="text"
                value={busquedaCaja}
                onFocus={() => setMostrarCajasDropdown(true)}
                onChange={(e) => {
                  setBusquedaCaja(e.target.value);
                  setFormDataIngreso(prev => ({ ...prev, nombreCaja: e.target.value }));
                  setMostrarCajasDropdown(true);
                }}
                placeholder="Seleccionar o escribir..."
                autoComplete="off"
                className={`${inputBlueFocusClass} pr-7`}
                required
              />
              <ChevronsUpDown 
                size={14} 
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
              />
            </div>

            {mostrarCajasDropdown && (
              <ul className="absolute z-30 mt-1 max-h-48 w-full min-w-[200px] overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-xs shadow-lg ring-1 ring-black/5 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
                {cajasFiltradas.length === 0 ? (
                  <li className="px-3 py-2 text-gray-400 dark:text-gray-500 italic">
                    Crear nueva caja: "{busquedaCaja}"
                  </li>
                ) : (
                  cajasFiltradas.map((caja, idx) => (
                    <li
                      key={idx}
                      onClick={() => handleSeleccionarCaja(caja)}
                      className="cursor-pointer select-none px-3 py-1.5 hover:bg-[#2383C2]/10 dark:hover:bg-[#2383C2]/20 flex items-center justify-between text-gray-700 dark:text-gray-200"
                    >
                      <div className="flex items-center gap-1.5">
                        <Package size={12} className="text-[#2383C2]" />
                        <span className="font-medium truncate">{caja.nombre}</span>
                        {caja.ubicacion && <span className="text-[10px] text-gray-400">({caja.ubicacion})</span>}
                      </div>
                      {formDataIngreso.nombreCaja === caja.nombre && (
                        <Check size={12} className="text-[#2383C2]" />
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>

          <div>
            <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">Ubicación</label>
            <input
              type="text"
              name="ubicacion"
              value={formDataIngreso.ubicacion}
              onChange={handleHeaderChange}
              placeholder="Ej: Estante B-1"
              autoComplete="off"
              className={inputBlueFocusClass}
            />
          </div>

          <div>
            <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">Observaciones</label>
            <input
              type="text"
              name="observaciones"
              value={formDataIngreso.observaciones}
              onChange={handleHeaderChange}
              placeholder="Notas opcionales..."
              autoComplete="off"
              className={inputBlueFocusClass}
            />
          </div>
        </div>

        {/* Componente Tabla de Ítems */}
        <TablaItemsIngreso
          itemsIngreso={itemsIngreso}
          catalogoCodigos={catalogoCodigos}
          inputBlueFocusClass={inputBlueFocusClass}
          handleItemChange={handleItemChange}
          seleccionarCodigoCatalogo={seleccionarCodigoCatalogo}
          eliminarLineaItem={eliminarLineaItem}
          agregarLineaItem={agregarLineaItem}
        />

        {/* Botones de Acción */}
        <div className="flex items-center justify-end pt-2 gap-2">
          <button
            type="button"
            onClick={limpiarFormulario}
            className="px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition"
          >
            Limpiar
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-bold transition shadow-sm"
          >
            <Save size={14} />
            Guardar Ingreso de Stock
          </button>
        </div>
      </form>
    </div>
  );
};

export default IngresosInventario;