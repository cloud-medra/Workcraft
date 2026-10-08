// Pestañas de "Control de Procesos" (Laboratorio y Vacunatorio son gemelos
// estructurales: mismas 8 fases, mismas claves). Cada pestaña es un
// `proceso` con SUS PROPIAS secciones: la pestaña aparece si su ruta existe
// en permisosGranulares (hasAccesoProceso) y su contenido se controla con
// hasPermission(rutaDeLaPestaña, ...) desde el componente de cada fase.
//
// Antes las 8 fases compartían filtros_busqueda / tabla_documentos /
// acciones_detalle en la ruta del orquestador. Las claves se conservaron
// con el mismo nombre para que functions/scripts/migrarPermisosGranulares.js
// pueda copiar a cada pestaña las restricciones que el usuario ya tenía
// (solo las claves que esa pestaña consultaba antes; ver CLAVES_HEREDADAS).

import { columnas } from './columnas.js';

// Columnas de cada tabla (`col_<key>`, mismas keys que COLUMNAS_TABLA de cada
// componente; coberturaPermisos.test.js verifica que coincidan).
const COLS_DOCS_COMPLETA = [
  ['folio', 'Folio'], ['emision', 'Emisión'], ['ref', 'Ref.'], ['razonSocial', 'Razón Social'],
  ['total', 'Total (Neto)'], ['estado', 'Estado'], ['orden', 'Orden'], ['acta', 'Acta'],
  ['salida', 'Salida'], ['mesImputado', 'Mes imputado'], ['acciones', 'Acciones'],
];
const COLS_DOCS_CON_DETALLE = [
  ['folio', 'Folio'], ['emision', 'Emisión'], ['mesImputacion', 'Mes Imputación'], ['ref', 'Ref. (OC)'],
  ['razonSocial', 'Razón Social'], ['total', 'Total (Neto)'], ['estado', 'Estado'], ['acciones', 'Acciones'],
];
const COLS_DETALLE_XML = [
  ['linea', '#'], ['codigo', 'Cód.'], ['descripcion', 'Descripción'], ['cantidad', 'Cant.'],
  ['unidad', 'Unidad'], ['precioUnitario', 'P. Unitario'], ['totalLinea', 'Total Línea'],
];
const COLS_DIFERENCIAS = (ultima) => [
  ['linea', '#'], ['codigoDoc', 'Cód. Documento'], ['descripcionDoc', 'Descripción Documento'],
  ['cantidadDoc', 'Cant. Documento'], ['precioDoc', 'Precio Documento'], ['totalLinea', 'Total Línea'],
  ['codigoMaestro', 'Cód. Maestro'], ['descripcionMaestro', 'Descripción Maestro'], ['articuloOC', 'Artículo OC'],
  ['cantidadOC', 'Cant. OC'], ['precioOC', 'Precio OC'], ultima,
];
const COLS_VISUALIZADOR_IMPUTADO = [
  ['linea', 'Lin.'], ['codigoDoc', 'Código Doc.'], ['codigoMaestro', 'Cód. Maestro'], ['nombreItem', 'Nombre Ítem'],
  ['descripcionMaestro', 'Descripción Maestro'], ['cantidad', 'Cant.'], ['monto', 'Monto'], ['estado', 'Estado'],
];

const seccionTabla = (label, lista, extra = {}) => ({ label, elements: { ...extra, ...columnas(lista) } });

export const COLS_DETALLE_DOCUMENTO_XML = COLS_DETALLE_XML;

const filtros = (conMes) => ({
  label: 'Sección: Filtros y Búsqueda',
  elements: {
    input_busqueda: { label: 'Campo: Búsqueda de Texto' },
    select_anio: { label: 'Campo: Filtro por Año' },
    ...(conMes ? { select_mes: { label: 'Campo: Filtro por Mes' } } : {}),
  },
});

const tablaCompleta = seccionTabla('Sección: Tabla de Documentos', COLS_DOCS_COMPLETA, {
  btn_ver: { label: 'Operación: Ver Detalle' },
  btn_configurar: { label: 'Operación: Configurar / Editar documento' },
  btn_eliminar: { label: 'Operación: Eliminar' },
  btn_log: { label: 'Operación: Ver Historial / Logs' },
});

const tablaConDetalle = (mes = 'Mes Imputación', ref = 'Ref. (OC)') => seccionTabla(
  'Sección: Tabla de Documentos',
  COLS_DOCS_CON_DETALLE.map(([k, l]) => [k, k === 'mesImputacion' ? mes : k === 'ref' ? ref : l]),
  { btn_ver: { label: 'Operación: Abrir Detalle del documento' } }
);

const acciones = (elements) => ({ label: 'Sección: Acciones', elements });

const PESTANAS = {
  documentosRecibidos: {
    label: 'Pestaña: Documentos Recibidos',
    sections: {
      filtros_busqueda: filtros(true),
      tabla_documentos: tablaCompleta,
      detalle_documento: seccionTabla('Sección: Detalle del documento (Ver Detalle)', COLS_DETALLE_XML),
      tabla_edicion: seccionTabla('Sección: Tabla de ítems al Configurar', [
        ['linea', '#'], ['codigo', 'Código'], ['descripcion', 'Descripción / Nombre'], ['cantidad', 'Cant.'],
        ['unidad', 'Unidad'], ['precioUnitario', 'P. Unitario'], ['totalLinea', 'Total Línea'], ['accion', 'Acción'],
      ]),
    },
  },
  iniciarProcesos: {
    label: 'Pestaña: Ingreso de Folios',
    sections: {
      filtros_busqueda: filtros(false),
      tabla_documentos: seccionTabla('Sección: Tabla de Documentos', [
        ['folio', 'Folio'], ['emision', 'Emisión'], ['ref', 'Ref.'], ['razonSocial', 'Razón Social'],
        ['total', 'Total (Neto)'], ['estado', 'Estado'],
      ]),
      acciones_proceso: {
        label: 'Sección: Acciones',
        elements: { btn_iniciar_proceso: { label: 'Acción: Iniciar Proceso de los folios seleccionados' } },
      },
    },
  },
  vinculacionCodigos: {
    label: 'Pestaña: Vinculación de Códigos',
    sections: {
      filtros_busqueda: filtros(false),
      tabla_documentos: tablaConDetalle('Mes Imputación', 'Ref.'),
      tabla_detalle: seccionTabla('Sección: Tabla de ítems del detalle', [
        ['linea', '#'], ['codigoDoc', 'Cód. Documento'], ['descripcion', 'Descripción'], ['cantidad', 'Cant.'],
        ['unidad', 'Unidad'], ['precioUnitario', 'P. Unitario'], ['totalLinea', 'Total Línea'],
        ['codigoMaestro', 'Cód. Maestro'], ['descripcionMaestro', 'Descripción Maestro'],
        ['precioMaestro', 'Precio Maestro'], ['estadoItem', 'Estado Ítem'],
      ]),
      acciones_detalle: acciones({ btn_vincular: { label: 'Acción: Vincular Código' } }),
    },
  },
  vinculacionOrdenes: {
    label: 'Pestaña: Vinculación de Órdenes',
    sections: {
      filtros_busqueda: filtros(false),
      tabla_documentos: tablaConDetalle('Mes Imputado', 'Ref.'),
      tabla_detalle: seccionTabla('Sección: Tabla de ítems del detalle', [
        ['linea', '#'], ['codigoDoc', 'Cód. Documento'], ['descripcion', 'Descripción'], ['cantidad', 'Cant.'],
        ['unidad', 'Unidad'], ['precioUnitario', 'P. Unitario'], ['totalLinea', 'Total Línea'],
        ['codigoMaestro', 'Cód. Maestro'], ['descripcionMaestro', 'Descripción Maestro'],
        ['precioMaestro', 'Precio Maestro'], ['articuloOC', 'Artículo OC'], ['precioOC', 'Precio OC'],
        ['cantidadOC', 'Cantidad OC'], ['vinculoOC', 'Vínculo OC'], ['estadoItem', 'Estado Ítem'],
      ]),
      acciones_detalle: acciones({ btn_vincular_oc: { label: 'Acción: Vincular Orden de Compra' } }),
    },
  },
  solicitudDiferencias: {
    label: 'Pestaña: Solicitud Diferencias',
    sections: {
      filtros_busqueda: filtros(false),
      tabla_documentos: tablaConDetalle(),
      tabla_detalle: seccionTabla('Sección: Tabla de ítems del detalle (también filtra las exportaciones)', COLS_DIFERENCIAS(['estadoDiscrepancia', 'Estado Discrepancia'])),
      acciones_detalle: acciones({
        btn_exportar_todo: { label: 'Acción: Exportar Todo (cambia estado y registra log)' },
        btn_exportar_solicitud: { label: 'Acción: Exportar Solicitud Excel del documento' },
      }),
    },
  },
  documentosListos: {
    label: 'Pestaña: Documentos Listos',
    sections: {
      filtros_busqueda: filtros(false),
      tabla_documentos: tablaConDetalle(),
      tabla_detalle: seccionTabla('Sección: Tabla de ítems del detalle', COLS_DIFERENCIAS(['estadoItem', 'Estado Ítem'])),
      acciones_detalle: acciones({ btn_finalizar_acta: { label: 'Acción: Añadir Acta / Finalizar documento' } }),
    },
  },
  documentosImputados: {
    label: 'Pestaña: Documentos Imputados',
    sections: {
      filtros_busqueda: filtros(true),
      tabla_documentos: tablaCompleta,
      tabla_detalle: seccionTabla('Sección: Tabla de ítems (Ver Detalle)', COLS_VISUALIZADOR_IMPUTADO),
      tabla_edicion: seccionTabla('Sección: Tabla de ítems al Configurar', [
        ['linea', 'Lin.'], ['codigoDoc', 'Código Doc.'], ['codigoMaestro', 'Cód. Maestro'], ['nombreItem', 'Nombre Ítem'],
        ['cantidad', 'Cant.'], ['monto', 'Monto ($)'], ['estado', 'Estado'],
      ]),
    },
  },
  documentosEdicion: {
    label: 'Pestaña: Edición',
    sections: {
      filtros_busqueda: filtros(true),
      tabla_documentos: tablaCompleta,
      tabla_detalle: seccionTabla('Sección: Tabla de ítems (Ver Detalle)', COLS_VISUALIZADOR_IMPUTADO),
      tabla_edicion: seccionTabla('Sección: Tabla de ítems al Configurar', [
        ['linea', 'Lin.'], ['codigoDoc', 'Código Doc.'], ['codigoMaestro', 'Cód. Maestro'], ['nombreItem', 'Nombre Ítem'],
        ['cantidadDoc', 'Cant. Doc.'], ['cantidadOC', 'Cant. OC'], ['montoDoc', 'Monto Doc. ($)'], ['precioOC', 'Precio OC ($)'],
        ['difCantidad', 'Dif. Cant.'], ['difPrecio', 'Dif. Precio'], ['estadoItem', 'Estado Ítem'],
      ]),
    },
  },
};

// Claves que cada pestaña YA consultaba en la ruta del orquestador antes de
// tener permisos propios ("seccion" = visibilidad de la sección,
// "seccion.elemento" = elemento). Las usa el script de migración para no
// sumar restricciones nuevas: ej. btn_ver=false en el orquestador solo
// aplicaba a Recibidos/Imputados/Edición, no al detalle de Vinculación.
const BASICAS = ['filtros_busqueda', 'filtros_busqueda.input_busqueda', 'filtros_busqueda.select_anio', 'tabla_documentos'];
const COMPLETAS = [...BASICAS, 'filtros_busqueda.select_mes', 'tabla_documentos.btn_ver', 'tabla_documentos.btn_configurar', 'tabla_documentos.btn_eliminar', 'tabla_documentos.btn_log'];
export const CLAVES_HEREDADAS = {
  documentosRecibidos: COMPLETAS,
  iniciarProcesos: BASICAS,
  vinculacionCodigos: [...BASICAS, 'acciones_detalle', 'acciones_detalle.btn_vincular'],
  vinculacionOrdenes: BASICAS,
  solicitudDiferencias: BASICAS,
  documentosListos: BASICAS,
  documentosImputados: COMPLETAS,
  documentosEdicion: COMPLETAS,
};

// { '<base>/<pestaña>': { label, sections } } para el `procesos` del orquestador.
export const construirProcesosControl = (base) =>
  Object.fromEntries(Object.entries(PESTANAS).map(([clave, config]) => [`${base}/${clave}`, config]));
