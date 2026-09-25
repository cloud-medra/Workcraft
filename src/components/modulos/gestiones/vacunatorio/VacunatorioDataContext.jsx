import { createContext, useContext, useState } from 'react';
import { crearStoreDatosGestion } from '../shared/crearStoreDatosGestion';

// Años/meses de cada colección, catálogo de códigos y órdenes de Vacunatorio,
// cacheados (ver shared/crearStoreDatosGestion.js).
const COL_CODIGOS = "vacunatorio_codigos";
const crearStore = () => crearStoreDatosGestion(COL_CODIGOS);

const storeGlobal = crearStore();
const VacunatorioDataContext = createContext(null);

export const VacunatorioDataProvider = ({ children }) => {
    const [store] = useState(crearStore);
    return (
        <VacunatorioDataContext.Provider value={store}>
            {children}
        </VacunatorioDataContext.Provider>
    );
};

// Fuera del provider cae a un store global, así los componentes siguen funcionando.
// eslint-disable-next-line react-refresh/only-export-components
export const useVacunatorioData = () => useContext(VacunatorioDataContext) ?? storeGlobal;
