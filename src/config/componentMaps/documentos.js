import { columnas } from './columnas.js';

// Reportes Info se monta en Documentos y en Implantes (ReportesInfo.jsx
// recibe la ruta del menú en `pathVista`): cada ruta tiene su entrada.
export const mapaReportesInfo = {
  label: 'Reportes Info (ReportesInfo.jsx)',
  sections: {
    cabecera_acciones: {
      label: 'Sección: Encabezado',
      elements: {
        btn_importar: { label: 'Acción: Importar reporte' },
      },
    },
    tabla_registros: {
      label: 'Sección: Tabla de Registros',
      elements: columnas([
        ['fecha', 'Fecha'], ['admision', 'Admisión'], ['paciente', 'Paciente'], ['edad', 'Edad'],
        ['codArt', 'Cod.Art.'], ['descripcion', 'Descripción'], ['arancel', 'Arancel'],
        ['prevision', 'Previsión / Isapre'], ['cirujano', 'Cirujano'], ['cantidad', 'Cant.'], ['revisado', 'Revisado'],
      ]),
    },
  },
};

export const documentosComponentMaps = {
  // '/documentos/reportesInfo': { label: '...', sections: { ... } },

  '/documentos/importarDetallesOC': {
    label: 'Importar Detalles OC (ImportarDetallesOC.jsx) — sin granularidad cableada aún',
    sections: {
      cabecera_acciones: {
        label: 'Sección: Encabezado',
        elements: {
          btn_importar: { label: 'Acción: Importar Excel' },
        },
      },
      barra_filtros: {
        label: 'Sección: Filtros (Año/Mes en cascada + búsqueda Admisión/Paciente + búsqueda OC/Factura/Guía)',
        elements: {},
      },
      tabla_registros: {
        label: 'Sección: Tabla de Registros Importados (documentos_sistema, filtrada por período, paginada de 50 en 50)',
        elements: {},
      },
    },
  },

  '/documentos/seguimientoFacturasGuias': {
    label: 'Seguimiento de Facturas y Guías (SeguimientoFacturasGuias.jsx) — sin granularidad cableada aún',
    sections: {
      selector_tipo: {
        label: 'Sección: Selector inicial (Facturas / Guías)',
        elements: {},
      },
      barra_filtros: {
        label: 'Sección: Filtros (Año obligatorio + Mes/Empresa opcionales en cascada, sin preselección)',
        elements: {},
      },
      tabla_registros: {
        label: 'Sección: Tabla — ESTADO="Pendiente factura" (Facturas) o NUMERO_GUIA vacío/"0" (Guías), paginada de 50 en 50',
        elements: {},
      },
    },
  },

  '/documentos/ingresoOrdenes': {
    label: 'Ingreso de Órdenes (IngresoOrdenes.jsx) — cubre también "Ingreso de Documentos" vía sus pestañas Informe/Órdenes — sin granularidad cableada aún',
    sections: {
      barra_filtros: {
        label: 'Sección: Filtros (Año obligatorio + Mes/Empresa opcionales en cascada, sin preselección)',
        elements: {},
      },
      tabla_registros: {
        label: 'Sección: Tabla agrupada por ADMISION+EMPRESA+FECHA_CX, paginada de 50 en 50',
        elements: {},
      },
    },
  },

  '/documentos/reportesInfo': mapaReportesInfo,
};
