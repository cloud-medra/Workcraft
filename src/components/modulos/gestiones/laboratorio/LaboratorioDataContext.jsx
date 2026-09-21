import React, { createContext, useContext, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebaseConfig';

// Caché compartida de datos casi estáticos del módulo (años/meses de cada colección,
// catálogo de códigos, órdenes y sus líneas) para no volver a leerlos en cada pantalla
// o cada vez que se abre el drawer. Cachea PROMESAS: cargas simultáneas comparten una
// sola lectura. Las entradas caducan a los TTL_MS y se pueden forzar con { forzar: true }.
const TTL_MS = 5 * 60 * 1000;
const COL_CODIGOS = "laboratorio_codigos";

const crearStore = () => {
    const cache = new Map();

    const leer = (clave, cargar, { forzar = false } = {}) => {
        const previo = cache.get(clave);
        if (!forzar && previo && Date.now() - previo.ts < TTL_MS) return previo.promesa;

        const promesa = cargar().catch((error) => {
            cache.delete(clave);
            throw error;
        });
        cache.set(clave, { ts: Date.now(), promesa });
        return promesa;
    };

    return {
        getAnios: (base, opts) => leer(`anios|${base}`, async () => {
            const snap = await getDocs(collection(db, base));
            return snap.docs.map(d => d.id).sort((a, b) => b - a);
        }, opts),

        getMeses: (base, anio, opts) => leer(`meses|${base}|${anio}`, async () => {
            const snap = await getDocs(collection(db, base, String(anio), "meses"));
            return snap.docs.map(d => d.id);
        }, opts),

        // Devuelve el data() de cada código del catálogo maestro.
        getCodigosMaestro: (opts) => leer(`codigos`, async () => {
            const snap = await getDocs(collection(db, COL_CODIGOS));
            return snap.docs.map(d => d.data());
        }, opts),

        // Devuelve [{ id, ...data }] crudos; cada consumidor calcula sus campos derivados.
        getOrdenes: (base, anio, mes, opts) => leer(`ordenes|${base}|${anio}|${mes}`, async () => {
            const snap = await getDocs(collection(db, base, String(anio), "meses", String(mes), "ordenes"));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }, opts),

        getLineasOrden: (base, anio, mes, ordenId, opts) => leer(`lineas|${base}|${anio}|${mes}|${ordenId}`, async () => {
            const snap = await getDocs(collection(db, base, String(anio), "meses", String(mes), "ordenes", String(ordenId), "documentos"));
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }, opts),

        invalidar: () => cache.clear()
    };
};

const storeGlobal = crearStore();
const LaboratorioDataContext = createContext(null);

export const LaboratorioDataProvider = ({ children }) => {
    const storeRef = useRef(null);
    if (!storeRef.current) storeRef.current = crearStore();
    return (
        <LaboratorioDataContext.Provider value={storeRef.current}>
            {children}
        </LaboratorioDataContext.Provider>
    );
};

// Fuera del provider cae a un store global, así los componentes siguen funcionando.
export const useLaboratorioData = () => useContext(LaboratorioDataContext) ?? storeGlobal;
