import React, { useState, useMemo, useRef, useEffect } from 'react';
import { collectionGroup, query, where, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig'; 
import { ArrowLeft, ListFilter, Info, Truck, UploadCloud, Save, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useToast } from '../../../../../../context/ToastContext'; 

import DetalleTab from './DetalleTab';
import InformacionTab from './InformacionTab';
import DeliveryTab from './DeliveryTab';
import CargasTab from './CargasTab';

const COL_BASE = 'consignacion_registros';
const NOMBRE_SUBCOL_DETALLES = 'detalles';

const construirEstadoInicial = (registro) => ({
  nombre: registro?.nombre || '',
  medico: registro?.medico || '',
  fecha: registro?.fecha || '',
  empresa: registro?.empresa || '',
  centro: registro?.centro || '',
  atributo: registro?.atributo || '',
  costo: registro?.costo ?? '',
  convenio: registro?.convenio || '',
  prevision: registro?.prevision || '',
  descripcionPabellon: registro?.descripcionPabellon || '',

  delivery: registro?.delivery || '',

  numeroGuiaVinculada: registro?.numeroGuiaVinculada || '',
  fechaEmisionGuiaVinculada: registro?.fechaEmisionGuiaVinculada || '',
  loteGuiaVinculado: registro?.loteGuiaVinculado || '',
  vencimientoGuiaVinculado: registro?.vencimientoGuiaVinculado || '',
  codigoMaestroVinculado: registro?.codigoMaestroVinculado || '',
  descripcionMaestroVinculado: registro?.descripcionMaestroVinculado || '',
  tipoMaestroVinculado: registro?.tipoMaestroVinculado || '',
  deliveryVinculado: registro?.deliveryVinculado || false,
  vinculoIncompleto: registro?.vinculoIncompleto || false,
  fechaVinculacionDelivery: registro?.fechaVinculacionDelivery || null
});

const CargasConsignacionDetalleView = ({ registro, onVolver, setCargando }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('detalle');

  const [formData, setFormData] = useState(() => construirEstadoInicial(registro));
  const snapshotInicialRef = useRef(JSON.stringify(construirEstadoInicial(registro)));

  const [guardando, setGuardando] = useState(false);
  const [showConfirmSalir, setShowConfirmSalir] = useState(false);

  const hayCambios = JSON.stringify(formData) !== snapshotInicialRef.current;

  const [itemsDeEstaAdmision, setItemsDeEstaAdmision] = useState(registro ? [registro] : []);
  const [cargandoItems, setCargandoItems] = useState(false);

  useEffect(() => {
    if (!registro?.gestionId) {
      setItemsDeEstaAdmision(registro ? [registro] : []);
      setCargandoItems(false);
      return;
    }

    setCargandoItems(true);
    const q = query(
      collectionGroup(db, NOMBRE_SUBCOL_DETALLES),
      where('gestionId', '==', registro.gestionId)
    );

    // onSnapshot (en vez de un getDocs de una sola vez) para que cambios como
    // el checkbox "Cargado" (que escribe directo a Firestore desde CargasTab)
    // se reflejen de inmediato: el caché local de Firestore dispara este
    // listener apenas se hace el updateDoc, sin esperar la confirmación del
    // servidor.
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .filter((d) => d.ref.path.startsWith(`${COL_BASE}/`))
          .map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
        setItemsDeEstaAdmision(items.length > 0 ? items : [registro]);
        setCargandoItems(false);
      },
      (err) => {
        console.error('Error al escuchar los ítems de la admisión:', err);
        setItemsDeEstaAdmision([registro]);
        setCargandoItems(false);
      }
    );

    return () => unsubscribe();
  }, [registro]);

  const registroParaDelivery = useMemo(() => {
    if (!registro) return registro;
    if ((registro.delivery || '').trim()) return registro;
    const conDelivery = itemsDeEstaAdmision.find(it => (it.delivery || '').trim());
    if (!conDelivery) return registro;
    return { ...registro, delivery: conDelivery.delivery };
  }, [registro, itemsDeEstaAdmision]);

  const deliveryEsHeredado = Boolean(
    registro && !(registro.delivery || '').trim() && (registroParaDelivery?.delivery || '').trim()
  );

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hayCambios) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hayCambios]);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleVincularDelivery = (datosVinculo) => {
    setFormData(prev => ({ ...prev, ...datosVinculo }));
    showToast('Vínculo preparado. Presiona "Guardar Cambios" para guardarlo.', 'info');
  };

  const handleGuardarCambios = async () => {
    if (!registro?.ref) {
      showToast('No se encontró la referencia del registro', 'error');
      return false;
    }
    setGuardando(true);
    try {
      await updateDoc(registro.ref, {
        ...formData,
        costo: formData.costo !== '' ? Number(formData.costo) : 0
      });
      snapshotInicialRef.current = JSON.stringify(formData);
      showToast('Cambios guardados correctamente', 'success');
      return true;
    } catch (error) {
      console.error('Error al guardar cambios:', error);
      showToast('Error al guardar los cambios', 'error');
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const handleIntentarVolver = () => {
    if (hayCambios) {
      setShowConfirmSalir(true);
    } else {
      onVolver();
    }
  };

  const handleGuardarYSalir = async () => {
    const ok = await handleGuardarCambios();
    setShowConfirmSalir(false);
    if (ok) onVolver();
  };

  const handleSalirSinGuardar = () => {
    setShowConfirmSalir(false);
    onVolver();
  };

  return (
    <div className="flex-grow flex flex-col bg-slate-50/50 dark:bg-gray-900 overflow-hidden text-[10px] relative">

      {showConfirmSalir && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-[1px]">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 bg-amber-50/60 dark:bg-amber-950/20">
              <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <h3 className="text-[12px] font-bold text-gray-800 dark:text-gray-100">Cambios sin guardar</h3>
              <button
                onClick={() => setShowConfirmSalir(false)}
                className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              >
                <X size={15} />
              </button>
            </div>

            <div className="px-4 py-3">
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Tienes modificaciones en Información y/o Delivery que no se han guardado. ¿Qué deseas hacer antes de salir?
              </p>
            </div>

            <div className="px-4 py-3 bg-gray-50/60 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-2">
              <button
                onClick={handleGuardarYSalir}
                disabled={guardando}
                className="w-full h-8 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-semibold flex items-center justify-center gap-1.5 transition text-[11px] disabled:opacity-60"
              >
                {guardando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Guardar y salir
              </button>
              <button
                onClick={handleSalirSinGuardar}
                className="w-full h-8 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 rounded font-semibold transition text-[11px]"
              >
                Salir sin guardar
              </button>
              <button
                onClick={() => setShowConfirmSalir(false)}
                className="w-full h-8 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium transition text-[11px]"
              >
                Seguir editando
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={handleIntentarVolver}
          className="p-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition shadow-xs"
          title="Volver al listado"
        >
          <ArrowLeft size={13} />
        </button>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-gray-400">
          Gestión de Consignación
        </span>
        <span className="text-slate-300 dark:text-gray-600">/</span>
        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] bg-blue-50 dark:bg-blue-950/50 text-[#2383C2] dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/40 font-bold">
          #{registro?.gestionId || 'N/A'}
        </span>

        {cargandoItems && (
          <span className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-gray-500">
            <Loader2 size={11} className="animate-spin" /> Cargando ítems...
          </span>
        )}

        {hayCambios && (
          <button
            onClick={handleGuardarCambios}
            disabled={guardando}
            className="ml-auto h-7 px-3 bg-[#2383C2] hover:bg-[#1d6fa5] text-white rounded font-semibold flex items-center gap-1.5 transition text-[11px] shadow-xs active:scale-[0.98] disabled:opacity-60"
          >
            {guardando ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        )}
      </div>

      <div className="flex-grow flex overflow-hidden">
        <div className="w-40 shrink-0 bg-white dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 flex flex-col">
          <div className="p-2 border-b border-slate-200 dark:border-gray-700">
            <h2 className="text-[10px] font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wide">
              Menú de Opción
            </h2>
          </div>

          <div className="p-1.5 space-y-1">
            <button
              type="button"
              onClick={() => setActiveTab('detalle')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md font-medium transition text-left ${activeTab === 'detalle'
                ? 'bg-[#2383C2]/10 text-[#2383C2] dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/50'
                }`}
            >
              <ListFilter size={13} />
              <span className="truncate">Detalle</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('informacion')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md font-medium transition text-left ${activeTab === 'informacion'
                ? 'bg-[#2383C2]/10 text-[#2383C2] dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/50'
                }`}
            >
              <Info size={13} />
              <span className="truncate">Información</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('delivery')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md font-medium transition text-left ${activeTab === 'delivery'
                ? 'bg-[#2383C2]/10 text-[#2383C2] dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/50'
                }`}
            >
              <Truck size={13} />
              <span className="truncate">Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cargas')}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md font-medium transition text-left ${activeTab === 'cargas'
                ? 'bg-[#2383C2]/10 text-[#2383C2] dark:bg-blue-950/50 dark:text-blue-400 font-semibold'
                : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700/50'
                }`}
            >
              <UploadCloud size={13} />
              <span className="truncate">Cargas</span>
            </button>
          </div>
        </div>

        <div className="flex-grow flex flex-col overflow-auto">
          {activeTab === 'detalle' && <DetalleTab registro={registro} items={itemsDeEstaAdmision} />}

          {activeTab === 'informacion' && (
            <InformacionTab formData={formData} onChange={handleFieldChange} />
          )}

          {activeTab === 'delivery' && (
            <DeliveryTab
              registro={registroParaDelivery}
              vinculoData={formData}
              onVincular={handleVincularDelivery}
              deliveryEsHeredado={deliveryEsHeredado}
            />
          )}

          {activeTab === 'cargas' && (
            <CargasTab
              registro={registro}
              items={itemsDeEstaAdmision}
              formData={formData}
              onChange={handleFieldChange}
              setCargando={setCargando}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CargasConsignacionDetalleView;