import { useEffect, useMemo, useState } from 'react';
import { useInventarioGeneral } from '../../../../../hooks/useInventarioGeneral';
import { cargarCatalogo, ordenarPor } from '../../../../../stores/catalogosStore';

// Datos que necesita la cabecera de un ingreso con guía o factura: maestro
// de códigos, empresas y nombres de caja existentes.
export const useCatalogosIngreso = () => {
  const [catalogoCodigos, setCatalogoCodigos] = useState([]);
  const [listaEmpresas, setListaEmpresas] = useState([]);
  // Nombres únicos de caja desde el listener compartido de inventario_general
  // (antes un getDocs de toda la colección en cada entrada).
  const { cajas: cajasInventario } = useInventarioGeneral();
  const listaCajas = useMemo(() => {
    const cajasMap = new Map();
    cajasInventario.forEach(data => {
      if (data.nombreCaja && data.nombreCaja.trim() !== '') {
        const nombreNormalizado = data.nombreCaja.trim();
        if (!cajasMap.has(nombreNormalizado.toLowerCase())) {
          cajasMap.set(nombreNormalizado.toLowerCase(), {
            nombre: nombreNormalizado,
            ubicacion: data.ubicacion || ''
          });
        }
      }
    });
    return Array.from(cajasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [cajasInventario]);

  useEffect(() => {
    const cargarDatosIniciales = async () => {
      try {
        // Catálogos de códigos y empresas desde el catalogosStore (sin
        // lecturas si otra pantalla ya los cargó en esta sesión)
        const [codigos, empresas] = await Promise.all([cargarCatalogo('codigos'), cargarCatalogo('empresas')]);
        setCatalogoCodigos([...codigos].sort(ordenarPor('fechaRegistro', 'desc')));

        const empresasData = empresas.map(data => ({
          id: data.id,
          nombre: data.nombre || data.razonSocial || data.nombreEmpresa || 'Sin nombre',
          rut: data.rut || data.rutEmpresa || ''
        }));
        empresasData.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setListaEmpresas(empresasData);
      } catch (error) {
        console.error("Error al cargar datos iniciales:", error);
      }
    };
    cargarDatosIniciales();
  }, []);

  return { catalogoCodigos, listaEmpresas, listaCajas };
};
