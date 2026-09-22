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
};
