import { useState, useEffect } from 'react';
import { db } from '../../../../firebaseConfig';
import { useToast } from '../../../../context/ToastContext';
// CORRECCIÓN: Agregamos 'getDoc' a la lista de imports de Firebase
import { collectionGroup, getDocs, getDoc, collection, query, where, writeBatch, serverTimestamp, doc } from 'firebase/firestore';
import { NOMBRES_MESES } from './utils/constantes';

export const useAuditoria = () => {
    const [cargando, setCargando] = useState(false);
    const [facturaEncontrada, setFacturaEncontrada] = useState(null);
    const [ordenEncontrada, setOrdenEncontrada] = useState(null);
    const [listaAuditorias, setListaAuditorias] = useState([]);
    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [mesesDisponibles, setMesesDisponibles] = useState([]);
    const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState(null);
    const { showToast } = useToast();

    // Carga inicial de años
    useEffect(() => {
        const cargarAnios = async () => {
            try {
                const snap = await getDocs(collection(db, "laboratorio_auditoria"));
                setAniosDisponibles(snap.docs.map(d => d.id).sort((a, b) => b - a));
            } catch (e) { console.error(e); }
        };
        cargarAnios();
    }, []);

    const buscarFactura = async (folio) => {
        setCargando(true);
        try {
            const q = query(collectionGroup(db, "documentos"), where("folio", "==", folio));
            const snap = await getDocs(q);
            if (snap.empty) throw new Error("Factura no encontrada");

            const docData = snap.docs[0].data();
            const codigosSnap = await getDocs(collection(db, "laboratorio_codigos"));
            const listaCodigos = codigosSnap.docs.map(d => d.data());

            const detallesEnriquecidos = docData.detalles.map((detalle, index) => {
                const match = listaCodigos.find(c => c.referencia === detalle.codigo);

                return {
                    idFila: `fila_${index}_${detalle.codigo || 'sin-codigo'}`,
                    ...detalle,
                    codigoSistema: match?.codigo || 'N/A',
                    precioSistema: match?.precio || 0,
                    cantOrden: 0,
                    precioOrden: 0,
                    difCant: parseInt(detalle.cantidad || 0),
                    difPrecio: parseFloat(detalle.precio || 0),
                    enlazadoConOrden: false
                };
            });

            setFacturaEncontrada({ ...docData, detalles: detallesEnriquecidos });
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setCargando(false);
        }
    };

    const guardarAuditoria = async (setModoAuditoria, detallesCruzados) => {
        if (!facturaEncontrada || !ordenEncontrada) return;
        setCargando(true);
        try {
            const fecha = new Date();
            const anio = fecha.getFullYear().toString();
            const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
            const batch = writeBatch(db);

            const anioRef = doc(db, "laboratorio_auditoria", anio);
            const mesRef = doc(db, "laboratorio_auditoria", anio, "meses", mes);
            const factRef = doc(db, "laboratorio_auditoria", anio, "meses", mes, "facturas", `${facturaEncontrada.folio}`);

            batch.set(anioRef, { active: true }, { merge: true });
            batch.set(mesRef, { active: true, nombre: NOMBRES_MESES[mes] }, { merge: true });

            // =========================================================================
            // LÓGICA DE AUDITORÍA: EVALUACIÓN DEL ESTADO GENERAL
            // =========================================================================
            let tieneDatosVacios = false;
            let tieneDiferencias = false;

            detallesCruzados.forEach(fila => {
                if (!fila.codigoSistema || fila.codigoSistema === "N/A") {
                    tieneDatosVacios = true;
                }

                const hayDescuadreCant = fila.difCant !== 0;
                const hayDescuadrePrecio = Math.abs(fila.difPrecio || 0) > 1;

                if (hayDescuadreCant || hayDescuadrePrecio) {
                    tieneDiferencias = true;
                }
            });

            let estadoCalculado = "AUDITADO";

            if (tieneDatosVacios) {
                estadoCalculado = "POR ACTUALIZAR";
            } else if (tieneDiferencias) {
                estadoCalculado = "CON DIFERENCIAS";
            }
            // =========================================================================

            batch.set(factRef, {
                folio: facturaEncontrada.folio,
                fechaFolio: facturaEncontrada.fchEmis || "",
                orden: ordenEncontrada.id,
                totalFactura: facturaEncontrada.total || 0,
                empresa: facturaEncontrada.rznSoc || "",
                active: true,
                estado: estadoCalculado,
                detalles: detallesCruzados,
                fechaAuditoria: serverTimestamp()
            });

            await batch.commit();

            if (estadoCalculado === "POR ACTUALIZAR") {
                showToast("Guardado. Alerta: Requiere actualizar códigos del sistema.", "warning");
            } else if (estadoCalculado === "CON DIFERENCIAS") {
                showToast("Guardado. Alerta: Se detectaron discrepancias en la auditoría.", "warning");
            } else {
                showToast("Auditoría finalizada con éxito. Todo cuadra.", "success");
            }

            setModoAuditoria(false);
            setFacturaEncontrada(null);
            setOrdenEncontrada(null);
        } catch (e) {
            showToast("Error al guardar: " + e.message, "error");
        } finally {
            setCargando(false);
        }
    };

    const cargarListaAuditorias = async (anio, mes) => {
        if (!anio || !mes) return;
        setCargando(true);
        try {
            const ref = collection(db, "laboratorio_auditoria", anio, "meses", mes, "facturas");
            const snap = await getDocs(ref);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setListaAuditorias(data);
        } catch (e) {
            console.error("Error al cargar auditorías:", e);
        } finally {
            setCargando(false);
        }
    };

    const reprocesarAuditoriaHistorica = async () => {
        if (!facturaEncontrada) return;
        setCargando(true);
        try {
            // 1. Descargar ítems reales de la orden de compra original
            const ordenId = ordenEncontrada?.id;
            let ordenItemsActuales = [];
            
            if (ordenId) {
                const ordenDoc = await getDoc(doc(db, "laboratorio_ordenes", String(ordenId)));
                if (ordenDoc.exists()) {
                    ordenItemsActuales = ordenDoc.data().items || [];
                    // Actualizamos el estado de la orden por si acaso
                    setOrdenEncontrada({ id: ordenId, items: ordenItemsActuales });
                }
            }

            // 2. Traer el maestro completo de códigos actualizado
            const codigosSnap = await getDocs(collection(db, "laboratorio_codigos"));
            const listaCodigos = codigosSnap.docs.map(d => d.data());

            // 3. Cruzar códigos del sistema Y ADEMÁS cruzar con la Orden de Compra de inmediato
            const detallesActualizados = facturaEncontrada.detalles.map((det) => {
                const codigoLimpio = String(det.codigo || "").trim().toUpperCase();
                const matchCodigo = listaCodigos.find(c => String(c.referencia || "").trim().toUpperCase() === codigoLimpio);

                // Determinamos el código y precio del sistema actualizado
                const nuevoCodigoSistema = matchCodigo ? (matchCodigo.codigo || "N/A") : "N/A";
                const nuevoPrecioSistema = matchCodigo ? parseFloat(matchCodigo.precio || 0) : 0;

                // Buscamos el ítem correspondiente en la Orden de Compra usando el nuevo código del sistema
                const itemOrden = ordenItemsActuales.find(i => {
                    const codOrden = String(i["Cod.Artículo"] || i["Cod.Articulo"] || i["codigo"] || "").trim().toUpperCase();
                    return codOrden === nuevoCodigoSistema && nuevoCodigoSistema !== "N/A";
                });

                if (itemOrden) {
                    const cantFactura = parseInt(det.cantidad || 0);
                    const cantOrden = parseInt(itemOrden["Cant."] || itemOrden["Cantidad"] || 0);
                    const precioFactura = parseFloat(det.precio || 0);
                    const precioOrden = parseFloat(itemOrden["P.Unitario"] || itemOrden["Precio"] || 0);

                    return {
                        ...det,
                        codigoSistema: nuevoCodigoSistema,
                        precioSistema: nuevoPrecioSistema,
                        cantOrden,
                        precioOrden,
                        difCant: cantFactura - cantOrden,
                        difPrecio: precioFactura - precioOrden,
                        enlazadoConOrden: true
                    };
                }

                // Si no se enlaza con la orden, dejamos los valores base
                return {
                    ...det,
                    codigoSistema: nuevoCodigoSistema,
                    precioSistema: nuevoPrecioSistema,
                    cantOrden: 0,
                    precioOrden: 0,
                    difCant: parseInt(det.cantidad || 0),
                    difPrecio: parseFloat(det.precio || 0),
                    enlazadoConOrden: false
                };
            });

            // 4. Forzar la actualización del estado local con TODO ya calculado
            setFacturaEncontrada(prev => ({
                ...prev,
                detalles: detallesActualizados,
                estado: undefined 
            }));

            showToast("Datos de códigos y orden recalculados con éxito.", "success");
        } catch (e) {
            showToast("Error al sincronizar: " + e.message, "error");
        } finally {
            setCargando(false);
        }
    };

    return {
        cargando, setCargando, facturaEncontrada, ordenEncontrada, setFacturaEncontrada, setOrdenEncontrada,
        guardarAuditoria, buscarFactura, aniosDisponibles, mesesDisponibles, setMesesDisponibles,
        listaAuditorias, setListaAuditorias, setAuditoriaSeleccionada, cargarListaAuditorias, reprocesarAuditoriaHistorica
    };
};