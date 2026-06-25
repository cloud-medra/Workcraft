import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, query, orderBy, onSnapshot, collectionGroup, where, getDocs, setDoc, increment, deleteDoc } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { Receipt, Plus, Save, Pencil } from 'lucide-react';
import { useToast } from '../../../context/ToastContext';
import { useUser } from '../../../context/UserContext';
import { useGranularPermission } from '../../../hooks/useGranularPermission';
import Spinner from '../../ui/Spinner';

const IngresoFacturas = () => {
  const { hasPermission } = useGranularPermission();
  const PATH_VISTA = "/laboratorio/ingresoFacturas";
  const getFechaHoy = () => new Date().toISOString().split('T')[0];
  const mesesNombres = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  const [facturas, setFacturas] = useState([]);
  const [editingId, setEditingId] = useState(null);
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

  const getRutaActual = () => {
    const d = new Date();
    const anio = d.getFullYear().toString();
    const mes = mesesNombres[d.getMonth()];
    return { anio, mes, path: `${COL_BASE}/${anio}/meses/${mes}/documentos` };
  };

  useEffect(() => {
    const { path } = getRutaActual();
    const q = query(collection(db, path), orderBy("fechaRegistro", "desc"));
    return onSnapshot(q, (snapshot) => {
      setFacturas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const buscarFacturaPorFolio = async (folio) => {
    if (!folio || editingId) return;
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
    setCargando(true);
    const { anio, mes, path } = getRutaActual();
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
      }

      setFormData({
        folio: '', orden: '', acta: '', salida: '',
        fechaActa: getFechaHoy(), fechaSalida: getFechaHoy(),
        montoFactura: '', ocFactura: '', empresa: ''
      });
      setEditingId(null);
    } catch (error) { showToast("Error: " + error.message, "error"); } finally { setCargando(false); }
  };

  const inputClass = "w-full h-8 px-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded text-[11px] outline-none focus:border-[#2383C2] dark:focus:border-[#369BCE] dark:[color-scheme:dark]";
  const labelClass = "block text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1";

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden relative transition-colors">
      {cargando && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <Spinner size="md" />
        </div>
      )}

      <h2 className="text-[14px] font-bold text-gray-700 dark:text-gray-200 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
        <Receipt size={16} className="text-[#2383C2] dark:text-[#369BCE]" /> {editingId ? "EDITAR FACTURA" : "INGRESO DE FACTURAS"}
      </h2>

      <form onSubmit={handleGuardar} className="p-4 flex flex-wrap lg:flex-nowrap items-end gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        {[
          { key: 'folio', label: 'Folio', onBlur: (e) => buscarFacturaPorFolio(e.target.value) },
          { key: 'orden', label: 'Orden' },
          { key: 'acta', label: 'Acta' },
          { key: 'salida', label: 'Salida' },
          { key: 'fechaActa', label: 'F. Acta', type: 'date' },
          { key: 'fechaSalida', label: 'F. Salida', type: 'date' },
          { key: 'montoFactura', label: 'Monto', isMonto: true, readOnly: true },
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
              className={`${inputClass} ${f.readOnly ? 'bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed text-gray-500 dark:text-gray-400' : ''}`}
            />
          </div>
        ))}

        {hasPermission(PATH_VISTA, "formulario_ingreso", "btn_accion") && (
          <button type="submit" className={`h-8 px-4 rounded font-bold text-[12px] flex items-center gap-2 whitespace-nowrap shrink-0 ${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2383C2] hover:bg-[#369BCE]'} text-white transition-colors`}>
            {editingId ? <><Save size={14} /> Actualizar</> : <><Plus size={14} /> Registrar</>}
          </button>
        )}
      </form>

      <div className="flex-grow overflow-auto bg-white dark:bg-gray-800">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 uppercase font-bold sticky top-0 z-10">
            <tr>
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_folio") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Folio</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_orden") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Orden</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_acta") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Acta</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_salida") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Salida</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_f_acta") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">F. Acta</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_f_salida") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">F. Salida</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_monto") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Monto</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_oc") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">OC</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_empresa") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Empresa</th>}
              {hasPermission(PATH_VISTA, "tabla_facturas", "col_accion") && <th className="p-3 border-b border-r border-gray-200 dark:border-gray-700">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {facturas.map(f => (
              <tr key={f.id} className="border-l-4 border-transparent hover:border-[#2383C2] dark:hover:border-[#369BCE] hover:bg-gray-50 dark:hover:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700 transition-colors">
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_folio") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200">{f.folio}</td>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_orden") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{f.orden}</td>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_acta") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{f.acta}</td>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_salida") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">{f.salida}</td>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_f_acta") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 whitespace-nowrap">{f.fechaActa}</td>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_f_salida") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 whitespace-nowrap">{f.fechaSalida}</td>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_monto") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 font-bold text-[#2383C2] dark:text-[#369BCE] whitespace-nowrap">$ {formatMiles(f.montoFactura)}</td>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_oc") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">{f.ocFactura}</td>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_empresa") && <td className="p-3 border-r border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 truncate max-w-[150px]">{f.empresa}</td>}
                {hasPermission(PATH_VISTA, "tabla_facturas", "col_accion") && (
                  <td className="p-3 text-center">
                    <button onClick={() => { setEditingId(f.id); setFormData(f); }} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"><Pencil size={14} /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IngresoFacturas;