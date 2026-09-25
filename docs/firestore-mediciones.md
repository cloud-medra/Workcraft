# Mediciones de lecturas de Firestore

Medidor: `src/dev/firestoreMeter.js` (solo `npm run dev`). En consola:
`__FS_METER__.report()`, `__FS_METER__.reset()`, `await __FS_METER__.tamanos()`.

Recorrido de referencia: Códigos Maestros, Reportes Info, Gestión Implantes y Laboratorio.

## Línea base ("antes") — ~15 min

Medida con el código de la **copia de prueba** conectada a la base real; algunos
archivos/líneas no coinciden con este repositorio (p. ej. `ReportesInfo.jsx:288`
corresponde aquí al control de duplicados de la importación).

### Tamaños de colecciones

| Colección | Docs |
|---|---|
| maestros_codigos | 2915 |
| implantes_imputadas/**/documentos | 342 |
| laboratorio_codigos | 233 |
| implantes_gestiones/**/detalles | 91 |
| maestros_prestadores | 82 |
| maestros_empresas | 43 |
| laboratorio_imputadas/**/documentos | 33 |
| consignacion_imputadas/**/documentos | 26 |
| consignacion_registros/**/detalles | 26 |
| hemodinamia_imputadas/**/documentos | 19 |
| maestros_recargos | 15 |
| cierres_periodos | 10 |
| vacunatorio_codigos | 9 |
| vacunatorio_imputadas/**/documentos | 8 |
| maestros_centros | 7 |
| hemodinamia_gestiones/**/detalles | 3 |
| maestros_pad, usuarios | 1 |
| inventario_general, inventario_transito, inventario_egresos, administracion_notas, maestros_convenios, maestros_previsiones | 0 |

### Resumen: 19.494 lecturas · 5.967 desde caché · 1 listener activo

| Pantalla | Lecturas | Desde caché | Consultas |
|---|---|---|---|
| /maestros/codigosMaestros | 17.680 | 43 | 7 |
| /documentos/reportesInfo | 1.302 | 0 | 6 |
| /laboratorio/archivosControlLaboratorio | 345 | 2 | 25 |
| /implantes/gestionImplantes | 161 | 5.922 | 9 |
| /laboratorio/xmlDocLaboratorio | 3 | 0 | 4 |
| dashboard | 2 | 0 | 2 |
| inicio | 1 | 0 | 2 |

### Consultas principales

| Pantalla | Tipo | Origen | Consulta | Llamadas | Lecturas | Caché | Docs máx |
|---|---|---|---|---|---|---|---|
| codigosMaestros | getDocs | hooks/useCollectionCache.js:13 | maestros_codigos orderBy fechaRegistro desc | 6 | 17.476 | 0 | 2915 |
| reportesInfo | getDocs | ReportesInfo.jsx:177 | …/2026/septiembre/registros orderBy Fecha | 2 | 838 | 0 | 419 |
| reportesInfo | getDocs | ReportesInfo.jsx:288 | …/septiembre/registros where __name__ in | 14 | 419 | 0 | 30 |
| archivosControlLaboratorio | getDocs | LaboratorioDataContext.jsx:39 | laboratorio_codigos | 1 | 233 | 0 | 233 |
| codigosMaestros | getDocs | TabConCodigo.jsx:184 | maestros_empresas orderBy nombre | 4 | 172 | 0 | 43 |
| gestionImplantes | onSnapshot | useGestionesImplantesData.js:107 | cg detalles … limit 150 | 2 | 92 | 91 | 91 |
| gestionImplantes | getDocs | useRecargosActivos.js:12 | maestros_recargos where estado | 4 | 60 | 0 | 15 |
| reportesInfo | getDocs | EmpresaSelect.jsx:20 | maestros_empresas orderBy nombre | 1 | 43 | 0 | 43 |
| codigosMaestros | getDocs | useFirestorePagination.js:17 | maestros_codigos where tieneCodigo … limit 51 | 8 | 31 | 0 | 8 |
| archivosControlLaboratorio | getDocs | IniciarProceso.jsx:65 | laboratorio_documentos/2026/{agosto,septiembre,julio} | 3 | 49 | 0 | 22 |
| archivosControlLaboratorio | onSnapshot | DocRecibidos.jsx:81 | laboratorio_documentos/2026/septiembre | 1 | 13 | 1 | 14 |
| archivosControlLaboratorio | getDocs | LaboratorioDataContext.jsx:44 | laboratorio_ordenes/2026/{agosto,septiembre} | 2 | 18 | 0 | 9 |
| gestionImplantes | getDocs | CentroSelect.jsx:19 | maestros_centros orderBy nombre | 1 | 7 | 0 | 7 |

Error observado: `useFirestorePagination.js:35 The query requires an index` para
`maestros_codigos (tieneCodigo, fechaRegistro desc)` (índice en construcción).

## Después de la Etapa A

_Pendiente de medir con el mismo recorrido._

Costo esperado (producción; en `npm run dev` StrictMode duplica los getDocs que corren al montar):

| Acción | Antes | Esperado |
|---|---|---|
| 1ª entrada a Códigos Maestros (Vista General) en la sesión | 2.915 + 43 (empresas) | 2.915 + 43, una sola vez por sesión (listener compartido de `catalogosStore`) |
| Entradas siguientes a Códigos Maestros | 2.915 + 43 cada vez | ≈ 0 (+1 por cada código que cambie) |
| Entrada a Códigos Maestros > Pendientes | 2.915 + 43 | 2.915 (sigue igual hasta la Etapa B) |
| Entrada a Reportes Info (mes de 419 registros) | ≈ 419 + años/meses | igual: ≈ 419 + años/meses (el listado no cambió) |
| Importar un Excel del mes que está en pantalla | 1 lectura por fila (419) | 0 |
