import { useEffect, useState } from 'react';
import { collectionGroup, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';
import { ESTADOS_PROCESO, normalizarEstadoProceso } from './estadosProceso';

const ESTADOS_EXCLUIDOS = [ESTADOS_PROCESO.RECHAZADA];
// Suman igual, pero el monto es "temporal": hay una diferencia por resolver en la OC.
const ESTADOS_TEMPORALES = [ESTADOS_PROCESO.DIFERENCIA_REPORTADA, ESTADOS_PROCESO.SOLICITUD_ENVIADA];
// Estados definitivos: sin diferencias (Listo para Ingreso; Finalizado = ya ingresada/imputada).
const ESTADOS_FINALES = [ESTADOS_PROCESO.LISTO_PARA_INGRESO, ESTADOS_PROCESO.FINALIZADO];

const parseNumero = (valor) => {
    if (valor === undefined || valor === null || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    const strVal = String(valor).replace(/[^0-9,-]/g, '').replace(',', '.');
    return parseFloat(strVal) || 0;
};

// Misma normalización que usa la vinculación (DetalleVinculacionOC) para cruzar códigos.
export const normalizarCodigo = (valor) => {
    if (valor === undefined || valor === null) return '';
    return String(valor).trim().toLowerCase().replace(/\.0+$/, '').replace(/^0+/, '');
};

/**
 * Acumulado facturado por código de una orden de `colDocumentos`
 * ("laboratorio_documentos" o "vacunatorio_documentos"). Se calcula siempre desde las facturas
 * vinculadas (fuente de verdad), así que si una vinculación cambia o se elimina, el
 * acumulado se recalcula solo.
 *
 * Devuelve { porCodigo, cargando, error } donde porCodigo[codigoNormalizado] =
 * { cantidadFacturada, tieneTemporal, todosFinales, documentos: [{ id, folio, cantidad, estado, temporal }] }.
 */
export const useFacturacionOrden = (ordenId, colDocumentos) => {
    const [porCodigo, setPorCodigo] = useState({});
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!ordenId || !colDocumentos) {
            setPorCodigo({});
            setError(null);
            return;
        }
        setCargando(true);
        setError(null);

        const q = query(
            collectionGroup(db, "documentos"),
            where("ordenCompraVinculada.id", "==", String(ordenId))
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const acumulado = {};

            snap.forEach((d) => {
                // "documentos" también existe en imputadas (copia), órdenes y vacunatorio.
                if (d.ref.path.split('/')[0] !== colDocumentos) return;
                const data = d.data();
                const estado = normalizarEstadoProceso(data.estado);
                if (ESTADOS_EXCLUIDOS.includes(estado)) return;

                const folio = data.folio || d.id;
                (data.detalles || []).forEach((item) => {
                    if (!item.vincuOC) return;
                    const cod = normalizarCodigo(item.articuloOC);
                    if (!cod) return;

                    const entrada = acumulado[cod] || (acumulado[cod] = { cantidadFacturada: 0, documentos: [] });
                    const cantidad = parseNumero(item.cantidad);
                    entrada.cantidadFacturada += cantidad;

                    const existente = entrada.documentos.find(x => x.id === d.id);
                    if (existente) existente.cantidad += cantidad;
                    else entrada.documentos.push({ id: d.id, folio, cantidad, estado: data.estado || '', temporal: ESTADOS_TEMPORALES.includes(estado) });
                });
            });

            Object.values(acumulado).forEach((e) => {
                e.tieneTemporal = e.documentos.some(x => x.temporal);
                e.todosFinales = e.documentos.length > 0 && e.documentos.every(x => ESTADOS_FINALES.includes(normalizarEstadoProceso(x.estado)));
            });

            setPorCodigo(acumulado);
            setCargando(false);
        }, (err) => {
            console.error("ERROR EN SNAPSHOT FACTURACION ORDEN:", err);
            setError(err);
            setCargando(false);
        });

        return unsubscribe;
    }, [ordenId, colDocumentos]);

    return { porCodigo, cargando, error };
};
