import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, query, orderBy, onSnapshot, collectionGroup, where, getDocs, setDoc, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Receipt, Plus, Save, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';
import { useModal } from '../../../context/ModalContext'; // <-- Importamos tu hook del modal
import Spinner from '../../ui/Spinner';

const IngresoFacturas = () => {
  const { hasPermission } = useGranularPermission();
  const { confirmAction } = useModal(); // <-- Extraemos la función global
  const PATH_VISTA = "/laboratorio/ingresoFacturas";
  const getFechaHoy = () => new Date().toISOString().split('T')[0];
  const mesesNombresOrden = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  // Estados para filtros de visualización de histórico
  const [selectedAnio, setSelectedAnio] = useState(new Date().getFullYear().toString());
  const [selectedMes, setSelectedMes] = useState("");
  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [mesesDisponibles, setMesesDisponibles] = useState([]);

  const [facturas, setFacturas] = useState([]);
  const [editingId, setEditingId] = useState(null);
  // --- NUEVO: guardamos el estado "original" de la factura que se está editando ---
  // Esto nos permite saber si el folio cambió (para re-buscar datos) y cuál era el
  // monto original (para ajustar correctamente el resumen financiero al guardar).
  const [editingOriginalFolio, setEditingOriginalFolio] = useState('');
  const [editingOriginalMonto, setEditingOriginalMonto] = useState(0);
  const [editingOriginalAnio, setEditingOriginalAnio] = useState('');
  const [editingOriginalMes, setEditingOriginalMes] = useState('');

  const [cargando, setCargando] = useState(false);
  const [formData, setFormData] = useState({
    folio: '', orden: '', acta: '', salida: '',
    fechaActa: getFechaHoy(),
    fechaSalida: getFechaHoy(),
    montoFactura: '', ocFactura: '', empresa: ''
  });

  const { showToast } = useToast();
  const { userData } = useUser();

  const COL_BASE = "laboratorio_operaciones_facturas";
  const COL_RESUMEN = "laboratorio_resumen_financiero";

  const formatMiles = (val) => val ? Number(val).toLocaleString('es-CL') : '';

  const resetFormState = () => {
    setFormData({
      folio: '', orden: '', acta: '', salida: '',
      fechaActa: getFechaHoy(), fechaSalida: getFechaHoy(),
      montoFactura: '', ocFactura: '', empresa: ''
    });
    setEditingId(null);
    setEditingOriginalFolio('');
    setEditingOriginalMonto(0);
    setEditingOriginalAnio('');
    setEditingOriginalMes('');
  };

  // 1. Generar rango dinámico de años
  useEffect(() => {
    const anioActual = new Date().getFullYear();
    const listaAnios = [];
    for (let i = 2024; i <= anioActual + 1; i++) {
      listaAnios.push(i.toString());
    }
    setAniosDisponibles(listaAnios);
  }, []);

  // 2. Cargar dinámicamente SOLO los meses que existen en la base de datos
  useEffect(() => {
    const cargarMesesExistentes = async () => {
      try {
        const mesesRef = collection(db, `${COL_BASE}/${selectedAnio}/meses`);
        const snapshot = await getDocs(mesesRef);

        const mesesExistentes = snapshot.docs.map(doc => doc.id.toLowerCase());
        const mesesOrdenados = mesesNombresOrden.filter(m => mesesExistentes.includes(m));

        setMesesDisponibles(mesesOrdenados);

        const mesActualSistema = mesesNombresOrden[new Date().getMonth()];
        if (mesesOrdenados.includes(mesActualSistema) && selectedAnio === new Date().getFullYear().toString()) {
          setSelectedMes(mesActualSistema);
        } else if (mesesOrdenados.length > 0) {
          setSelectedMes(mesesOrdenados[mesesOrdenados.length - 1]);
        } else {
          setSelectedMes("");
        }
      } catch (error) {
        console.error("Error obteniendo los meses de la base de datos:", error);
        setMesesDisponibles([]);
        setSelectedMes("");
      }
    };

    cargarMesesExistentes();
  }, [selectedAnio]);

  // 3. Escuchar documentos del año y mes seleccionados
  useEffect(() => {
    if (!selectedAnio || !selectedMes) {
      setFacturas([]);
      return;
    }

    const path = `${COL_BASE}/${selectedAnio}/meses/${selectedMes}/documentos`;
    const q = query(collection(db, path), orderBy("fechaRegistro", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFacturas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.error("Error al cargar facturas o ruta vacía:", error);
      setFacturas([]);
    });

    return () => unsubscribe();
  }, [selectedAnio, selectedMes]);

  // --- FIX #1: ahora también busca cuando se está editando, siempre que el folio
  // haya cambiado respecto al original. Si no cambió, no hace nada (evita pisar
  // datos innecesariamente al solo hacer click/blur sobre el campo).
  const buscarFacturaPorFolio = async (folio) => {
    if (!folio) return;
    if (editingId && folio === editingOriginalFolio) return;

    try {
      const q = query(collectionGroup(db, "documentos"), where("folio", "==", folio));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docData = querySnapshot.docs[0].data();
        setFormData(prev => ({
          ...prev,
          montoFactura: docData.total || '',
          ocFactura: docData.folioRef || '',
          empresa: docData.rznSoc || ''
        }));
        showToast("Datos cargados automáticamente", "success");
      }
    } catch (error) { console.error("Error buscando factura:", error); }
  };

  const handleMontoChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, montoFactura: rawValue }));
  };

  const handleGuardar = async (e) => {
    e.preventDefault();

    const d = new Date();
    const anioReal = d.getFullYear().toString();
    const mesReal = mesesNombresOrden[d.getMonth()];

    const anio = selectedAnio || anioReal;
    const mes = selectedMes || mesReal;

    setCargando(true);
    const path = `${COL_BASE}/${anio}/meses/${mes}/documentos`;
    const montoNumerico = Number(formData.montoFactura);

    try {
      const qRef = query(collectionGroup(db, "documentos"), where("folio", "==", formData.folio));
      const querySnapshot = await getDocs(qRef);
      if (!querySnapshot.empty) {
        await updateDoc(querySnapshot.docs[0].ref, {
          estado: "Ingresada",
          fechaIngreso: getFechaHoy(),
          ocIngresada: formData.orden
        });
      }

      const dataToSave = {
        ...formData,
        montoFactura: montoNumerico,
        registradoPor: userData?.nombreCompleto || 'Usuario',
        fechaRegistro: new Date()
      };

      await setDoc(doc(db, COL_BASE, anio), { active: true }, { merge: true });
      await setDoc(doc(db, COL_BASE, anio, "meses", mes), { active: true }, { merge: true });

      if (editingId) {
        await updateDoc(doc(db, path, editingId), dataToSave);

        // --- FIX #2: ajustar el resumen financiero al editar ---
        // Calculamos la diferencia entre el monto nuevo y el monto original.
        const delta = montoNumerico - editingOriginalMonto;

        // Caso normal: se edita dentro del mismo año/mes al que pertenecía la factura.
        const mismoPeriodo = editingOriginalAnio === anio && editingOriginalMes === mes;

        if (mismoPeriodo) {
          if (delta !== 0) {
            await setDoc(doc(db, COL_RESUMEN, anio, "meses", mes), {
              totalActa: increment(delta),
              totalSalida: increment(delta),
              ultimaActualizacion: new Date()
            }, { merge: true });
          }
        } else {
          // Caso borde: la factura "cambió de período" (por ejemplo se editó estando
          // parado en un año/mes distinto al original). Restamos el monto original
          // del período viejo y sumamos el monto nuevo al período nuevo, para que
          // ambos resúmenes queden consistentes.
          if (editingOriginalAnio && editingOriginalMes) {
            await setDoc(doc(db, COL_RESUMEN, editingOriginalAnio, "meses", editingOriginalMes), {
              totalActa: increment(-editingOriginalMonto),
              totalSalida: increment(-editingOriginalMonto),
              ultimaActualizacion: new Date()
            }, { merge: true });
          }
          await setDoc(doc(db, COL_RESUMEN, anio), { active: true }, { merge: true });
          await setDoc(doc(db, COL_RESUMEN, anio, "meses", mes), {
            totalActa: increment(montoNumerico),
            totalSalida: increment(montoNumerico),
            ultimaActualizacion: new Date()
          }, { merge: true });
        }

        showToast("Factura actualizada", "success");
      } else {
        await addDoc(collection(db, path), dataToSave);
        await setDoc(doc(db, COL_RESUMEN, anio), { active: true }, { merge: true });
        await setDoc(doc(db, COL_RESUMEN, anio, "meses", mes), { active: true }, { merge: true });
        await setDoc(doc(db, COL_RESUMEN, anio, "meses", mes), {
          totalActa: increment(montoNumerico),
          totalSalida: increment(montoNumerico),
          ultimaActualizacion: new Date()
        }, { merge: true });

        const folioStr = String(formData.folio);
        await deleteDoc(doc(db, "laboratorio_conciliaciones", folioStr));
        const qItems = query(collection(db, "laboratorio_conciliaciones_items"), where("folio", "==", folioStr));
        const snapItems = await getDocs(qItems);
        await Promise.all(snapItems.docs.map(d => deleteDoc(d.ref)));
        showToast("Factura ingresada y registros de conciliación eliminados ✓", "success");

        if (!mesesDisponibles.includes(mes)) {
          setMesesDisponibles(prev => [...prev, mes].sort((a, b) => mesesNombresOrden.indexOf(a) - mesesNombresOrden.indexOf(b)));
          setSelectedMes(mes);
        }
      }

      resetFormState();
    } catch (error) { showToast("Error: " + error.message, "error"); } finally { setCargando(false); }
  };

  // Función interna que realiza la eliminación real en Firebase
  const ejecutarEliminacionFirestore = async (id, folio, monto) => {
    setCargando(true);
    const path = `${COL_BASE}/${selectedAnio}/meses/${selectedMes}/documentos`;

    try {
      await deleteDoc(doc(db, path, id));

      await setDoc(doc(db, COL_RESUMEN, selectedAnio, "meses", selectedMes), {
        totalActa: increment(-Number(monto)),
        totalSalida: increment(-Number(monto)),
        ultimaActualizacion: new Date()
      }, { merge: true });

      showToast("Factura eliminada correctamente y totales actualizados", "success");

      if (editingId === id) {
        resetFormState();
      }
    } catch (error) {
      showToast("Error al eliminar: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  // Disparador del Modal personalizado de tu Context
  const solicitarConfirmacionEliminar = (id, folio, monto) => {
    confirmAction(
      "¿Eliminar Factura?",
      `¿Está completamente seguro de eliminar la factura con Folio: ${folio}? Esta acción descontará el monto de los balances mensuales.`,
      () => ejecutarEliminacionFirestore(id, folio, monto) // Se ejecuta si hace click en "Eliminar"
    );
  };

  const iniciarEdicion = (f) => {
    setEditingId(f.id);
    setFormData(f);
    setEditingOriginalFolio(f.folio || '');
    setEditingOriginalMonto(Number(f.montoFactura) || 0);
    setEditingOriginalAnio(selectedAnio);
    setEditingOriginalMes(selectedMes);
  };

  const inputClass = "w-full h-8 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 rounded text-[11px] outline-none focus:border-[#2383C2]";
  const labelClass = "block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1";
  const selectFilterClass = "h-8 px-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-[11px] font-medium text-gray-700 dark:text-gray-200 outline-none focus:border-[#2383C2] cursor-pointer min-w-[110px]";

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

      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 gap-4 shrink-0">
        <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-100 flex items-center gap-2">
          <Receipt size={16} className="text-[#2383C2]" /> {editingId ? "EDITAR FACTURA" : "INGRESO DE FACTURAS"}
        </h2>

        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-0.5">Año histórico</span>
            <select value={selectedAnio} onChange={(e) => setSelectedAnio(e.target.value)} className={selectFilterClass}>
              {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
            <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-0.5">Mes histórico</span>
            <select value={selectedMes} onChange={(e) => setSelectedMes(e.target.value)} className={selectFilterClass} disabled={mesesDisponibles.length === 0}>
              {mesesDisponibles.length === 0 ? (
                <option value="">Sin registros</option>
              ) : (
                mesesDisponibles.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)
              )}
            </select>
          </div>
        </div>
      </div>

      {/* FORMULARIO */}
      <form onSubmit={handleGuardar} className="p-4 flex flex-wrap lg:flex-nowrap items-end gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {[
          { key: 'folio', label: 'Folio', onBlur: (e) => buscarFacturaPorFolio(e.target.value) },
          { key: 'orden', label: 'Orden' },
          { key: 'acta', label: 'Acta' },
          { key: 'salida', label: 'Salida' },
          { key: 'fechaActa', label: 'F. Acta', type: 'date' },
          { key: 'fechaSalida', label: 'F. Salida', type: 'date' },
          // El monto es de solo lectura mientras se ingresa una factura nueva
          // (se autocompleta al buscar el folio), pero se habilita para edición
          // manual cuando estamos editando una factura ya existente.
          { key: 'montoFactura', label: 'Monto', isMonto: true, readOnly: !editingId },
          { key: 'ocFactura', label: 'OC', readOnly: true },
          { key: 'empresa', label: 'Empresa', readOnly: true }
        ].map((f) => hasPermission(PATH_VISTA, "formulario_ingreso", f.key) && (
          <div key={f.key} className="flex-1 min-w-[100px]">
            <label className={labelClass}>{f.label}</label>
            <input
              type={f.type || 'text'}
              value={f.isMonto ? formatMiles(formData.montoFactura) : formData[f.key]}
              onChange={f.isMonto ? handleMontoChange : e => setFormData({ ...formData, [f.key]: e.target.value })}
              onBlur={f.onBlur}
              readOnly={f.readOnly}
              className={`${inputClass} ${f.readOnly ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed text-gray-400 dark:text-gray-500' : ''}`}
            />
          </div>
        ))}

        {hasPermission(PATH_VISTA, "formulario_ingreso", "btn_accion") && (
          <button type="submit" className={`h-8 px-4 rounded font-bold text-[12px] flex items-center gap-2 whitespace-nowrap shrink-0 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'} text-white transition`}>
            {editingId ? <><Save size={14} /> Actualizar</> : <><Plus size={14} /> Registrar</>}
          </button>
        )}
      </form>

      {/* TABLA DE FACTURAS */}
      <div className="flex-grow overflow-auto">
        <table className="w-full text-left text-[11px] border-collapse table-fixed">
          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 uppercase font-bold sticky top-0 z-10">
            <tr>
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_folio") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[100px]">Folio</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_orden") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[100px]">Orden</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_acta") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[100px]">Acta</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_salida") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[100px]">Salida</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_f_acta") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[110px]">F. Acta</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_f_salida") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[110px]">F. Salida</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_monto") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[120px]">Monto</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_oc") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700 w-[110px]">OC</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_empresa") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Empresa</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_accion") && <th className="p-3 border-b border-gray-200 dark:border-gray-700 w-[90px] text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {facturas.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-8 text-center text-gray-400 dark:text-gray-500 italic">
                  No se encontraron facturas registradas en este período.
                </td>
              </tr>
            ) : (
              facturas.map(f => (
                <tr key={f.id} className="border-l-4 border-transparent hover:border-[#2383C2] hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_folio") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-gray-700 dark:text-gray-200">{f.folio}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_orden") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400">{f.orden}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_acta") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400">{f.acta}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_salida") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400">{f.salida}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_f_acta") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 whitespace-nowrap">{f.fechaActa}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_f_salida") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400 whitespace-nowrap">{f.fechaSalida}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_monto") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 font-bold text-[#2383C2] whitespace-nowrap">$ {formatMiles(f.montoFactura)}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_oc") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-400">{f.ocFactura}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_empresa") && <td className="p-3 border-b border-r border-gray-200 dark:border-gray-700/70 text-gray-600 dark:text-gray-300 truncate">{f.empresa}</td>}
                  {hasPermission(PATH_VISTA, "tabla_facturas", "col_accion") && (
                    <td className="p-3 border-b border-gray-200 dark:border-gray-700 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => iniciarEdicion(f)}
                          className="text-gray-400 hover:text-blue-600 transition p-1"
                          title="Editar factura"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => solicitarConfirmacionEliminar(f.id, f.folio, f.montoFactura)} // <-- Llamada a la confirmación estética
                          className="text-gray-400 hover:text-red-600 transition p-1"
                          title="Eliminar factura"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IngresoFacturas;