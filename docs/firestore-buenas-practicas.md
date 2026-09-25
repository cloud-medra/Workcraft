# Firestore: buenas prácticas de lectura

Guía para las pantallas y módulos nuevos. Firestore cobra **1 lectura por
documento devuelto** (mínimo 1 por consulta, aunque venga vacía) y, en un
listener, 1 lectura por cada documento que cambia. Una pantalla que descarga
una colección completa cada vez que se entra es el error más caro: así se
llegó a ~10.000 lecturas por usuario en 2 horas (ver
[firestore-mediciones.md](firestore-mediciones.md)).

## Reglas

1. **Prohibido usar `collectionGroup` sin rango.** Todo `collectionGroup(...)`
   debe acotarse con un rango sobre `documentId()` a una raíz y, en lo
   posible, a un año o mes:
   ```js
   query(collectionGroup(db, 'documentos'),
     where(documentId(), '>=', `${raiz}/${anio}`),
     where(documentId(), '<', `${raiz}/${Number(anio) + 1}`),
     orderBy(documentId()))
   ```
   (Los límites deben ser rutas de documento completas: número **par** de
   segmentos.) Si no, usar `collection(db, raiz, anio, 'meses', mes, ...)`.
2. **`limit` obligatorio** en toda consulta que pueda crecer. `useFirestoreQuery`
   lo exige; si de verdad se necesita todo, escribir el motivo (`sinLimite`).
3. **Lectura única por defecto.** `onSnapshot` solo para lo que debe verse en
   tiempo real (lista abajo). Todo lo demás: `getDocs` + botón "Actualizar".
4. **Nada de catálogos propios.** Maestros (códigos, empresas, recargos,
   centros, prestadores) y notas del panel se leen del `catalogosStore`
   (`useCatalogo('empresas')`, `cargarCatalogo('codigos')`...). Nunca un
   `getDocs(collection(db, 'maestros_...'))` en un componente.
5. **Listeners compartidos, no uno por pantalla.** Si varias pantallas
   escuchan lo mismo, un store con contador de referencias
   (`inventarioGeneralStore`, `periodosStore`).
6. **Listeners pesados con pausa por visibilidad**: `onSnapshotVisible` o
   `useVisibleSnapshot` (se cierran tras 10 min con la pestaña oculta).
   Excepción: listeners muy grandes con pocos cambios (el de
   `maestros_codigos`), porque reanudar después de 30 min cobra todo de nuevo.
7. **Selectores año/mes sin leer datos.** Para saber qué años/meses existen:
   documentos marcador (`{raiz}/{anio}`, `{raiz}/{anio}/meses/{mes}`) o los
   sondeos con `limit(1)` de `periodoQueryHelpers`
   (`aniosDisponiblesPorSondeo*`, `mesesDisponiblesPorSondeoImputadas`).
   Los datos se leen recién al elegir el mes.
8. **Contar y sumar con agregaciones**: `getAggregateFromServer(q, { cantidad: count(), total: sum('total') })`
   cuesta 1 lectura por cada 1.000 documentos. Para meses cerrados, usar el
   snapshot guardado (`imputaciones_periodos`).
9. **Los campos numéricos se guardan como número** (nunca el texto del XML o
   de un `<input>`): `sum()` ignora los strings. Ver
   `gestiones/shared/numerosDocumento.js`.
10. **Leer-modificar-escribir en transacción.** Si una escritura se calcula a
    partir de datos leídos (stock, contadores, arreglos completos), usar
    `runTransaction` y releer dentro; nunca escribir desde la copia en pantalla.
11. **Validar justo antes de escribir contra el servidor** (p. ej. período
    abierto con `obtenerPeriodoAbierto`), aunque la pantalla tenga un listener.
12. **Índices en `firestore.indexes.json`.** Toda consulta con filtros/orden
    compuestos declara su índice en el archivo (y se despliega con
    `npx firebase-tools deploy --only firestore:indexes`). No borrar índices
    publicados sin revisar quién los usa.

## Qué se mantiene en tiempo real

Solo esto usa `onSnapshot` (acotado y compartido):

- Solicitudes `SOLICITAR` (Cargas Consolidado / Solicitud de cada módulo): la
  exportación las pasa a `SOLICITADO` y la tabla debe enterarse.
- Período abierto (`cierres_periodos`, vía `periodosStore`): bloquea las
  cargas cuando se cierra un mes.
- Gestión en edición y mes seleccionado en las fases de Laboratorio y
  Vacunatorio (varios usuarios trabajan sobre los mismos documentos).
- `maestros_codigos` (un único listener de sesión en `catalogosStore`) y
  `inventario_general` (listener compartido de Inventario): decisiones
  explícitas del equipo.

Agregar algo a esta lista requiere acordarlo antes.

## Herramientas

| Necesito... | Usar |
|---|---|
| Un maestro / catálogo | `useCatalogo(nombre)` / `cargarCatalogo(nombre)` (`src/stores/catalogosStore.js`), `upsertLocal`/`removeLocal` tras escribir |
| Una consulta en un componente | `useFirestoreQuery({ clave, crearConsulta, limite, modo })` (`src/hooks/useFirestoreQuery.js`) |
| Un listener pesado | `onSnapshotVisible(ref, ...)` / `useVisibleSnapshot(...)` |
| Período abierto de un módulo | `usePeriodoAbiertoStore(modulo)` (en vivo) / `obtenerPeriodoAbierto(modulo)` (antes de escribir) |
| Años/meses/órdenes en Laboratorio o Vacunatorio | `useLaboratorioData()` / `useVacunatorioData()` |
| Listado paginado desde el servidor | `useFirestorePagination` (cursor + `limit`) |
| Lecturas por año reutilizables al cambiar de pestaña | `leerConCache` (`cargasConsolidado/hooks/cacheLecturasAnio.js`) |

La app usa **caché persistente** (IndexedDB, `firebaseConfig.js`): volver a
abrir un listener dentro de los 30 min solo cobra lo que cambió. No reemplaza
las reglas anteriores (`getDocs` siempre va al servidor).

## Antes de abrir un PR con una pantalla nueva

1. `npm run dev`, recorrer la pantalla y revisar el panel del medidor
   (`__FS_METER__.report()`): ninguna consulta debería leer cientos de
   documentos al entrar. En dev, StrictMode duplica las lecturas al montar.
2. Volver a entrar a la pantalla: el segundo ingreso debería costar ≈ 0 si
   usa stores/caché.
3. Revisar que cada consulta tenga `limit` o rango, y su índice declarado.
