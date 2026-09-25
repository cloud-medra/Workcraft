import { createContext, useContext, useState } from 'react';
import { crearStoreDatosGestion } from '../shared/crearStoreDatosGestion';

// Años/meses de cada colección, catálogo de códigos y órdenes de Laboratorio,
// cacheados (ver shared/crearStoreDatosGestion.js).
const COL_CODIGOS = "laboratorio_codigos";
const crearStore = () => crearStoreDatosGestion(COL_CODIGOS);

const storeGlobal = crearStore();
const LaboratorioDataContext = createContext(null);

export const LaboratorioDataProvider = ({ children }) => {
    const [store] = useState(crearStore);
    return (
        <LaboratorioDataContext.Provider value={store}>
            {children}
        </LaboratorioDataContext.Provider>
    );
};

// Fuera del provider cae a un store global, así los componentes siguen funcionando.
// eslint-disable-next-line react-refresh/only-export-components
export const useLaboratorioData = () => useContext(LaboratorioDataContext) ?? storeGlobal;
