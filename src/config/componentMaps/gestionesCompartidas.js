import { columnas } from './columnas.js';
import { COLS_DETALLE_DOCUMENTO_XML } from './controlProcesos.js';

// Pantallas gemelas de Laboratorio y Vacunatorio (mismo código y mismas
// claves de hasPermission en ambos módulos): Maestro Códigos, Órdenes y
// Documentos XML. `nombre` solo cambia el texto de los labels.

// Convención de nombres distinta al resto (header/formulario/busqueda/
// tabla en vez de header/formulario_registro/barra_busqueda/tabla_datos):
// se documenta tal cual está en el código, para no desincronizar las claves.
export const mapaCodigos = (nombre) => ({
  label: `Maestro Códigos de ${nombre} (Codigo${nombre}.jsx)`,
  sections: {
    header: {
      label: 'Sección: Encabezado',
      elements: {
        btn_configuracion: { label: 'Acción: Botón Configuración (Importar/Exportar)' },
      },
    },
    formulario: {
      label: 'Sección: Formulario de Registro',
      elements: {
        ver_seccion: { label: 'Visibilidad general del formulario' },
        input_referencia: { label: 'Campo: Referencia' },
        input_codigo: { label: 'Campo: Código' },
        input_precio: { label: 'Campo: Precio' },
        input_descripcion: { label: 'Campo: Descripción' },
        btn_registrar: { label: 'Acción: Botón Registrar/Actualizar' },
        btn_cancelar: { label: 'Acción: Botón Cancelar' },
      },
    },
    busqueda: {
      label: 'Sección: Filtro y Búsqueda',
      elements: {
        barra_busqueda: { label: 'Visibilidad general de la barra de búsqueda' },
        input_busqueda: { label: 'Campo: Búsqueda de Texto' },
      },
    },
    tabla: {
      label: 'Sección: Tabla de Resultados',
      elements: {
        ver_tabla: { label: 'Visibilidad general de la tabla' },
        col_referencia: { label: 'Columna: Referencia' },
        col_codigo: { label: 'Columna: Código' },
        col_descripcion: { label: 'Columna: Descripción' },
        col_precio: { label: 'Columna: Precio' },
        col_acciones: { label: 'Columna: Acciones (contenedor de botones)' },
        btn_log: { label: 'Operación: Ver Historial (Logs)' },
        btn_editar: { label: 'Operación: Editar' },
        btn_eliminar: { label: 'Operación: Eliminar' },
      },
    },
    drawer_configuracion: {
      label: 'Sección: Drawer de Configuración (Importar/Exportar)',
      elements: {
        btn_exportar: { label: 'Acción: Exportar a Excel/CSV' },
        btn_descargar_plantilla: { label: 'Acción: Descargar Plantilla CSV' },
        input_archivo: { label: 'Campo: Selector de Archivo a Importar' },
        btn_importar: { label: 'Acción: Botón Cargar Registro (ejecutar importación)' },
      },
    },
  },
});

export const mapaOrdenes = (nombre) => ({
  label: `Órdenes de Compra de ${nombre} (Orden${nombre}.jsx)`,
  sections: {
    cabecera_acciones: {
      label: 'Sección: Encabezado',
      elements: {
        btn_importar: { label: 'Acción: Importar Orden desde Excel' },
      },
    },
    listado: {
      label: 'Sección: Listado de Órdenes',
      elements: {
        input_buscar: { label: 'Campo: Búsqueda por N°, RUT o Proveedor' },
        select_anio: { label: 'Campo: Filtro por Año' },
        select_mes: { label: 'Campo: Filtro por Mes' },
        action_ver_detalle: { label: 'Operación: Ver Detalle de la orden' },
        ...columnas([
          ['nro', 'Nro.Orden'], ['fecha', 'F.Orden'], ['rut', 'Rut Proveedor'], ['proveedor', 'Proveedor'],
          ['items', 'Items'], ['total', 'Total'], ['acciones', 'Acciones'],
        ]),
      },
    },
    detalle_orden: {
      label: 'Sección: Detalle de la Orden',
      elements: columnas([
        ['codigo', 'Código'], ['descripcion', 'Descripción del Artículo'], ['cantidad', 'Cant.'],
        ['precio', 'Precio Unit.'], ['subtotal', 'Subtotal'], ['documento', 'N° Documento'],
        ['facturada', 'Cant. Facturada'], ['pendiente', 'Cant. Pendiente'],
      ]),
    },
  },
});

export const mapaXml = (nombre) => ({
  label: `Documentos XML de ${nombre} (XmlDoc${nombre}.jsx)`,
  sections: {
    cabecera_acciones: {
      label: 'Sección: Encabezado',
      elements: {
        btn_importar_xml: { label: 'Acción: Importar XML' },
      },
    },
    filtros_busqueda: {
      label: 'Sección: Filtros y Búsqueda',
      elements: {
        input_busqueda: { label: 'Campo: Búsqueda por Folio/Ref/Razón Social/Estado' },
        select_anio: { label: 'Campo: Filtro por Año' },
        select_mes: { label: 'Campo: Filtro por Mes' },
      },
    },
    tabla_documentos: {
      label: 'Sección: Tabla de Documentos',
      elements: {
        btn_ver: { label: 'Operación: Ver Detalle' },
        btn_eliminar: { label: 'Operación: Eliminar' },
        ...columnas([
          ['n', '#'], ['folio', 'Folio'], ['emision', 'Emisión'], ['ref', 'Ref.'], ['razonSocial', 'Razón Social'],
          ['total', 'Total (Neto)'], ['estado', 'Estado'], ['orden', 'Orden'], ['acta', 'Acta'],
          ['salida', 'Salida'], ['mesImputado', 'Mes imputado'], ['acciones', 'Acciones'],
        ]),
      },
    },
    detalle_documento: {
      label: 'Sección: Detalle del documento (Ver Detalle)',
      elements: columnas(COLS_DETALLE_DOCUMENTO_XML),
    },
  },
});
