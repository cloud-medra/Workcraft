import { useEffect, useRef, useState } from 'react';
import { ChevronsUpDown, Check, Building2, Package } from 'lucide-react';

// Clase común de los campos de Ingresos, con el efecto de enfoque y resplandor azul.
export const CLASE_INPUT_INGRESO = "w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 transition-all outline-none focus:border-[#2383C2] focus:ring-2 focus:ring-[#2383C2]/30 active:border-[#2383C2]";

// Datos del documento de ingreso (guía/factura, OC, empresa, caja destino,
// ubicación y observaciones). Compartido por Ingresos y por Escaneo · Con
// guía o factura. `setCabecera` recibe un updater (prev => nuevo).
const CabeceraIngreso = ({ cabecera, setCabecera, listaEmpresas, listaCajas, inputClass = CLASE_INPUT_INGRESO }) => {
  const [mostrarEmpresasDropdown, setMostrarEmpresasDropdown] = useState(false);
  const dropdownEmpresaRef = useRef(null);
  const [mostrarCajasDropdown, setMostrarCajasDropdown] = useState(false);
  const dropdownCajaRef = useRef(null);

  // Manejar clic fuera de los desplegables
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownEmpresaRef.current && !dropdownEmpresaRef.current.contains(event.target)) {
        setMostrarEmpresasDropdown(false);
      }
      if (dropdownCajaRef.current && !dropdownCajaRef.current.contains(event.target)) {
        setMostrarCajasDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHeaderChange = (e) => {
    const { name, value } = e.target;
    setCabecera(prev => ({ ...prev, [name]: value }));
  };

  const handleSeleccionarEmpresa = (empresa) => {
    setCabecera(prev => ({ ...prev, empresa: empresa.nombre, empresaId: empresa.id }));
    setMostrarEmpresasDropdown(false);
  };

  const handleSeleccionarCaja = (caja) => {
    setCabecera(prev => ({ ...prev, nombreCaja: caja.nombre, ubicacion: caja.ubicacion || prev.ubicacion }));
    setMostrarCajasDropdown(false);
  };

  const busquedaEmpresa = cabecera.empresa;
  const busquedaCaja = cabecera.nombreCaja;

  const empresasFiltradas = listaEmpresas.filter(emp =>
    emp.nombre.toLowerCase().includes(busquedaEmpresa.toLowerCase()) ||
    emp.rut.toLowerCase().includes(busquedaEmpresa.toLowerCase())
  );

  const cajasFiltradas = listaCajas.filter(c =>
    c.nombre.toLowerCase().includes(busquedaCaja.toLowerCase())
  );

  return (
    <div className="bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-md border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-6 gap-2">
      <div>
        <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">N° Guía / Factura *</label>
        <input
          type="text"
          name="numeroGuiaFactura"
          value={cabecera.numeroGuiaFactura}
          onChange={handleHeaderChange}
          placeholder="Ej: F001-4920"
          autoComplete="off"
          className={inputClass}
          required
        />
      </div>

      <div>
        <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">N° Orden Compra</label>
        <input
          type="text"
          name="numeroOrden"
          value={cabecera.numeroOrden}
          onChange={handleHeaderChange}
          placeholder="Ej: OC-2026-081"
          autoComplete="off"
          className={inputClass}
        />
      </div>

      {/* Campo Empresa (Buscador / Desplegable) */}
      <div className="relative" ref={dropdownEmpresaRef}>
        <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">Empresa</label>
        <div className="relative">
          <input
            type="text"
            value={busquedaEmpresa}
            onFocus={() => setMostrarEmpresasDropdown(true)}
            onChange={(e) => {
              setCabecera(prev => ({ ...prev, empresa: e.target.value, empresaId: '' }));
              setMostrarEmpresasDropdown(true);
            }}
            placeholder="Buscar empresa..."
            autoComplete="off"
            className={`${inputClass} pr-7`}
          />
          <ChevronsUpDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>

        {mostrarEmpresasDropdown && (
          <ul className="absolute z-30 mt-1 max-h-48 w-full min-w-[200px] overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-xs shadow-lg ring-1 ring-black/5 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
            {empresasFiltradas.length === 0 ? (
              <li className="px-3 py-2 text-gray-400 dark:text-gray-500 italic">
                No se encontraron empresas
              </li>
            ) : (
              empresasFiltradas.map((emp) => (
                <li
                  key={emp.id}
                  onClick={() => handleSeleccionarEmpresa(emp)}
                  className="cursor-pointer select-none px-3 py-1.5 hover:bg-[#2383C2]/10 dark:hover:bg-[#2383C2]/20 flex items-center justify-between text-gray-700 dark:text-gray-200"
                >
                  <div className="flex items-center gap-1.5">
                    <Building2 size={12} className="text-[#2383C2]" />
                    <span className="font-medium truncate">{emp.nombre}</span>
                    {emp.rut && <span className="text-[10px] text-gray-400">({emp.rut})</span>}
                  </div>
                  {cabecera.empresaId === emp.id && (
                    <Check size={12} className="text-[#2383C2]" />
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      {/* Campo Nombre Caja (Buscador / Selección o Entrada Manual) */}
      <div className="relative" ref={dropdownCajaRef}>
        <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">Nombre Caja *</label>
        <div className="relative">
          <input
            type="text"
            value={busquedaCaja}
            onFocus={() => setMostrarCajasDropdown(true)}
            onChange={(e) => {
              setCabecera(prev => ({ ...prev, nombreCaja: e.target.value }));
              setMostrarCajasDropdown(true);
            }}
            placeholder="Seleccionar o escribir..."
            autoComplete="off"
            className={`${inputClass} pr-7`}
            required
          />
          <ChevronsUpDown
            size={14}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
        </div>

        {mostrarCajasDropdown && (
          <ul className="absolute z-30 mt-1 max-h-48 w-full min-w-[200px] overflow-auto rounded-md bg-white dark:bg-gray-800 py-1 text-xs shadow-lg ring-1 ring-black/5 dark:ring-gray-700 border border-gray-200 dark:border-gray-700">
            {cajasFiltradas.length === 0 ? (
              <li className="px-3 py-2 text-gray-400 dark:text-gray-500 italic">
                Crear nueva caja: "{busquedaCaja}"
              </li>
            ) : (
              cajasFiltradas.map((caja, idx) => (
                <li
                  key={idx}
                  onClick={() => handleSeleccionarCaja(caja)}
                  className="cursor-pointer select-none px-3 py-1.5 hover:bg-[#2383C2]/10 dark:hover:bg-[#2383C2]/20 flex items-center justify-between text-gray-700 dark:text-gray-200"
                >
                  <div className="flex items-center gap-1.5">
                    <Package size={12} className="text-[#2383C2]" />
                    <span className="font-medium truncate">{caja.nombre}</span>
                    {caja.ubicacion && <span className="text-[10px] text-gray-400">({caja.ubicacion})</span>}
                  </div>
                  {cabecera.nombreCaja === caja.nombre && (
                    <Check size={12} className="text-[#2383C2]" />
                  )}
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div>
        <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">Ubicación</label>
        <input
          type="text"
          name="ubicacion"
          value={cabecera.ubicacion}
          onChange={handleHeaderChange}
          placeholder="Ej: Estante B-1"
          autoComplete="off"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-gray-600 dark:text-gray-300 font-semibold mb-1 truncate">Observaciones</label>
        <input
          type="text"
          name="observaciones"
          value={cabecera.observaciones}
          onChange={handleHeaderChange}
          placeholder="Notas opcionales..."
          autoComplete="off"
          className={inputClass}
        />
      </div>
    </div>
  );
};

export default CabeceraIngreso;
