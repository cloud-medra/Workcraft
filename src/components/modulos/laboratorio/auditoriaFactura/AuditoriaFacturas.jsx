import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, X } from 'lucide-react';
import { collection, getDocs, collectionGroup } from 'firebase/firestore'; //  Corregido

import { db } from "../../../../firebaseConfig";
import { useToast } from "../../../../context/ToastContext";
import Spinner from "../../../ui/Spinner";

import { useAuditoria } from './useAuditoria';
import { Filtros } from './componentes/Filtros';
import { TablaFacturas } from './componentes/TablaFacturas';
import { DetalleFactura } from './componentes/DetalleFactura';

const AuditoriaFacturas = () => {
    const [modoAuditoria, setModoAuditoria] = useState(false);
    const [esConsulta, setEsConsulta] = useState(false);
    const [folioInput, setFolioInput] = useState('');
    const [ordenInput, setOrdenInput] = useState('');

    const [filtroAnio, setFiltroAnio] = useState("");
    const [filtroMes, setFiltroMes] = useState("");
    const [busqueda, setBusqueda] = useState('');

    const logic = useAuditoria();
    const { showToast } = useToast();

    // Efecto para cargar meses cuando cambia el año seleccionado
    useEffect(() => {
        const cargarMeses = async () => {
            if (!filtroAnio) {
                logic.setMesesDisponibles([]);
                return;
            }
            try {
                const snap = await getDocs(collection(db, "laboratorio_auditoria", filtroAnio, "meses"));
                logic.setMesesDisponibles(snap.docs.map(doc => doc.id).sort());
            } catch (e) { console.error("Error al cargar meses", e); }
        };
        cargarMeses();
        setFiltroMes("");
    }, [filtroAnio]);

    // Efecto para recargar la lista si cambian los dropdowns
    useEffect(() => {
        if (filtroAnio && filtroMes) {
            logic.cargarListaAuditorias(filtroAnio, filtroMes);
        } else {
            logic.setListaAuditorias([]);
        }
    }, [filtroAnio, filtroMes]);

    const handleBuscarFolioInterno = async () => {
        if (!folioInput) return showToast("Ingrese un número de folio", "error");
        await logic.buscarFactura(folioInput.trim());
    };

    const handleBuscarOrdenInterno = async () => {
        if (!ordenInput) return showToast("Ingrese un número de orden", "error");
        logic.setCargando(true);
        try {
            const snap = await getDocs(collectionGroup(db, "ordenes"));
            const ordenDoc = snap.docs.find(d => d.id === ordenInput.trim());

            if (!ordenDoc) {
                showToast("Orden no encontrada", "error");
                logic.setOrdenEncontrada(null);
            } else {
                const itemsSnap = await getDocs(collection(ordenDoc.ref, "documentos"));
                const itemsOrden = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Guardamos la orden encontrada normalmente
                const infoOrden = {
                    id: ordenDoc.id,
                    ...ordenDoc.data(),
                    items: itemsOrden
                };
                logic.setOrdenEncontrada(infoOrden);

                // === IDEA CLAVE: Si ya hay una factura cargada, cruzamos los datos AHORA MISMO ===
                if (logic.facturaEncontrada) {
                    const detallesActualizadosConOrden = logic.facturaEncontrada.detalles.map(fila => {
                        const codSistema = String(fila.codigoSistema || "").trim().toUpperCase();

                        // Buscamos el ítem correspondiente en la orden recién traída
                        const itemOrden = itemsOrden.find(i => {
                            const codOrden = String(i["Cod.Artículo"] || i["Cod.Articulo"] || i["codigo"] || "").trim().toUpperCase();
                            return codOrden === codSistema && codSistema !== "N/A";
                        });

                        if (itemOrden) {
                            const cantFactura = parseInt(fila.cantidad || 0);
                            const cantOrden = parseInt(itemOrden["Cant."] || itemOrden["Cantidad"] || 0);
                            const precioFactura = parseFloat(fila.precio || 0);
                            const precioOrden = parseFloat(itemOrden["P.Unitario"] || itemOrden["Precio"] || 0);

                            return {
                                ...fila, // Mantiene su idFila, código original, etc.
                                cantOrden: cantOrden,
                                precioOrden: precioOrden,
                                difCant: cantFactura - cantOrden,
                                difPrecio: precioFactura - precioOrden,
                                enlazadoConOrden: true
                            };
                        }

                        return fila; // Si no coincide, mantiene los datos por defecto creados en el Paso 1
                    });

                    // Actualizamos el estado global de la factura. Ahora mutó y TIENE los datos de la orden.
                    logic.setFacturaEncontrada({
                        ...logic.facturaEncontrada,
                        detalles: detallesActualizadosConOrden
                    });
                }

                showToast("Orden cargada y enlazada correctamente", "success");
            }
        } catch (error) {
            showToast("Error al buscar orden: " + error.message, "error");
        } finally {
            logic.setCargando(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0 relative">
            <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
                <ShieldCheck size={16} className="text-[#0E5B6D]" /> AUDITORÍA DE FACTURAS
            </h2>

            {/* BARRA DE ACCIÓN */}
            <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center gap-4">
                {!modoAuditoria ? (
                    <button
                        onClick={() => {
                            setModoAuditoria(true);
                            setEsConsulta(false); // <-- Es una nueva auditoría, habilitamos búsquedas
                            setFolioInput('');
                            setOrdenInput('');
                        }}
                        className="bg-[#0E5B6D] text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-[#0a4856] transition-colors"
                    >
                        <Plus size={14} /> Nueva Auditoría
                    </button>
                ) : (
                    <div className="flex items-center gap-3 w-full">

                        {/* === IDEA CLAVE: Solo mostramos los buscadores si NO es una consulta === */}
                        {!esConsulta ? (
                            <>
                                <div className="flex items-center gap-1">
                                    <input
                                        value={folioInput}
                                        onChange={e => setFolioInput(e.target.value)}
                                        placeholder="Folio..."
                                        className="h-9 w-32 border border-gray-300 rounded px-3 text-xs focus:ring-1 focus:ring-[#0E5B6D] outline-none"
                                    />
                                    <button onClick={handleBuscarFolioInterno} className="h-9 px-3 bg-[#0E5B6D] text-white rounded text-xs font-bold hover:bg-[#0a4856]">
                                        Buscar Folio
                                    </button>
                                </div>

                                <div className="h-6 w-[1px] bg-gray-300"></div>

                                <div className="flex items-center gap-1">
                                    <input
                                        value={ordenInput}
                                        onChange={e => setOrdenInput(e.target.value)}
                                        placeholder="Orden..."
                                        className="h-9 w-32 border border-gray-300 rounded px-3 text-xs focus:ring-1 focus:ring-[#0E5B6D] outline-none"
                                    />
                                    <button onClick={handleBuscarOrdenInterno} className="h-9 px-3 bg-[#0E5B6D] text-white rounded text-xs font-bold hover:bg-[#0a4856]">
                                        Buscar Orden
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* Si es consulta, mostramos un texto elegante en lugar de los inputs */
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Visualizando Historial de Auditoría
                            </span>
                        )}

                        <button
                            onClick={() => {
                                setModoAuditoria(false);
                                setEsConsulta(false); // <-- Reset del estado
                                logic.setFacturaEncontrada(null);
                                logic.setOrdenEncontrada(null);
                            }}
                            className="ml-auto text-gray-400 hover:text-red-600"
                        >
                            <X size={20} />
                        </button>
                    </div>
                )}
            </div>

            {!modoAuditoria && (
                <Filtros
                    filtroAnio={filtroAnio} setFiltroAnio={setFiltroAnio}
                    filtroMes={filtroMes} setFiltroMes={setFiltroMes}
                    anios={logic.aniosDisponibles} meses={logic.mesesDisponibles}
                    busqueda={busqueda} setBusqueda={setBusqueda}
                />
            )}

            <div className="flex-grow overflow-auto">
                {!modoAuditoria ? (
                    <TablaFacturas
                        lista={logic.listaAuditorias.filter(aud =>
                            String(aud.folio || "").includes(busqueda) ||
                            String(aud.orden || "").includes(busqueda)
                        )}
                        onVerDetalle={(aud) => {
                            setModoAuditoria(true);
                            setEsConsulta(true); // <-- ¡Mucha atención aquí! Activamos el modo consulta
                            logic.setFacturaEncontrada({
                                folio: aud.folio,
                                fchEmis: aud.fechaFolio,
                                rznSoc: aud.empresa,
                                total: aud.totalFactura,
                                detalles: aud.detalles,
                                estado: aud.estado
                            });
                            logic.setOrdenEncontrada({ id: aud.orden, items: [] });
                        }}
                    />
                ) : (
                    <DetalleFactura
                        factura={logic.facturaEncontrada}
                        orden={logic.ordenEncontrada}
                        esConsulta={esConsulta}
                        onGuardar={(detallesCruzados) => logic.guardarAuditoria(setModoAuditoria, detallesCruzados)}
                        onActualizarDatos={async () => {
                            // 1. Llamamos a una función encargada de re-procesar los maestros
                            await logic.reprocesarAuditoriaHistorica();
                            // 2. Apagamos el modo consulta para que el componente recalcule con las reglas de negocio vivas y muestre el botón Guardar
                            setEsConsulta(false);
                        }}
                    />
                )}
            </div>

            {logic.cargando && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
                    <Spinner size="md" />
                </div>
            )}
        </div>
    );
};

export default AuditoriaFacturas;