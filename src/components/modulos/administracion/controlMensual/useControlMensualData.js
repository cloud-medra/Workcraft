import { useState, useEffect, useCallback } from 'react';
import { 
  collection, doc, getDocs, query, where, onSnapshot, arrayUnion, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../../../firebaseConfig';
import { MODULOS, MESES, COLECCIONES } from './constants';
import { calcularTotalMesDesdeDocumentos, guardarSnapshotMensual, invalidarSnapshotMensual } from './snapshotMensual';

// Códigos (del SDK cliente) de los HttpsError que lanza a propósito la Cloud
// Function cerrarPeriodoImputacion; cualquier otro error muestra el genérico.
const CODIGOS_ERROR_CIERRE = [
  'functions/unauthenticated',
  'functions/invalid-argument',
  'functions/permission-denied',
  'functions/failed-precondition'
];
export const MENSAJE_ERROR_CIERRE_GENERICO = 'No se pudo cerrar el mes. Revisa tu conexión e intenta nuevamente.';

export const useControlMensualData = (anioSeleccionado, userData, showToast, confirmAction) => {
  const [estadosModulos, setEstadosModulos] = useState({});
  const [resumenImputaciones, setResumenImputaciones] = useState({});
  const [cargando, setCargando] = useState(true);
  const [procesandoAccion, setProcesandoAccion] = useState(false);

  const obtenerUsuarioLog = useCallback(() => ({
    uid: userData?.uid || '',
    nombre: userData?.nombreCompleto || userData?.displayName || userData?.nombre || userData?.email?.split('@')[0] || 'Usuario Sistema',
    email: userData?.email || ''
  }), [userData]);

  useEffect(() => {
    setCargando(true);
    const q = query(
      collection(db, COLECCIONES.CIERRES),
      where("anio", "==", anioSeleccionado)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datosEstructurados = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.modulo && data.mes) {
          if (!datosEstructurados[data.modulo]) datosEstructurados[data.modulo] = {};
          datosEstructurados[data.modulo][data.mes] = { id: d.id, ...data };
        }
      });
      setEstadosModulos(datosEstructurados);
      setCargando(false);
    }, (error) => {
      console.error("Error al escuchar cierres de períodos:", error);
      showToast("Error al cargar estados de cierres", "error");
      setCargando(false);
    });

    return () => unsubscribe();
  }, [anioSeleccionado, showToast]);

  useEffect(() => {
    let isMounted = true;

    const cargarResumenFacturas = async () => {
      const nuevoResumen = {};
      MODULOS.forEach(mod => { nuevoResumen[mod.id] = {}; });

      try {
        const consultas = [];
        for (const mod of MODULOS) {
          for (const mesObj of MESES) {
            consultas.push((async () => {
              try {
                const docsRef = collection(db, `${mod.id}_imputadas`, String(anioSeleccionado), "meses", mesObj.id, "documentos");
                const snap = await getDocs(docsRef);
                
                let totalMonto = 0;
                snap.docs.forEach(d => { totalMonto += Number(d.data().total || 0); });

                return { modId: mod.id, mesId: mesObj.id, cantidad: snap.size, montoTotal: totalMonto };
              } catch {
                return { modId: mod.id, mesId: mesObj.id, cantidad: 0, montoTotal: 0 };
              }
            })());
          }
        }

        const resultados = await Promise.all(consultas);
        if (!isMounted) return;

        resultados.forEach(item => {
          nuevoResumen[item.modId][item.mesId] = { cantidad: item.cantidad, montoTotal: item.montoTotal };
        });

        setResumenImputaciones(nuevoResumen);
      } catch (error) {
        console.error("Error al obtener resumen de imputaciones:", error);
      }
    };

    cargarResumenFacturas();
    return () => { isMounted = false; };
  }, [anioSeleccionado]);

  const handleAbrirMes = (mesId, modTarget, anioTarget = anioSeleccionado, setAnioSeleccionadoCallback) => {
    const modulosAfectados = Array.isArray(modTarget) 
      ? MODULOS.filter(m => modTarget.includes(m.id))
      : MODULOS.filter(m => m.id === modTarget);

    const modulosNombres = modulosAfectados.map(m => m.nombre).join(', ');

    confirmAction(
      "Abrir Período de Imputación",
      `¿Deseas abrir ${mesId.toUpperCase()} ${anioTarget} para: [${modulosNombres}]?`,
      async () => {
        setProcesandoAccion(true);
        try {
          const usuario = obtenerUsuarioLog();
          const batch = writeBatch(db);

          for (const mod of modulosAfectados) {
            const docId = `${anioTarget}_${mesId}_${mod.id}`;
            
            const qAbiertos = query(
              collection(db, COLECCIONES.CIERRES),
              where("modulo", "==", mod.id),
              where("estado", "in", ["ABIERTO", "REABIERTO"])
            );
            const snapAbiertos = await getDocs(qAbiertos);

            snapAbiertos.docs.forEach(d => {
              if (d.id !== docId) {
                batch.update(doc(db, COLECCIONES.CIERRES, d.id), {
                  estado: 'CERRADO',
                  fechaCierre: serverTimestamp(),
                  usuarioCierre: usuario,
                  cierreAutomatico: true,
                  // firestore.rules solo permite este cierre desde el cliente
                  // si el período indicado queda ABIERTO en este mismo batch.
                  cerradoPorApertura: docId
                });
              }
            });

            const docRef = doc(db, COLECCIONES.CIERRES, docId);
            batch.set(docRef, {
              anio: anioTarget,
              mes: mesId,
              modulo: mod.id,
              estado: 'ABIERTO',
              fechaApertura: serverTimestamp(),
              usuarioApertura: usuario,
            }, { merge: true });

            const periodoActivoRef = doc(db, COLECCIONES.CONFIGURACION, `periodo_activo_${mod.id}`);
            batch.set(periodoActivoRef, {
              mes: mesId,
              anio: anioTarget,
              modulo: mod.id,
              actualizadoEn: serverTimestamp(),
              actualizadoPor: usuario,
            });
          }

          await batch.commit();

          if (anioTarget !== anioSeleccionado && setAnioSeleccionadoCallback) {
            setAnioSeleccionadoCallback(anioTarget);
          }
          showToast(`Mes de ${mesId} abierto para ${modulosNombres}`, 'success');
        } catch (error) {
          console.error("Error al abrir mes:", error);
          showToast("Error al abrir el período", "error");
        } finally {
          setProcesandoAccion(false);
        }
      }
    );
  };

  // Cierre de período: los botones solo ABREN el modal de confirmación en
  // varios pasos (ModalCierreMes); el cierre real lo hace ejecutarCierre,
  // recién cuando el usuario escribió y confirmó el año/mes. La escritura
  // de cierres_periodos pasa por la Cloud Function cerrarPeriodoImputacion,
  // que vuelve a validar el año/mes en el servidor.
  const [solicitudCierre, setSolicitudCierre] = useState(null);

  const handleCerrarMes = (mesId, modId) => {
    setSolicitudCierre({ mesId, modulos: [modId] });
  };

  const handleCerrarTodos = (mesId) => {
    const modulosAbiertos = MODULOS.filter(mod => {
      const estado = estadosModulos[mod.id]?.[mesId]?.estado;
      return estado === 'ABIERTO' || estado === 'REABIERTO';
    });

    if (modulosAbiertos.length === 0) {
      showToast("No hay módulos abiertos para cerrar en este período", "info");
      return;
    }

    setSolicitudCierre({ mesId, modulos: modulosAbiertos.map(m => m.id) });
  };

  const cancelarCierre = () => {
    if (!procesandoAccion) setSolicitudCierre(null);
  };

  // Devuelve { ok, mensaje } para que el modal muestre el resultado; nunca
  // lanza. Si el servidor rechaza el cierre, el período queda sin cambios.
  const ejecutarCierre = async ({ anioIngresado, mesIngresado }) => {
    if (!solicitudCierre) return { ok: false, mensaje: 'No hay un período seleccionado para cerrar.' };
    const { mesId, modulos } = solicitudCierre;
    const nombreMes = MESES.find(m => m.id === mesId)?.nombre || mesId;

    setProcesandoAccion(true);
    try {
      const cerrarPeriodo = httpsCallable(functions, 'cerrarPeriodoImputacion');
      await cerrarPeriodo({ anio: anioSeleccionado, mes: mesId, modulos, anioIngresado, mesIngresado });
    } catch (error) {
      console.error("Error al cerrar mes:", error);
      setProcesandoAccion(false);
      // Solo los HttpsError que lanza cerrarPeriodoImputacion traen un mensaje
      // pensado para el usuario; red, timeout o errores internos no.
      const mensaje = CODIGOS_ERROR_CIERRE.includes(error?.code) && error?.message
        ? error.message
        : MENSAJE_ERROR_CIERRE_GENERICO;
      return { ok: false, mensaje };
    }

    // Snapshot único del total del mes cerrado, para no tener que recalcularlo
    // sumando documentos crudos cada vez que se necesite como "mes anterior".
    // El período ya quedó cerrado: si esto falla, no se informa el cierre
    // como fallido — el snapshot se calcula de forma lazy al consultarlo.
    try {
      await Promise.all(modulos.map(async (modId) => {
        const totalMes = await calcularTotalMesDesdeDocumentos(modId, anioSeleccionado, mesId);
        await guardarSnapshotMensual(modId, anioSeleccionado, mesId, totalMes, 'cierre');
      }));
    } catch (error) {
      console.error("Error al guardar el snapshot del mes cerrado:", error);
      showToast(`El mes se cerró, pero no se pudo guardar el resumen del mes; se calculará al consultarlo.`, 'warning');
    } finally {
      setProcesandoAccion(false);
    }

    return { ok: true, mensaje: `Mes ${nombreMes} ${anioSeleccionado} cerrado correctamente.` };
  };

  const ejecutarReapertura = async (modalReapertura, motivoReapertura, onSuccess) => {
    if (!motivoReapertura.trim()) {
      showToast("Debes ingresar el motivo de la reapertura", "warning");
      return;
    }

    const { mesId, modId } = modalReapertura;
    const usuario = obtenerUsuarioLog();
    setProcesandoAccion(true);

    try {
      const docId = `${anioSeleccionado}_${mesId}_${modId}`;
      const docRef = doc(db, COLECCIONES.CIERRES, docId);
      const registroReapertura = {
        fecha: new Date().toISOString(),
        motivo: motivoReapertura.trim(),
        usuario: usuario
      };

      const batch = writeBatch(db);

      batch.set(docRef, {
        estado: 'REABIERTO',
        fechaReapertura: serverTimestamp(),
        usuarioReapertura: usuario,
        historialReaperturas: arrayUnion(registroReapertura)
      }, { merge: true });

      const periodoActivoRef = doc(db, COLECCIONES.CONFIGURACION, `periodo_activo_${modId}`);
      batch.set(periodoActivoRef, {
        mes: mesId,
        anio: anioSeleccionado,
        modulo: modId,
        actualizadoEn: serverTimestamp(),
        actualizadoPor: usuario,
      });

      await batch.commit();

      // El snapshot cerrado deja de ser confiable: puede haber correcciones
      // retroactivas mientras el período está reabierto. Se invalida y se
      // regenera en el próximo cierre (o vía cálculo lazy si se lee antes).
      await invalidarSnapshotMensual(modId, anioSeleccionado, mesId);

      showToast(`Mes de ${mesId} reabierto correctamente`, 'warning');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error al reabrir mes:", error);
      showToast("Error al reabrir el período", "error");
    } finally {
      setProcesandoAccion(false);
    }
  };

  return {
    estadosModulos,
    resumenImputaciones,
    cargando,
    procesandoAccion,
    handleAbrirMes,
    handleCerrarMes,
    handleCerrarTodos,
    solicitudCierre,
    cancelarCierre,
    ejecutarCierre,
    ejecutarReapertura
  };
};