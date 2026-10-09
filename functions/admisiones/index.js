// Reporte Info → "Gestión implante": trigger que mantiene la marca de
// admisiones gestionadas (admisiones_gestionadas_implantes) al crear,
// editar o eliminar una gestión de Implantes: estado (gestionada / cargada
// / imputada), gestiones asociadas, cantidad e ítems pendientes. Si cambia
// el número de admisión, corrige la anterior y la nueva. Ver servicio.js.

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { aplicarCambioGestion } = require('./servicio');
const { recalcularAdmision } = require('../descripcionesReporte/servicio');

if (!getApps().length) initializeApp();
const db = getFirestore();

exports.admisionesGestionadasImplante = onDocumentWritten(
  {
    document: 'implantes_gestiones/{anio}/mes/{mes}/dia/{dia}/admision/{admision}/empresa/{empresa}/detalles/{gestionId}',
    region: 'us-central1',
    retry: false,
  },
  async (event) => {
    const antes = event.data?.before?.exists ? event.data.before.data() : null;
    const despues = event.data?.after?.exists ? event.data.after.data() : null;
    const ruta = (event.data?.after?.ref || event.data?.before?.ref).path;
    const resultado = await aplicarCambioGestion(db, ruta, antes, despues);
    if (Object.values(resultado).some((r) => r !== 'sin cambios')) logger.info('admisiones gestionadas', { ruta, resultado });
    // Reporte Info: una admisión que gana o pierde su gestión muestra u
    // oculta en Implantes sus filas con descripción oculta.
    for (const [admision, r] of Object.entries(resultado)) {
      if (r === 'creada' || r === 'borrada') await recalcularAdmision(db, admision, r === 'creada');
    }
  }
);
