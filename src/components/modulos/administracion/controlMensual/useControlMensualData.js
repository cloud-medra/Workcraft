import { useState, useEffect, useCallback } from 'react';
import { 
  collection, doc, getDocs, setDoc, query, where, onSnapshot, arrayUnion, serverTimestamp, writeBatch 
} from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { MODULOS, MESES, COLECCIONES } from './constants';

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
                  cierreAutomatico: true
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

  const handleCerrarMes = (mesId, modId) => {
    const modObj = MODULOS.find(m => m.id === modId);

    confirmAction(
      "Cerrar Período de Imputación",
      `Al cerrar ${mesId.toUpperCase()} ${anioSeleccionado} para el módulo de [${modObj?.nombre}], no se podrán ingresar ni modificar documentos en él. ¿Continuar?`,
      async () => {
        setProcesandoAccion(true);
        try {
          const usuario = obtenerUsuarioLog();
          const docId = `${anioSeleccionado}_${mesId}_${modId}`;
          const docRef = doc(db, COLECCIONES.CIERRES, docId);
          
          await setDoc(docRef, {
            anio: anioSeleccionado,
            mes: mesId,
            modulo: modId,
            estado: 'CERRADO',
            fechaCierre: serverTimestamp(),
            usuarioCierre: usuario
          }, { merge: true });

          showToast(`Mes de ${mesId} cerrado para ${modObj?.nombre}`, 'info');
        } catch (error) {
          console.error("Error al cerrar mes:", error);
          showToast("Error al cerrar el período", "error");
        } finally {
          setProcesandoAccion(false);
        }
      }
    );
  };

  const handleCerrarTodos = (mesId) => {
    confirmAction(
      "Cierre Masivo de Período",
      `¿Deseas cerrar TODOS los módulos para el mes de ${mesId.toUpperCase()} ${anioSeleccionado}? Quedarán bloqueados para nuevas imputaciones.`,
      async () => {
        setProcesandoAccion(true);
        try {
          const usuario = obtenerUsuarioLog();
          const batch = writeBatch(db);

          for (const mod of MODULOS) {
            const docId = `${anioSeleccionado}_${mesId}_${mod.id}`;
            const docRef = doc(db, COLECCIONES.CIERRES, docId);
            
            batch.set(docRef, {
              anio: anioSeleccionado,
              mes: mesId,
              modulo: mod.id,
              estado: 'CERRADO',
              fechaCierre: serverTimestamp(),
              usuarioCierre: usuario
            }, { merge: true });
          }

          await batch.commit();
          showToast(`Todos los módulos cerrados para el mes de ${mesId}`, 'info');
        } catch (error) {
          console.error("Error al cerrar todos los módulos:", error);
          showToast("Error al realizar el cierre masivo", "error");
        } finally {
          setProcesandoAccion(false);
        }
      }
    );
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
    ejecutarReapertura
  };
};