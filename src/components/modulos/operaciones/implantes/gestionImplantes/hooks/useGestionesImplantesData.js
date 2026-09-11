import { useState, useEffect, useRef } from 'react';
import {
  collection,
  collectionGroup,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  getDocs,
  where,
  documentId,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../../../../../../firebaseConfig';
import { useToast } from '../../../../../../context/ToastContext';
import { useModal } from '../../../../../../context/ModalContext';
import { useUser } from '../../../../../../context/UserContext';
import { exportarGestionesAExcel, descargarPlantillaCSV, parsearArchivoImportacion } from '../utils/gestionesImportExport';

const getFechaActualISO = () => {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const getInitialFormState = () => ({
  gestionId: '',
  nombre: '',
  fecha: getFechaActualISO(),
  empresa: '',
  informe: 'PENDIENTE',
  observacion: '',
  convenio: 'P',
  prevision: 'P',
  medico: 'P',
  descripcion: 'P',
  centro: 'PABELLON',
  atributo: 'IMPLANTES',
  estado: 'AGENDANDO',
  costo: 0,
  active: true
});

const getDetallesRef = (fechaString, admisionId, empresaNombre) => {
  let year = "0000";
  let month = "00";
  let day = "00";

  if (fechaString && fechaString.includes("-")) {
    const partes = fechaString.split("-");
    if (partes.length === 3) {
      year = partes[0];
      month = partes[1];
      day = partes[2];
    }
  } else if (fechaString) {
    const d = new Date();
    if (!isNaN(d.getTime())) {
      year = d.getFullYear().toString();
      month = String(d.getMonth() + 1).padStart(2, '0');
      day = String(d.getDate()).padStart(2, '0');
    }
  }

  const admisionClean = (admisionId && admisionId.trim() !== '' && admisionId !== 'P')
    ? admisionId.trim().replace(/\//g, '_')
    : 'SIN_ADMISION';

  const empresaClean = (empresaNombre || 'SIN_EMPRESA').trim().replace(/\//g, '_');

  return collection(
    db,
    'implantes_gestiones', year,
    'mes', month,
    'dia', day,
    'admision', admisionClean,
    'empresa', empresaClean,
    'detalles'
  );
};

const descomponerFecha = (fechaString) => {
  if (fechaString && fechaString.includes('-')) {
    const [anio, mes, dia] = fechaString.split('-');
    return { anio, mes, dia };
  }
  return { anio: '0000', mes: '00', dia: '00' };
};

export const useGestionesImplantesData = () => {
  const [implantes, setImplantes] = useState([]);
  const [formData, setFormData] = useState(getInitialFormState);

  const [editingId, setEditingId] = useState(null);
  const [editingRefPath, setEditingRefPath] = useState(null);
  const [cargando, setCargando] = useState(false);

  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [selectedImplanteForLog, setSelectedImplanteForLog] = useState(null);
  const [logsList, setLogsList] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [showConfigDrawer, setShowConfigDrawer] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const { showToast } = useToast();
  const { confirmAction } = useModal();
  const { userData } = useUser();

  const [sincronizando, setSincronizando] = useState(false);
  const idChangeTimeoutRef = useRef(null);
  const idChangeTokenRef = useRef(0);

  // Antes esto escuchaba TODO el collectionGroup "detalles" de la base de
  // datos (incluye, por ejemplo, las guías de despacho de Consignación, que
  // usa una subcolección con el mismo nombre) y recién filtraba en el
  // cliente por el prefijo 'implantes_gestiones/'. Ahora se acota la
  // consulta con un rango sobre el ID de documento (__name__).
  //
  // OJO: en un collectionGroup, los límites de documentId() deben ser rutas
  // de documento COMPLETAS (número PAR de segmentos) — 'implantes_gestiones/'
  // (1 segmento) es inválido y Firestore lo rechaza en tiempo de ejecución.
  // La ruta real es 'implantes_gestiones/{anio}/mes/.../detalles/{id}', y
  // {anio} es variable, así que se acota el 2do segmento (el año) a un
  // rango que cubre cualquier año de 4 dígitos: 'implantes_gestiones/0000'
  // (mínimo) a 'implantes_gestiones/9999' (máximo) — ambos son rutas
  // de 2 segmentos válidas, y la comparación de strings sigue capturando
  // correctamente cualquier profundidad mayor debajo de ese año.
  const RANGO_MIN_GESTIONES = "implantes_gestiones/0000";
  const RANGO_MAX_GESTIONES = "implantes_gestiones/9999";

  // DIAGNOSTICO TEMPORAL #2 (solo lectura): recorre la estructura REAL bajo
  // implantes_gestiones/2026 nivel por nivel, sin asumir nada, para
  // encontrar en que punto exacto la estructura real diverge de lo que
  // espera getDetallesRef() (mes -> dia -> admision -> empresa -> detalles).
  useEffect(() => {
    (async () => {
      try {
        // Nivel 1: meses reales bajo implantes_gestiones/2026
        const mesesSnap = await getDocs(collection(db, 'implantes_gestiones', '2026', 'mes'));
        console.log(`[DIAG2-mes] implantes_gestiones/2026/mes => ${mesesSnap.size} documento(s): [${mesesSnap.docs.map(d => d.id).join(', ')}]`);

        if (mesesSnap.empty) {
          console.log('[DIAG2] No hay documentos de "mes" bajo implantes_gestiones/2026 -- la colección existe pero está vacía en este punto.');
          return;
        }

        const primerMes = mesesSnap.docs[0].id;

        // Nivel 2: ¿qué hay bajo ese mes? Probamos "dia" (lo que asume el código)
        const diaSnap = await getDocs(collection(db, 'implantes_gestiones', '2026', 'mes', primerMes, 'dia'));
        console.log(`[DIAG2-dia] implantes_gestiones/2026/mes/${primerMes}/dia => ${diaSnap.size} documento(s): [${diaSnap.docs.map(d => d.id).join(', ')}]`);

        if (diaSnap.empty) {
          console.log(`[DIAG2] "dia" está vacía bajo mes/${primerMes} -- puede que la subcolección real tenga otro nombre.`);
          return;
        }

        const primerDia = diaSnap.docs[0].id;

        // Nivel 3: "admision"
        const admisionSnap = await getDocs(collection(db, 'implantes_gestiones', '2026', 'mes', primerMes, 'dia', primerDia, 'admision'));
        console.log(`[DIAG2-admision] .../dia/${primerDia}/admision => ${admisionSnap.size} documento(s): [${admisionSnap.docs.map(d => d.id).join(', ')}]`);

        if (admisionSnap.empty) { console.log('[DIAG2] "admision" vacía en ese punto.'); return; }
        const primeraAdmision = admisionSnap.docs[0].id;

        // Nivel 4: "empresa"
        const empresaSnap = await getDocs(collection(db, 'implantes_gestiones', '2026', 'mes', primerMes, 'dia', primerDia, 'admision', primeraAdmision, 'empresa'));
        console.log(`[DIAG2-empresa] .../admision/${primeraAdmision}/empresa => ${empresaSnap.size} documento(s): [${empresaSnap.docs.map(d => d.id).join(', ')}]`);

        if (empresaSnap.empty) { console.log('[DIAG2] "empresa" vacía en ese punto.'); return; }
        const primeraEmpresa = empresaSnap.docs[0].id;

        // Nivel 5: "detalles"
        const detallesSnap = await getDocs(collection(db, 'implantes_gestiones', '2026', 'mes', primerMes, 'dia', primerDia, 'admision', primeraAdmision, 'empresa', primeraEmpresa, 'detalles'));
        console.log(`[DIAG2-detalles] .../empresa/${primeraEmpresa}/detalles => ${detallesSnap.size} documento(s)`);
        detallesSnap.docs.slice(0, 3).forEach(d => console.log(`  path="${d.ref.path}" data=${JSON.stringify(d.data())}`));
      } catch (err) {
        console.error('[DIAG2] Error recorriendo la estructura real:', err);
      }
    })();
  }, []);

  useEffect(() => {
    const q = query(
      collectionGroup(db, "detalles"),
      where(documentId(), ">=", RANGO_MIN_GESTIONES),
      where(documentId(), "<", RANGO_MAX_GESTIONES),
      orderBy(documentId())
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapeados = snapshot.docs.map(document => ({
        id: document.id,
        refPath: document.ref.path,
        active: true,
        ...document.data()
      }));
      mapeados.sort((a, b) => {
        const millisA = a.fechaRegistro?.toMillis ? a.fechaRegistro.toMillis() : new Date(a.fechaRegistro || 0).getTime();
        const millisB = b.fechaRegistro?.toMillis ? b.fechaRegistro.toMillis() : new Date(b.fechaRegistro || 0).getTime();
        return millisB - millisA;
      });
      setImplantes(mapeados);
    }, (error) => {
      console.error("Error al escuchar gestiones:", error);
    });
    return () => unsubscribe();
  }, []);

  const registrarLog = async (docRef, accion, detalles) => {
    try {
      const logsSubcollectionRef = collection(docRef, "logs");
      await addDoc(logsSubcollectionRef, {
        accion,
        detalles,
        active: true,
        usuario: userData?.nombreCompleto || 'Usuario Desconocido',
        usuarioEmail: userData?.email || '',
        timestamp: serverTimestamp()
      });
    } catch (err) {
      console.error("Error al registrar log de auditoría:", err);
    }
  };

  const handleSincronizarVinculados = async () => {
    setSincronizando(true);
    try {
      const candidatos = implantes.filter(i => {
        const idValido = (i.gestionId || i.agendaId) && !isNaN(Number(i.gestionId || i.agendaId));
        const tienePendientes = [i.convenio, i.prevision, i.medico, i.descripcion]
          .some(v => v === 'P' || !v);
        return idValido && tienePendientes && i.refPath;
      });

      if (candidatos.length === 0) {
        showToast("No hay gestiones pendientes de sincronizar", "info");
        return;
      }

      const admisionesUnicas = [...new Set(candidatos.map(c => Number(c.gestionId || c.agendaId)))];

      const CHUNK_SIZE = 30;
      const mapaDatos = new Map();

      for (let i = 0; i < admisionesUnicas.length; i += CHUNK_SIZE) {
        const chunk = admisionesUnicas.slice(i, i + CHUNK_SIZE);
        const q = query(
          collectionGroup(db, "registros"),
          where("Admisión", "in", chunk)
        );
        const snap = await getDocs(q);
        snap.docs.forEach(d => {
          const data = d.data();
          const admisionKey = data["Admisión"];
          if (!mapaDatos.has(admisionKey)) {
            mapaDatos.set(admisionKey, data);
          }
        });
      }

      let actualizados = 0;
      const BATCH_SIZE = 400;
      let batch = writeBatch(db);
      let opsEnBatch = 0;

      for (const item of candidatos) {
        const admisionNum = Number(item.gestionId || item.agendaId);
        const datosReporte = mapaDatos.get(admisionNum);
        if (!datosReporte) continue;

        const docRef = doc(db, item.refPath);
        const nuevosDatos = {
          convenio: (item.convenio === 'P' || !item.convenio) ? (datosReporte["Convenio"] || 'P') : item.convenio,
          prevision: (item.prevision === 'P' || !item.prevision) ? (datosReporte["Isapre"] || 'P') : item.prevision,
          medico: (item.medico === 'P' || !item.medico) ? (datosReporte["1° Cirujano"] || 'P') : item.medico,
          descripcion: (item.descripcion === 'P' || !item.descripcion) ? (datosReporte["Descripción"] || 'P') : item.descripcion,
        };

        batch.update(docRef, nuevosDatos);
        opsEnBatch++;
        actualizados++;

        await registrarLog(docRef, 'SINCRONIZACION', {
          ...nuevosDatos,
          idGestion: item.gestionId || item.agendaId,
          nombre: item.nombre || ''
        });

        if (opsEnBatch >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          opsEnBatch = 0;
        }
      }

      if (opsEnBatch > 0) {
        await batch.commit();
      }

      showToast(`Sincronización completa: ${actualizados} gestión(es) actualizadas`, "success");
    } catch (error) {
      console.error("Error al sincronizar:", error);
      showToast("Error al sincronizar: " + error.message, "error");
    } finally {
      setSincronizando(false);
    }
  };

  const handleCopiarTexto = (texto) => {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    showToast("Texto copiado al portapapeles", "success");
  };

  // Antes esta función disparaba un getDocs() contra Firestore en CADA
  // tecla que el usuario tipeaba en el campo ID (ej: escribir "102345"
  // generaba 6 consultas, una por dígito). Ahora la búsqueda real se
  // posterga 400ms desde la última tecla (debounce) y se cancela si el
  // usuario sigue escribiendo o si el campo se vacía antes de disparar.
  const handleIdChange = (val) => {
    const cleanId = val ? val.trim() : '';

    if (idChangeTimeoutRef.current) {
      clearTimeout(idChangeTimeoutRef.current);
      idChangeTimeoutRef.current = null;
    }
    const miToken = ++idChangeTokenRef.current;

    if (!cleanId) {
      setFormData(prev => ({
        ...prev,
        gestionId: '',
        agendaId: '',
        convenio: 'P',
        prevision: 'P',
        medico: 'P',
        descripcion: 'P',
        active: true
      }));
      return;
    }

    setFormData(prev => ({
      ...prev,
      gestionId: val,
      agendaId: val,
      convenio: 'Cargando...',
      prevision: 'Cargando...',
      medico: 'Cargando...',
      descripcion: 'Cargando...',
      active: true
    }));

    const admisionNum = Number(cleanId);

    if (isNaN(admisionNum)) {
      setFormData(prev => ({
        ...prev,
        convenio: 'P',
        prevision: 'P',
        medico: 'P',
        descripcion: 'P',
        active: true
      }));
      return;
    }

    idChangeTimeoutRef.current = setTimeout(async () => {
      try {
        const q = query(
          collectionGroup(db, "registros"),
          where("Admisión", "==", admisionNum)
        );
        const snapshot = await getDocs(q);
        if (miToken !== idChangeTokenRef.current) return; // superado por una tecla posterior

        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setFormData(prev => ({
            ...prev,
            convenio: docData["Convenio"] || 'P',
            prevision: docData["Isapre"] || 'P',
            medico: docData["1° Cirujano"] || 'P',
            descripcion: docData["Descripción"] || 'P',
            active: true
          }));
        } else {
          setFormData(prev => ({
            ...prev,
            convenio: 'P',
            prevision: 'P',
            medico: 'P',
            descripcion: 'P',
            active: true
          }));
        }
      } catch (error) {
        console.error("Error al buscar datos vinculados:", error);
        if (miToken !== idChangeTokenRef.current) return;
        setFormData(prev => ({
          ...prev,
          convenio: 'P',
          prevision: 'P',
          medico: 'P',
          descripcion: 'P',
          active: true
        }));
      }
    }, 400);
  };

  const handleGuardar = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!formData.fecha) {
      showToast("La fecha es requerida para organizar la gestión", "error");
      return;
    }

    setCargando(true);
    try {
      const gestionIdLimpio = (formData.gestionId || formData.agendaId)?.trim() || 'P';
      const admisionValor = (gestionIdLimpio !== '' && gestionIdLimpio !== 'P') ? gestionIdLimpio : 'SIN_ADMISION';

      const dataNormalizada = {
        gestionId: gestionIdLimpio,
        agendaId: gestionIdLimpio,
        admision: admisionValor,
        nombre: formData.nombre?.trim() || 'P',
        fecha: formData.fecha || 'P',
        empresa: formData.empresa?.trim() || 'P',
        informe: formData.informe || 'PENDIENTE',
        observacion: formData.observacion?.trim() || '',
        convenio: formData.convenio === 'Cargando...' ? 'P' : (formData.convenio || 'P'),
        prevision: formData.prevision === 'Cargando...' ? 'P' : (formData.prevision || 'P'),
        medico: formData.medico === 'Cargando...' ? 'P' : (formData.medico || 'P'),
        descripcion: formData.descripcion === 'Cargando...' ? 'P' : (formData.descripcion || 'P'),
        centro: formData.centro || 'PABELLON',
        atributo: formData.atributo || 'IMPLANTES',
        estado: formData.estado || 'AGENDANDO',
        costo: Number(formData.costo) || 0,
        solicitud: 'PENDIENTE',
        active: true
      };

      const idEsReal = gestionIdLimpio !== '' && gestionIdLimpio !== 'P';

      const existeDuplicado = idEsReal && implantes.some(item =>
        (item.gestionId === dataNormalizada.gestionId || item.agendaId === dataNormalizada.agendaId) &&
        item.fecha === dataNormalizada.fecha &&
        item.empresa === dataNormalizada.empresa &&
        item.id !== editingId
      );

      if (existeDuplicado) {
        showToast("Ya existe un registro con el mismo ID, Fecha y Empresa.", "error");
        setCargando(false);
        return;
      }

      if (editingId && editingRefPath) {
        const docRef = doc(db, editingRefPath);
        const implanteExistente = implantes.find(i => i.id === editingId);

        const dataAEnviar = {
          ...dataNormalizada,
          fechaRegistro: implanteExistente?.fechaRegistro || new Date(),
          registradoPor: implanteExistente?.registradoPor || userData?.nombreCompleto || 'Usuario'
        };

        await updateDoc(docRef, dataAEnviar);
        await registrarLog(docRef, 'EDICION', { ...dataNormalizada });
        showToast("Gestión actualizada correctamente", "success");
      } else {
        const detallesColRef = getDetallesRef(dataNormalizada.fecha, dataNormalizada.admision, dataNormalizada.empresa);

        const dataAEnviar = {
          ...dataNormalizada,
          fechaRegistro: new Date(),
          registradoPor: userData?.nombreCompleto || 'Usuario'
        };

        const docRef = await addDoc(detallesColRef, dataAEnviar);
        await registrarLog(docRef, 'CREACION', { ...dataNormalizada });
        showToast("Gestión registrada correctamente", "success");
      }

      cancelarEdicion();
    } catch (error) {
      console.error("Error al guardar:", error);
      showToast("Error al guardar: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const guardarDesdeDetalle = async (payload) => {
    const { admisionId, paciente, registrosActualizados } = payload;

    if (!registrosActualizados || registrosActualizados.length === 0) {
      showToast("No hay registros para guardar", "error");
      return;
    }

    const sinFecha = registrosActualizados.find(r => !r.fecha || String(r.fecha).trim() === '');
    if (sinFecha) {
      showToast("La fecha es requerida en todos los bloques", "error");
      return;
    }

    setCargando(true);
    try {
      const gestionIdLimpio = admisionId?.trim() || 'P';
      const admisionValor = (gestionIdLimpio !== '' && gestionIdLimpio !== 'P') ? gestionIdLimpio : 'SIN_ADMISION';

      const batch = writeBatch(db);
      const logsAAgregar = [];

      for (const registro of registrosActualizados) {
        const dataNormalizada = {
          gestionId: gestionIdLimpio,
          agendaId: gestionIdLimpio,
          admision: admisionValor,
          nombre: paciente.nombre?.trim() || 'P',
          fecha: registro.fecha || 'P',
          empresa: registro.empresa?.trim() || 'P',
          informe: paciente.informe || 'PENDIENTE',
          convenio: paciente.convenio || 'P',
          prevision: paciente.prevision || 'P',
          medico: paciente.medico || 'P',
          descripcion: paciente.descripcion || 'P',
          observacion: (paciente.observacion || '').toString().trim(),
          centro: paciente.centro || 'PABELLON',
          atributo: paciente.atributo || 'IMPLANTES',
          estado: registro.estado || 'AGENDADO',
          costo: Number(registro.costo) || 0,
          cotizaciones: registro.cotizaciones || [],
          solicitud: registro.solicitud || 'PENDIENTE',
          active: true
        };

        const original = registro.id ? implantes.find(i => i.id === registro.id) : null;

        const rutaCambio = !original || (
          original.fecha !== dataNormalizada.fecha ||
          (original.empresa || '') !== dataNormalizada.empresa ||
          ((original.gestionId || original.agendaId) || '') !== dataNormalizada.gestionId
        );

        let docRefFinal;

        if (original && !rutaCambio) {
          const docRef = doc(db, original.refPath);
          docRefFinal = docRef;
          batch.update(docRef, {
            ...dataNormalizada,
            fechaRegistro: original.fechaRegistro || new Date(),
            registradoPor: original.registradoPor || userData?.nombreCompleto || 'Usuario'
          });
          logsAAgregar.push({ docRef, accion: 'EDICION', detalles: dataNormalizada });
        } else {
          const detallesColRef = getDetallesRef(dataNormalizada.fecha, dataNormalizada.admision, dataNormalizada.empresa);
          const nuevoDocRef = doc(detallesColRef);
          docRefFinal = nuevoDocRef;

          batch.set(nuevoDocRef, {
            ...dataNormalizada,
            fechaRegistro: original?.fechaRegistro || new Date(),
            registradoPor: original?.registradoPor || userData?.nombreCompleto || 'Usuario'
          });
          logsAAgregar.push({ docRef: nuevoDocRef, accion: original ? 'EDICION' : 'CREACION', detalles: dataNormalizada });

          if (original) {
            const oldDocRef = doc(db, original.refPath);
            batch.delete(oldDocRef);
          }
        }

        const itemsAntes = original?.cotizaciones?.[0]?.items || [];
        const itemsDespues = registro.cotizaciones?.[0]?.items || [];
        const mapaAntes = new Map(itemsAntes.map(it => [it.id, it]));
        const mapaDespues = new Map(itemsDespues.map(it => [it.id, it]));

        itemsDespues.forEach(it => {
          const anterior = mapaAntes.get(it.id);
          const infoBase = {
            referencia: it.referencia,
            cantidad: it.cantidad,
            lote: it.lote,
            vencimiento: it.vencimiento,
            estadoCarga: it.estadoCarga,
            esPad: !!it.esPad,
            contenidoDePad: !!it.padPadreId,
            paciente: dataNormalizada.nombre,
            admision: dataNormalizada.gestionId
          };

          if (!anterior) {
            logsAAgregar.push({ docRef: docRefFinal, accion: 'ITEM_CREADO', detalles: infoBase });
            return;
          }

          const cambios = {};
          if (anterior.referencia !== it.referencia) cambios.referenciaAnterior = anterior.referencia;
          if (Number(anterior.cantidad) !== Number(it.cantidad)) cambios.cantidadAnterior = anterior.cantidad;
          if ((anterior.lote || '') !== (it.lote || '')) cambios.loteAnterior = anterior.lote;
          if ((anterior.vencimiento || '') !== (it.vencimiento || '')) cambios.vencimientoAnterior = anterior.vencimiento;
          if ((anterior.estadoCarga || '') !== (it.estadoCarga || '')) cambios.estadoCargaAnterior = anterior.estadoCarga;

          if (Object.keys(cambios).length > 0) {
            logsAAgregar.push({
              docRef: docRefFinal,
              accion: 'ITEM_EDITADO',
              detalles: { ...infoBase, ...cambios }
            });
          }
        });

        itemsAntes.forEach(it => {
          if (!mapaDespues.has(it.id)) {
            logsAAgregar.push({
              docRef: docRefFinal,
              accion: 'ITEM_ELIMINADO',
              detalles: {
                referencia: it.referencia,
                cantidad: it.cantidad,
                paciente: dataNormalizada.nombre,
                admision: dataNormalizada.gestionId
              }
            });
          }
        });

        const bloqueEstaSolicitado = (registro.solicitud || '').toUpperCase() === 'SOLICITADO';

        if (bloqueEstaSolicitado) {
          const itemsActuales = registro.cotizaciones?.[0]?.items || [];
          const { anio, mes, dia } = descomponerFecha(dataNormalizada.fecha);

          itemsActuales.forEach(it => {
            if (!it.periodoAnio || !it.periodoMes) return;

            const imputadaRef = doc(
              db,
              'implantes_imputadas', String(it.periodoAnio),
              'meses', it.periodoMes,
              'documentos', it.id
            );

            batch.set(imputadaRef, {
              gestionId: dataNormalizada.gestionId,
              agendaId: dataNormalizada.agendaId,
              admision: dataNormalizada.admision,
              paciente: dataNormalizada.nombre,
              medico: dataNormalizada.medico,
              fecha: dataNormalizada.fecha,
              anio,
              mes,
              dia,
              empresa: dataNormalizada.empresa,
              informe: dataNormalizada.informe,
              convenio: dataNormalizada.convenio,
              prevision: dataNormalizada.prevision,
              descripcion: dataNormalizada.descripcion,
              centro: dataNormalizada.centro,
              atributo: dataNormalizada.atributo,
              estado: dataNormalizada.estado,
              costoGestion: dataNormalizada.costo,

              numCotizacion: it.numCotizacion || 'P',
              totalCotizacion: Number(it.totalCotizacion) || 0,
              itemId: it.id,
              referencia: it.referencia || 'P',
              codigo: it.codigo || 'P',
              descriptorAuto: it.descriptorAuto || 'P',
              clase: it.clase || 'P',
              tipoVinculado: it.tipoVinculado || 'P',
              detalle: it.detalle || 'P',
              empresaVinculada: it.empresaVinculada || 'P',
              precio: Number(it.precio) || 0,
              cantidad: Number(it.cantidad) || 0,
              vecesCosto: Number(it.vecesCosto) || 1,
              recargoEncontrado: !!it.recargoEncontrado,
              venta: Number(it.venta) || 0,
              total: Number(it.totalItem) || 0,
              lote: it.lote || 'P',
              vencimiento: it.vencimiento || '',
              sinCodigo: !!it.sinCodigo,
              estadoCarga: it.estadoCarga || 'PENDIENTE',
              periodoAnio: it.periodoAnio,
              periodoMes: it.periodoMes,
              esPad: !!it.esPad,
              padPadreId: it.padPadreId || null,

              registradoPor: userData?.nombreCompleto || 'Usuario',
              actualizadoEn: new Date()
            }, { merge: true });
          });
        }

        (registro.itemsEliminados || []).forEach(itEliminado => {
          if (!itEliminado.periodoAnio || !itEliminado.periodoMes) return;

          const imputadaRef = doc(
            db,
            'implantes_imputadas', String(itEliminado.periodoAnio),
            'meses', itEliminado.periodoMes,
            'documentos', itEliminado.id
          );

          batch.delete(imputadaRef);
        });
      }

      await batch.commit();

      await Promise.all(
        logsAAgregar.map(({ docRef, accion, detalles }) => registrarLog(docRef, accion, detalles))
      );

      showToast("Gestión actualizada correctamente", "success");
    } catch (error) {
      console.error("Error al guardar:", error);
      showToast("Error al guardar: " + error.message, "error");
    } finally {
      setCargando(false);
    }
  };

  const handleDelete = (id) => {
    const implanteAEliminar = implantes.find(i => i.id === id);
    if (!implanteAEliminar || !implanteAEliminar.refPath) return;

    confirmAction(
      "Eliminar Gestión",
      "¿Estás seguro de eliminar este registro? Esta acción no se puede deshacer.",
      async () => {
        try {
          const docRef = doc(db, implanteAEliminar.refPath);
          await registrarLog(docRef, 'ELIMINACION', {
            idGestion: implanteAEliminar?.gestionId || implanteAEliminar?.agendaId || '',
            nombre: implanteAEliminar?.nombre || ''
          });

          await deleteDoc(docRef);
          showToast("Gestión eliminada correctamente", "info");
        } catch (error) {
          console.error("Error al eliminar:", error);
          showToast("Error al eliminar", "error");
        }
      }
    );
  };

  const iniciarEdicion = (i) => {
    setEditingId(i.id);
    setEditingRefPath(i.refPath);
    setFormData({
      gestionId: i.gestionId || i.agendaId || '',
      agendaId: i.gestionId || i.agendaId || '',
      nombre: i.nombre || '',
      fecha: i.fecha || '',
      empresa: i.empresa || '',
      informe: i.informe || 'PENDIENTE',
      observacion: i.observacion || '',
      convenio: i.convenio || 'P',
      prevision: i.prevision || 'P',
      medico: i.medico || 'P',
      descripcion: i.descripcion || 'P',
      centro: i.centro || 'PABELLON',
      atributo: i.atributo || 'IMPLANTES',
      estado: i.estado || 'AGENDANDO',
      costo: i.costo ?? 0,
      active: i.active !== undefined ? i.active : true
    });
  };

  const cancelarEdicion = () => {
    setEditingId(null);
    setEditingRefPath(null);
    setFormData(getInitialFormState());
  };

  const cargarLogsDeImplante = async (implante) => {
    if (!implante || !implante.refPath) return;
    setSelectedImplanteForLog(implante);
    setLoadingLogs(true);

    try {
      const docRef = doc(db, implante.refPath);
      const logsRef = collection(docRef, "logs");
      const q = query(logsRef, orderBy("timestamp", "desc"));
      const snapshot = await getDocs(q);
      setLogsList(snapshot.docs.map(document => ({ id: document.id, ...document.data() })));
    } catch (error) {
      console.error("Error cargando logs:", error);
      showToast("Error al cargar el historial", "error");
    } finally {
      setLoadingLogs(false);
    }
  };

  const abrirHistorialLogs = async (implante) => {
    setShowLogDrawer(true);
    await cargarLogsDeImplante(implante);
  };

  const handleEjecutarImportacion = async () => {
    if (!importFile) return showToast("Por favor selecciona un archivo para importar", "error");

    setImporting(true);
    try {
      const registros = await parsearArchivoImportacion(importFile);
      if (registros.length === 0) throw new Error("El archivo no contiene registros válidos");

      const BATCH_SIZE = 250;
      let index = 0;

      while (index < registros.length) {
        const chunk = registros.slice(index, index + BATCH_SIZE);
        const batch = writeBatch(db);

        for (const item of chunk) {
          const gestionIdLimpio = (item.gestionId || item.agendaId)?.trim() || 'P';
          const admisionValor = (gestionIdLimpio !== '' && gestionIdLimpio !== 'P') ? gestionIdLimpio : 'SIN_ADMISION';

          const detallesColRef = getDetallesRef(item.fecha, admisionValor, item.empresa);
          const implanteRef = doc(detallesColRef);
          const logRef = doc(collection(implanteRef, "logs"));

          const dataRegistro = {
            gestionId: gestionIdLimpio,
            agendaId: gestionIdLimpio,
            admision: admisionValor,
            nombre: item.nombre || 'P',
            fecha: item.fecha || 'P',
            empresa: item.empresa || 'P',
            informe: item.informe || 'PENDIENTE',
            convenio: item.convenio || 'P',
            prevision: item.prevision || 'P',
            medico: item.medico || 'P',
            descripcion: item.descripcion || 'P',
            centro: item.centro || 'PABELLON',
            atributo: item.atributo || 'IMPLANTES',
            estado: item.estado || 'AGENDANDO',
            costo: Number(item.costo) || 0,
            solicitud: 'PENDIENTE',
            active: true,
            registradoPor: userData?.nombreCompleto || 'Importación Masiva',
            fechaRegistro: new Date()
          };

          batch.set(implanteRef, dataRegistro);

          batch.set(logRef, {
            accion: 'IMPORTACION',
            detalles: dataRegistro,
            active: true,
            usuario: userData?.nombreCompleto || 'Importación Masiva',
            usuarioEmail: userData?.email || '',
            timestamp: serverTimestamp()
          });
        }
        await batch.commit();
        index += BATCH_SIZE;
      }

      showToast(`Se importaron ${registros.length} gestiones con éxito`, "success");
      setImportFile(null);
      setShowConfigDrawer(false);
    } catch (error) {
      console.error("Error al importar:", error);
      showToast("Error al importar: " + error.message, "error");
    } finally {
      setImporting(false);
    }
  };

  return {
    implantes,
    formData,
    setFormData,
    editingId,
    cargando,
    showLogDrawer,
    setShowLogDrawer,
    selectedImplanteForLog,
    logsList,
    loadingLogs,
    showConfigDrawer,
    setShowConfigDrawer,
    sincronizando,
    handleSincronizarVinculados,
    importFile,
    setImportFile,
    importing,
    handleCopiarTexto,
    handleIdChange,
    handleGuardar,
    guardarDesdeDetalle,
    handleDelete,
    iniciarEdicion,
    cancelarEdicion,
    abrirHistorialLogs,
    cargarLogsDeImplante,
    handleExportarDatos: () => exportarGestionesAExcel(implantes, showToast),
    handleDescargarPlantilla: () => descargarPlantillaCSV(showToast),
    handleEjecutarImportacion
  };
};