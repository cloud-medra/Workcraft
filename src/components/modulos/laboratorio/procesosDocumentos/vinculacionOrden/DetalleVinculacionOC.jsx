// src/components/modulos/laboratorio/procesosDocumentos/vinculacionOrden/DetalleVinculacionOC.jsx
import React, { useState, useEffect } from 'react';
import {
    ArrowLeft,
    FileText,
    Calendar,
    Hash,
    Building2,
    Tag,
    DollarSign,
    Activity,
    ShoppingCart,
    CalendarDays
} from 'lucide-react';
import DrawerSeleccionOC from './DrawerSeleccionOC';

const DetalleVinculacionOC = ({
    documento,
    onVolver,
    onVincular,
    formatearFechaEmision,
    renderBadgeEstadoGeneral
}) => {
    const [detallesProcesados, setDetallesProcesados] = useState([]);
    const [ocVinculadaActiva, setOcVinculadaActiva] = useState(null);
    const [panelAbierto, setPanelAbierto] = useState(false);
    const [ocSeleccionada, setOcSeleccionada] = useState(null);

    useEffect(() => {
        if (documento) {
            setDetallesProcesados(documento.detalles || []);
            const oc = documento.ordenCompraVinculada || documento.ordenCompra || null;
            setOcVinculadaActiva(oc);
            setOcSeleccionada(oc);
        } else {
            setDetallesProcesados([]);
            setOcVinculadaActiva(null);
            setOcSeleccionada(null);
        }
    }, [documento]);

    if (!documento) return null;

    const parseMontoToFloat = (valor) => {
        if (valor === undefined || valor === null || valor === '') return 0;
        if (typeof valor === 'number') return valor;
        const strVal = String(valor).replace(/[^0-9,-]/g, '').replace(',', '.');
        return parseFloat(strVal) || 0;
    };

    const formatearMoneda = (valor) => {
        const monto = parseMontoToFloat(valor);
        return `$${Math.round(monto).toLocaleString('es-CL')}`;
    };

    const normalizarCodigo = (valor) => {
        if (valor === undefined || valor === null) return '';
        let str = String(valor).trim().toLowerCase();
        return str.replace(/\.0+$/, '').replace(/^0+/, '');
    };

    const handleConfirmarVinculacion = () => {
        if (!ocSeleccionada) return;

        const articulosOC = ocSeleccionada.articulosOC || ocSeleccionada.articulos || [];

        if (articulosOC.length === 0) {
            alert("La Orden de Compra seleccionada no contiene artículos cargados.");
            return;
        }

        const nuevosDetalles = (documento.detalles || []).map((item) => {
            const codMaestro = normalizarCodigo(item.codigoMaestro) || normalizarCodigo(item.codigo);

            if (!codMaestro) {
                return {
                    ...item,
                    articuloOC: '-',
                    precioOC: 0,
                    cantidadOC: 0,
                    vincuOC: false,
                    diferenciaCantidad: false,
                    diferenciaPrecio: false,
                    vincuOCTexto: "Sin coincidencia en OC",
                    estadoItem: "Sin Coincidencia"
                };
            }

            const coincidencia = articulosOC.find(art => {
                const codArticuloOC = normalizarCodigo(
                    art["Cod.Artículo"] ||
                    art["Cod.Articulo"] ||
                    art.codigo_articulo ||
                    art.codigoArticulo ||
                    art.codigo
                );
                return codArticuloOC === codMaestro;
            });

            if (coincidencia) {
                const codArticuloOC = coincidencia["Cod.Artículo"] ||
                    coincidencia["Cod.Articulo"] ||
                    coincidencia.codigo_articulo ||
                    coincidencia.codigoArticulo ||
                    coincidencia.codigo ||
                    '-';

                const precioUnitOC = coincidencia.precio_oc ?? parseMontoToFloat(
                    coincidencia["P.Unitario"] ||
                    coincidencia["Precio Net. Unitario"] ||
                    coincidencia["P. Unitario"] ||
                    coincidencia.precio
                );

                const cantOC = coincidencia.cantidad_oc ?? parseMontoToFloat(
                    coincidencia["Cant."] ||
                    coincidencia["Cantidad Pedida"] ||
                    coincidencia["Cantidad"] ||
                    coincidencia.cantidad
                );

                const descMaestro = coincidencia["Descripción"] ||
                    coincidencia["Descripcion"] ||
                    coincidencia.descripcion ||
                    coincidencia.nombre ||
                    item.descripcionMaestro ||
                    item.nombreMaestro ||
                    '';

                const cantDocumento = parseMontoToFloat(item.cantidad);
                const precioDocumento = parseMontoToFloat(item.precio);

                const precioDocumentoRedondeado = Math.round(precioDocumento);
                const precioOCRedondeado = Math.round(precioUnitOC);

                const hayDiferenciaCantidad = Math.abs(cantDocumento - cantOC) > 0.001;
                const hayDiferenciaPrecio = Math.abs(precioDocumentoRedondeado - precioOCRedondeado) > 0;

                let vincuOCTexto = "Sin diferencias";
                if (hayDiferenciaCantidad && hayDiferenciaPrecio) {
                    vincuOCTexto = "Diferencia en cantidad y precio";
                } else if (hayDiferenciaCantidad) {
                    vincuOCTexto = "Diferencia en cantidad";
                } else if (hayDiferenciaPrecio) {
                    vincuOCTexto = "Diferencia en precio";
                }

                const tieneDiferencias = hayDiferenciaCantidad || hayDiferenciaPrecio;

                return {
                    ...item,
                    articuloOC: codArticuloOC,
                    descripcionMaestro: descMaestro || item.descripcionMaestro,
                    precioOC: precioUnitOC,
                    cantidadOC: cantOC,
                    vincuOC: true,
                    diferenciaCantidad: hayDiferenciaCantidad,
                    diferenciaPrecio: hayDiferenciaPrecio,
                    vincuOCTexto,
                    estadoItem: tieneDiferencias ? "Diferencia" : "Vinculado"
                };
            }

            return {
                ...item,
                articuloOC: '-',
                precioOC: 0,
                cantidadOC: 0,
                vincuOC: false,
                diferenciaCantidad: false,
                diferenciaPrecio: false,
                vincuOCTexto: "Sin coincidencia en OC",
                estadoItem: "Sin Coincidencia"
            };
        });

        const totalItems = nuevosDetalles.length;
        const itemsVinculados = nuevosDetalles.filter(d => d.vincuOC).length;
        const itemsConDiferencias = nuevosDetalles.filter(d => d.vincuOC && (d.diferenciaCantidad || d.diferenciaPrecio)).length;

        let estadoGeneral = "Pendiente";

        if (itemsVinculados === 0) {
            estadoGeneral = "Sin Coincidencia";
        } else if (itemsVinculados < totalItems) {
            estadoGeneral = "Vinculación Parcial";
        } else if (itemsConDiferencias > 0) {
            estadoGeneral = "Diferencia Reportada";
        } else {
            estadoGeneral = "Listo para Ingreso";
        }

        setDetallesProcesados(nuevosDetalles);
        setOcVinculadaActiva(ocSeleccionada);
        setPanelAbierto(false);

        if (onVincular) {
            onVincular({
                ordenCompra: ocSeleccionada,
                detallesActualizados: nuevosDetalles,
                estadoGeneral
            });
        }
    };

    return (
        <div className="relative flex flex-col h-full w-full bg-white dark:bg-gray-800 overflow-hidden font-sans">

            <header className="bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-3 py-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onVolver}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded text-slate-600 dark:text-gray-300 flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer"
                        title="Volver a la lista"
                    >
                        <ArrowLeft size={15} className="text-[#2383C2]" />
                        <span>Volver</span>
                    </button>
                    <span className="text-slate-300 dark:text-gray-600">|</span>
                    <FileText className="text-[#2383C2]" size={15} />
                    <span className="text-[12px] font-bold text-slate-800 dark:text-gray-100 tracking-wide uppercase">
                        Vinculación OC — Folio {documento.folio}
                    </span>
                </div>
            </header>

            <div className="px-3 py-2 bg-slate-100/60 dark:bg-gray-900/40 border-b border-slate-200 dark:border-gray-700 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 shrink-0">
                <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                        <Hash size={11} className="text-[#2383C2]" /> Folio
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">{documento.folio}</span>
                </div>

                <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                        <Calendar size={11} className="text-[#2383C2]" /> Fecha Emisión
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
                        {formatearFechaEmision ? formatearFechaEmision(documento.fchEmis) : (documento.fchEmis || '-')}
                    </span>
                </div>

                <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                        <CalendarDays size={11} className="text-[#2383C2]" /> Mes Imputado
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
                        {documento.mesImputado || documento.mes_imputado || '-'}
                    </span>
                </div>

                <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                        <Tag size={11} className="text-[#2383C2]" /> Ref. (OC)
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
                        {ocVinculadaActiva
                            ? `${ocVinculadaActiva.folioCalculado || ocVinculadaActiva.folio || ocVinculadaActiva.id || documento.folioRef || 'N/A'}`
                            : (documento.folioRef ? `${documento.folioRef}` : "N/A")}
                    </span>
                </div>

                <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                        <DollarSign size={11} className="text-[#2383C2]" /> Total Neto
                    </span>
                    <span className="text-[11px] font-bold text-slate-800 dark:text-gray-100 truncate mt-0.5">
                        {formatearMoneda(documento.total)}
                    </span>
                </div>

                <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                        <Activity size={11} className="text-[#2383C2]" /> Estado
                    </span>
                    <div className="mt-0.5">
                        {renderBadgeEstadoGeneral ? renderBadgeEstadoGeneral(documento.estado) : (documento.estado || '-')}
                    </div>
                </div>

                <div className="px-2.5 py-1.5 rounded bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 flex flex-col justify-between">
                    <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-gray-500 flex items-center gap-1">
                        <ShoppingCart size={11} className="text-[#2383C2]" /> Acción
                    </span>
                    <button
                        onClick={() => setPanelAbierto(true)}
                        className="mt-0.5 w-full h-5 bg-[#2383C2] hover:bg-[#1d6fa5] active:bg-[#175b88] text-white rounded text-[10px] font-bold flex items-center justify-center gap-1 transition-colors shadow-xs cursor-pointer"
                    >
                        <ShoppingCart size={11} />
                        <span>Vincular OC</span>
                    </button>
                </div>
            </div>

            <div className="px-3 py-1.5 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 truncate">
                    <Building2 size={13} className="text-[#2383C2] shrink-0" />
                    <span className="text-[9px] font-bold text-slate-400 dark:text-gray-500 uppercase">Receptor:</span>
                    <span className="text-[11px] font-medium text-slate-800 dark:text-gray-200 truncate">{documento.rznSoc}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold shrink-0">
                    Total ítems: <strong className="text-slate-700 dark:text-gray-200">{detallesProcesados.length}</strong>
                </span>
            </div>

            <div className="flex-grow overflow-auto">
                <table className="w-full text-left text-[11px] border-collapse min-w-[1550px]">
                    <thead className="bg-slate-100 dark:bg-gray-900 sticky top-0 z-10 shadow-xs">
                        <tr className="text-slate-600 dark:text-gray-400 uppercase font-bold text-[10px]">
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-10 text-center">#</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-36">Cód. Documento</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700">Descripción</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-16 text-center">Cant.</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-16 text-center">Unidad</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 text-right">P. Unitario</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 text-right">Total Línea</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 bg-slate-200/60 dark:bg-gray-800/80 text-slate-800 dark:text-gray-200">Cód. Maestro</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-48 bg-slate-200/60 dark:bg-gray-800/80 text-slate-800 dark:text-gray-200">Descripción Maestro</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 bg-slate-200/60 dark:bg-gray-800/80 text-right text-slate-800 dark:text-gray-200">Precio Maestro</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-28 bg-blue-100/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200">ArticuloOC</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-24 bg-blue-100/70 dark:bg-blue-950/60 text-right text-blue-900 dark:text-blue-200">Precio OC</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-20 bg-blue-100/70 dark:bg-blue-950/60 text-center text-blue-900 dark:text-blue-200">Cantidad OC</th>
                            <th className="py-1.5 px-2 border-b border-r border-slate-200 dark:border-gray-700 w-36 bg-blue-100/70 dark:bg-blue-950/60 text-center text-blue-900 dark:text-blue-200">Vincu OC</th>
                            <th className="py-1.5 px-2 border-b border-slate-200 dark:border-gray-700 w-28 bg-slate-200/60 dark:bg-gray-800/80 text-center text-slate-800 dark:text-gray-200">Estado Ítem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-gray-700/60 bg-white dark:bg-gray-800">
                        {detallesProcesados.length === 0 ? (
                            <tr>
                                <td colSpan="15" className="py-6 text-center text-slate-400 dark:text-gray-500 text-xs">
                                    Este documento no posee ítems cargados.
                                </td>
                            </tr>
                        ) : (
                            detallesProcesados.map((item, idx) => {
                                const descMaestroText = item.descripcionMaestro || item.nombreMaestro || item.descripcion_maestro || '-';
                                return (
                                    <tr key={item.id || item.codigo || idx} className="hover:bg-slate-50 dark:hover:bg-gray-700/40">
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-500 text-center font-bold">{idx + 1}</td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-500">{item.codigo || '-'}</td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-slate-800 dark:text-gray-200 font-medium">{item.nombre}</td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center">{item.cantidad}</td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center text-[10px] uppercase">{item.unidad || '-'}</td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right">{formatearMoneda(item.precio)}</td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right font-bold">{formatearMoneda(item.monto)}</td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-semibold bg-slate-50/50 dark:bg-gray-900/30">{item.codigoMaestro || '-'}</td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 bg-slate-50/50 dark:bg-gray-900/30 text-slate-700 dark:text-gray-300 truncate max-w-[200px]" title={descMaestroText}>
                                            {descMaestroText}
                                        </td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right font-semibold bg-slate-50/50 dark:bg-gray-900/30">
                                            {item.precioMaestro !== undefined && item.precioMaestro !== null ? formatearMoneda(item.precioMaestro) : '-'}
                                        </td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 font-semibold bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                                            {item.articuloOC || item.codArticuloOC || item.articulo_oc || '-'}
                                        </td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-right font-semibold bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                                            {item.precioOC !== null && item.precioOC !== undefined
                                                ? formatearMoneda(item.precioOC)
                                                : '-'
                                            }
                                        </td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center font-semibold bg-blue-50/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-300">
                                            {item.cantidadOC !== null && item.cantidadOC !== undefined ? item.cantidadOC : '-'}
                                        </td>
                                        <td className="py-1 px-2 border-b border-r border-slate-200 dark:border-gray-700/70 text-center bg-blue-50/40 dark:bg-blue-950/20">
                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap ${item.vincuOCTexto === "Sin diferencias"
                                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                : item.vincuOCTexto === "Sin coincidencia en OC"
                                                    ? "bg-slate-100 text-slate-500 dark:bg-gray-700 dark:text-gray-400"
                                                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                }`}>
                                                {item.vincuOCTexto || "-"}
                                            </span>
                                        </td>
                                        <td className="py-1 px-2 border-b border-slate-200 dark:border-gray-700 text-center bg-slate-50/50 dark:bg-gray-900/30">
                                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${item.estadoItem === 'Vinculado'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                                : item.estadoItem === 'Diferencia'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                                    : 'bg-slate-100 text-slate-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}>
                                                {item.estadoItem || 'Pendiente'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <DrawerSeleccionOC
                panelAbierto={panelAbierto}
                setPanelAbierto={setPanelAbierto}
                ocSeleccionada={ocSeleccionada}
                setOcSeleccionada={setOcSeleccionada}
                onConfirmar={handleConfirmarVinculacion}
            />

        </div>
    );
};

export default DetalleVinculacionOC;