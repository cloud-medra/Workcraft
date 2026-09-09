import { collectionGroup, query, where, limit, getDocs } from 'firebase/firestore';

export const buscarReporteInfoPorAdmision = async (db, admisionId) => {
  const idTexto = String(admisionId || '').trim();
  if (!idTexto) return null;

  const valoresAIntentar = [idTexto];
  const idNumerico = Number(idTexto);
  if (!Number.isNaN(idNumerico)) {
    valoresAIntentar.push(idNumerico);
  }

  for (const valor of valoresAIntentar) {
    try {
      const q = query(
        collectionGroup(db, 'registros'),
        where('Admisión', '==', valor),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data();
      }
    } catch (error) {
      console.error('Error buscando en ReportesInfo por Admisión:', error);
    }
  }

  return null;
};

export default buscarReporteInfoPorAdmision;