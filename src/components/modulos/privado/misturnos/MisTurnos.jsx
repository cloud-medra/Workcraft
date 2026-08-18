import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, User, RefreshCw } from 'lucide-react';

const MisTurnos = () => {
  // Fecha actual para inicializar el calendario
  const [currentDate, setCurrentDate] = useState(new Date());

  // Fecha base del ciclo: Lunes 13 de Julio de 2026 (Semana tuya)
  const FECHA_BASE = new Date(2026, 6, 13); // Nota: Julio es mes 6 en JS (0-indexed)

  // Integrantes con colores diferenciados pero suavizados, destacando únicamente el tuyo
  const INTEGRANTES = [
    { 
      id: 'yo', 
      nombre: 'TÚ (Usuario actual)', 
      colorClass: 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white border-blue-700 dark:border-blue-500 font-bold shadow-md ring-2 ring-blue-400/40 scale-[1.02] z-10' 
    },
    { 
      id: 'x', 
      nombre: 'Persona X', 
      colorClass: 'bg-emerald-50/70 text-emerald-600/70 dark:bg-emerald-950/20 dark:text-emerald-500/60 border-emerald-100 dark:border-emerald-900/30 opacity-70 font-normal' 
    },
    { 
      id: 'y', 
      nombre: 'Persona Y', 
      colorClass: 'bg-amber-50/70 text-amber-600/70 dark:bg-amber-950/20 dark:text-amber-500/60 border-amber-100 dark:border-amber-900/30 opacity-70 font-normal' 
    }
  ];

  // Obtener el lunes de la semana de una fecha de manera segura (fijado a mediodía para evitar desfases hororios)
  const getLunesDeSemana = (fecha) => {
    const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 12, 0, 0); 
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar para que el lunes sea el primer día
    return new Date(d.setDate(diff));
  };

  // Determinar quién está de turno en una fecha específica mediante aritmética de semanas segura
  const obtenerTurnoDeFecha = (fecha) => {
    const lunesSemana = getLunesDeSemana(fecha);
    lunesSemana.setHours(12, 0, 0, 0);
    
    const fechaBaseLunes = getLunesDeSemana(FECHA_BASE);
    fechaBaseLunes.setHours(12, 0, 0, 0);

    // Diferencia en milisegundos convertida a semanas completas
    const diffTime = lunesSemana.getTime() - fechaBaseLunes.getTime();
    
    // Math.round corrige el bug de semanas duplicadas por transiciones horarias
    const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7));

    // Operación módulo para mantener el ciclo infinito (3 semanas de rotación)
    const index = ((diffWeeks % 3) + 3) % 3;
    return INTEGRANTES[index];
  };

  // Funciones de navegación del calendario (Mes anterior/siguiente)
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const irAHoy = () => {
    setCurrentDate(new Date());
  };

  // Construcción de la grilla de días del mes actual
  const renderDias = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Primer día del mes y total de días
    const primerDiaMes = new Date(year, month, 1);
    const totalDiasMes = new Date(year, month + 1, 0).getDate();

    // Ajustar el día de inicio para que empiece en Lunes (0: lunes, ..., 6: domingo)
    let diaInicioIndex = primerDiaMes.getDay() - 1;
    if (diaInicioIndex === -1) diaInicioIndex = 6; // Domingo

    const celdas = [];

    // Celdas vacías para el desfase del inicio de mes
    for (let i = 0; i < diaInicioIndex; i++) {
      celdas.push(<div key={`vacio-${i}`} className="h-24 bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800/40"></div>);
    }

    // Celdas con los días del mes
    for (let dia = 1; dia <= totalDiasMes; dia++) {
      const fechaDia = new Date(year, month, dia);
      const encargadoTurno = obtenerTurnoDeFecha(fechaDia);
      const esHoy = new Date().toDateString() === fechaDia.toDateString();
      const esMiTurno = encargadoTurno.id === 'yo';

      celdas.push(
        <div 
          key={`dia-${dia}`} 
          className={`h-24 p-2 border border-gray-100 dark:border-gray-800 flex flex-col justify-between transition-all ${
            esHoy 
              ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20' 
              : esMiTurno 
                ? 'bg-blue-50/30 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/40' 
                : 'bg-white dark:bg-gray-800'
          }`}
        >
          <div className="flex justify-between items-center">
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              esHoy ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300'
            }`}>
              {dia}
            </span>
            {esMiTurno && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
            )}
          </div>

          {/* Badge del turno asignado */}
          <div className={`text-[10px] p-1 rounded border truncate flex items-center gap-1 transition-all ${encargadoTurno.colorClass}`}>
            <User size={10} className="flex-shrink-0" />
            <span className="truncate">{encargadoTurno.nombre}</span>
          </div>
        </div>
      );
    }

    return celdas;
  };

  const mesesNom = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const diasSemana = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 h-full flex flex-col min-h-[600px]">
      
      {/* Cabecera del control del calendario */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-gray-800 dark:text-white flex items-center gap-2">
            <CalendarIcon className="text-blue-500" size={22} />
            Control de Turnos Rotativos
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Visualización y rotación semanal automática de turnos (Ciclo de 3 semanas).
          </p>
        </div>

        {/* Controles de navegación */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button 
            onClick={irAHoy}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition flex items-center gap-1"
          >
            <RefreshCw size={12} /> Hoy
          </button>
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button 
              onClick={prevMonth}
              className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 transition"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-bold px-3 text-gray-700 dark:text-gray-200 min-w-[120px] text-center">
              {mesesNom[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button 
              onClick={nextMonth}
              className="p-1.5 rounded-md hover:bg-white dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 transition"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Leyenda de Integrantes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
        {INTEGRANTES.map((integrante) => (
          <div 
            key={integrante.id} 
            className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold shadow-sm transition-all ${integrante.colorClass}`}
          >
            <div className={`w-2.5 h-2.5 rounded-full bg-current ${integrante.id === 'yo' ? 'opacity-100' : 'opacity-50'}`}></div>
            <span>Turno de: {integrante.nombre}</span>
          </div>
        ))}
      </div>

      {/* Grid del Calendario */}
      <div className="flex-1 flex flex-col border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-inner">
        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700 text-center py-2 text-xs font-bold text-gray-500 dark:text-gray-400">
          {diasSemana.map(d => (
            <div key={d}>{d}</div>
          ))}
        </div>

        {/* Días */}
        <div className="grid grid-cols-7 flex-grow bg-gray-50/30 dark:bg-gray-900/10">
          {renderDias()}
        </div>
      </div>
    </div>
  );
};

export default MisTurnos;