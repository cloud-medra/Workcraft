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
};
