import React, { useState } from 'react';
import { LayoutDashboard, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Bookmark } from 'lucide-react';

const ResumenGeneral = ({ userData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const nombreMeses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const diasSemana = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
  const añoActual = new Date().getFullYear();
  const rangoAños = Array.from({ length: 11 }, (_, i) => añoActual - 5 + i);

  const primerDiaMes = new Date(year, month, 1).getDay();
  const totalDiasMes = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleMonthChange = (e) => setCurrentDate(new Date(year, parseInt(e.target.value), 1));
  const handleYearChange = (e) => setCurrentDate(new Date(parseInt(e.target.value), month, 1));

  const esHoy = (dia) => {
    const hoy = new Date();
    return hoy.getDate() === dia && hoy.getMonth() === month && hoy.getFullYear() === year;
  };

  const esSeleccionado = (dia) => {
    return selectedDate.getDate() === dia && selectedDate.getMonth() === month && selectedDate.getFullYear() === year;
  };

  const celdasVacias = Array(primerDiaMes).fill(null);
  const diasMes = Array.from({ length: totalDiasMes }, (_, i) => i + 1);

  return (
    <div className="w-full h-full flex flex-col gap-3 overflow-y-auto pr-1">
      
      {/* Encabezado Principal */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-between p-2.5 flex-shrink-0">
        <h2 className="text-[12px] font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wider">
          <LayoutDashboard size={14} className="text-[#2383C2]" /> Panel de Control General
        </h2>
        <span className="text-[9px] bg-blue-50 text-[#2383C2] font-bold px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-wide">
          Entorno Activo
        </span>
      </div>

      {/* Contenedor de Dos Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-grow items-stretch">
        
        {/* Columna Izquierda: Bienvenida y Estado */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col justify-between p-4">
          <div className="flex-grow flex flex-col justify-center max-w-xl py-4">
            <p className="text-[14px] font-medium text-gray-700 mb-1">
              Hola, <span className="text-[#2383C2] font-bold">{userData?.nombreCompleto || 'Usuario'}</span>.
            </p>
            <p className="text-[11.5px] leading-relaxed text-gray-400">
              Bienvenido al panel de control centralizado de <strong className="text-gray-600">Cloud - Medra</strong>. Desde el menú lateral izquierdo puedes gestionar y ejecutar las operaciones de los módulos autorizados para tu rol en el sistema.
            </p>
          </div>

          <div className="border-t border-gray-100 pt-3 bg-gray-50/30 -mx-4 -mb-4 p-4 rounded-b-lg">
            <span className="text-[9px] font-bold text-gray-400 uppercase block mb-0.5 tracking-wider">Seguridad y Permisos</span>
            <p className="text-[11.5px] text-gray-500">
              Tu perfil <span className="font-semibold text-gray-700 uppercase">{userData?.rol || 'Operador'}</span> registra acceso a <strong className="text-gray-700">{Object.keys(userData?.permisos || {}).length} secciones</strong> configuradas.
            </p>
          </div>
        </div>

        {/* Columna Derecha: Dividida en dos sub-bloques */}
        <div className="flex flex-col gap-3">
          
          {/* Sub-bloque 1: Calendario Ultra Compacto */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 flex flex-col justify-between">
            {/* Header del Calendario */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
              <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1 uppercase tracking-wide">
                <CalendarIcon size={13} className="text-[#2383C2]" /> Agenda
              </span>
              
              <div className="flex items-center gap-1">
                <button onClick={handlePrevMonth} className="p-0.5 rounded hover:bg-gray-100 text-gray-500 transition-colors">
                  <ChevronLeft size={13} />
                </button>
                
                <select 
                  value={month} 
                  onChange={handleMonthChange}
                  className="text-[10px] font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 cursor-pointer focus:outline-none"
                >
                  {nombreMeses.map((m, index) => (
                    <option key={index} value={index}>{m.substring(0, 3)}</option>
                  ))}
                </select>

                <select 
                  value={year} 
                  onChange={handleYearChange}
                  className="text-[10px] font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded px-1 py-0.5 cursor-pointer focus:outline-none"
                >
                  {rangoAños.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                <button onClick={handleNextMonth} className="p-0.5 rounded hover:bg-gray-100 text-gray-500 transition-colors">
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>

            {/* Días de la semana */}
            <div className="grid grid-cols-7 text-center text-[9px] font-bold text-gray-400 uppercase mb-1 select-none">
              {diasSemana.map((dia, idx) => (
                <div key={idx}>{dia}</div>
              ))}
            </div>

            {/* Cuadrícula de Días */}
            <div className="grid grid-cols-7 text-center text-[10.5px] gap-0.5 font-medium select-none justify-items-center mb-2">
              {celdasVacias.map((_, idx) => (
                <div key={`empty-${idx}`} className="h-5.5 w-5.5 flex items-center justify-center text-transparent">.</div>
              ))}
              
              {diasMes.map((dia) => {
                const seleccionado = esSeleccionado(dia);
                const hoy = esHoy(dia);
                
                return (
                  <button
                    key={dia}
                    onClick={() => setSelectedDate(new Date(year, month, dia))}
                    className={`h-5.5 w-5.5 rounded flex items-center justify-center font-mono text-[10px] transition-all text-center
                      ${(seleccionado || hoy)
                        ? 'bg-[#2383C2] text-white font-bold shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    {dia}
                  </button>
                );
              })}
            </div>

            {/* Detalle inferior */}
            <div className="pt-1.5 border-t border-gray-100 text-[9.5px] text-gray-400 flex items-center justify-between px-0.5">
              <span>Selección:</span>
              <span className="font-mono font-bold text-gray-600 bg-gray-50 px-1.5 py-0.2 rounded border border-gray-200">
                {selectedDate.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Sub-bloque 2: Contenedor Extra (Notas / Estado del Sistema) */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-3 flex flex-col flex-grow justify-between min-h-[110px]">
            <div className="flex items-center gap-1.5 border-b border-gray-100 pb-1.5 mb-1.5">
              <Bookmark size={13} className="text-amber-500" />
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Notas del Sistema</span>
            </div>
            
            <div className="flex-grow flex flex-col justify-center">
              <p className="text-[10.5px] text-gray-400 italic leading-snug">
                No hay alertas ni recordatorios programados para la fecha seleccionada. Puedes usar este espacio para notas rápidas operativas.
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ResumenGeneral;