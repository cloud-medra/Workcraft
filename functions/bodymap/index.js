// Bodymap (Implantes → Gestiones): trigger que mantiene el Maestro "Zonas
// por diagnóstico" (maestros_zonas_diagnostico) al crear, editar o eliminar
// una gestión de Implantes: una descripción nueva aparece como "Sugerida"
// (si hay palabras clave) o "Sin asignar", y el contador de gestiones resta
// a la descripción anterior y suma a la nueva. Ver servicio.js.

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const logger = require('firebase-functions/logger');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { aplicarCambioGestion } = require('./servicio');

if (!getApps().length) initializeApp();
const db = getFirestore();

exports.zonasDiagnosticoGestionImplante = onDocumentWritten(
  {
    document: 'implantes_gestiones/{anio}/mes/{mes}/dia/{dia}/admision/{admision}/empresa/{empresa}/detalles/{gestionId}',
    region: 'us-central1',
    retry: false,
  },
  async (event) => {
    const antes = event.data?.before?.exists ? event.data.before.data() : null;
    const despues = event.data?.after?.exists ? event.data.after.data() : null;
    const resultado = await aplicarCambioGestion(db, antes, despues);
    if (resultado.cambio) logger.info('zonas diagnóstico', { gestion: event.params.gestionId, ...resultado });
  }
);
