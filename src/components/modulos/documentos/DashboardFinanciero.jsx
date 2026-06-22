import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Building2,
  Calendar,
  DollarSign,
  ArrowUpRight
} from 'lucide-react';

const DashboardFinanciero = () => {
  const permisos = {};

  const [aniosDisponibles, setAniosDisponibles] = useState([]);
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear().toString());

  const [datosAnio, setDatosAnio] = useState(null);
  const [mesesDelAnio, setMesesDelAnio] = useState([]);
  const [empresasDelAnio, setEmpresasDelAnio] = useState([]);

  const [cargandoAnios, setCargandoAnios] = useState(true);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  const formatCur = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0);

  useEffect(() => {
    getDocs(collection(db, "documentos_financieros")).then((snapshot) => {
      const anios = snapshot.docs.map(d => d.id).sort((a, b) => b - a);
      setAniosDisponibles(anios);
      if (anios.length > 0 && !anios.includes(anioFiltro)) {
        setAnioFiltro(anios[0]);
      }
      setCargandoAnios(false);
    });
  }, []);

  useEffect(() => {
    if (!anioFiltro) return;
    setCargandoDatos(true);

    const unsubAnio = onSnapshot(doc(db, "documentos_financieros", anioFiltro), (snap) => {
      setDatosAnio(snap.exists() ? snap.data() : null);
    });

    const unsubMeses = onSnapshot(collection(db, "documentos_financieros", anioFiltro, "meses"), (snap) => {
      const meses = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
        const ordenMeses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
        return ordenMeses.indexOf(a.mes) - ordenMeses.indexOf(b.mes);
      });
      setMesesDelAnio(meses);
    });

    const unsubEmpresas = onSnapshot(collection(db, "documentos_financieros", anioFiltro, "empresas"), (snap) => {
      const empresas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmpresasDelAnio(empresas);
      setCargandoDatos(false);
    });

    return () => {
      unsubAnio();
      unsubMeses();
      unsubEmpresas();
    };
  }, [anioFiltro]);

  if (cargandoAnios || cargandoDatos) return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
      <div className="w-10 h-10 border-4 border-t-[#2383C2] border-gray-200 rounded-full animate-spin"></div>
      <p className="text-[12px] font-medium uppercase tracking-widest">Sincronizando Período {anioFiltro}...</p>
    </div>
  );

  return (
    /* Contenedor Principal con Bordes Sincronizados */
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0">
      
      {/* Cabecera Unificada */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 gap-4 border-b border-gray-200 bg-white">
        <h2 className="text-[14px] font-bold text-gray-700 flex items-center gap-2">
          <BarChart3 size={16} className="text-[#2383C2]" /> ANALÍTICA Y CONTROL FINANCIERO
        </h2>
        <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 ml-auto sm:ml-0">
          <Calendar size={13} className="text-slate-400" />
          <select 
            value={anioFiltro} 
            onChange={(e) => setAnioFiltro(e.target.value)} 
            className="bg-transparent border-none text-[11px] font-bold text-slate-700 focus:ring-0 p-0 pr-6 cursor-pointer outline-none"
          >
            {aniosDisponibles.map(a => <option key={a} value={a}>Año Comercial {a}</option>)}
          </select>
        </div>
      </div>

      {/* Cuerpo del Dashboard con Scroll Interno Seguro */}
      <div className="p-6 flex-1 overflow-auto bg-[#F8FAFC]">
        
        {/* Fila de Tarjetas Kpi */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-[#2383C2] transition-colors">
            <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity"><DollarSign size={70} className="text-slate-900" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total General Bruto</p>
            <h3 className="text-xl font-black text-slate-800">{formatCur(datosAnio?.total)}</h3>
            <div className="mt-3 flex items-center gap-1.5 text-[#2383C2] text-[11px] font-bold"><TrendingUp size={13} /> Flujo de Caja Estimado</div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-emerald-600 transition-colors">
            <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity"><ArrowUpRight size={70} className="text-emerald-600" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monto Facturado</p>
            <h3 className="text-xl font-black text-emerald-600">{formatCur(datosAnio?.facturado)}</h3>
            <div className="mt-3 flex items-center gap-1.5 text-slate-400 text-[11px] font-medium">
              {datosAnio?.total > 0 ? ((datosAnio.facturado / datosAnio.total) * 100).toFixed(1) : 0}% de avance de cobro
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-amber-500 transition-colors">
            <div className="absolute top-0 right-0 p-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity"><Clock size={70} className="text-amber-600" /></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monto Pendiente</p>
            <h3 className="text-xl font-black text-amber-600">{formatCur(datosAnio?.pendiente)}</h3>
            <div className="mt-3 flex items-center gap-1.5 text-amber-600 text-[11px] font-bold italic">Cartera por cobrar activa</div>
          </div>
        </div>

        {/* Fila de Tablas Detalladas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Tabla Evolución Mensual */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 text-[12px]">
                <Calendar size={15} className="text-[#2383C2]" /> Evolución Mensual
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Mes</th>
                    <th className="p-3 text-right">Facturado</th>
                    <th className="p-3 text-right text-amber-600">Pendiente</th>
                    <th className="p-3 text-right bg-slate-100 text-slate-800 font-black">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mesesDelAnio.map(m => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-700 capitalize">{m.mes}</td>
                      <td className="p-3 text-right text-emerald-600 font-semibold">{formatCur(m.facturado)}</td>
                      <td className="p-3 text-right text-amber-600 font-semibold">{formatCur(m.pendiente)}</td>
                      <td className="p-3 text-right font-black text-slate-800 bg-slate-50/30">{formatCur(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla Resumen de Cuentas por Proveedor */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h4 className="font-bold text-slate-700 flex items-center gap-2 text-[12px]">
                <Building2 size={15} className="text-[#2383C2]" /> Resumen de Cuentas por Proveedor
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-3">Empresa</th>
                    <th className="p-3 text-right">Facturado</th>
                    <th className="p-3 text-right">Pendiente</th>
                    <th className="p-3 text-right bg-slate-100 text-slate-800">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(empresasDelAnio.reduce((acc, curr) => {
                    if (!acc[curr.empresa]) acc[curr.empresa] = { t: 0, f: 0, p: 0 };
                    acc[curr.empresa].t += curr.total;
                    acc[curr.empresa].f += curr.facturado;
                    acc[curr.empresa].p += curr.pendiente;
                    return acc;
                  }, {})).map(([nombre, vals]) => (
                    <tr key={nombre} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-bold text-slate-700">{nombre}</td>
                      <td className="p-3 text-right text-emerald-600 font-semibold">{formatCur(vals.f)}</td>
                      <td className="p-3 text-right text-amber-600 font-semibold">{formatCur(vals.p)}</td>
                      <td className="p-3 text-right font-black text-slate-800 bg-slate-50/30">{formatCur(vals.t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default DashboardFinanciero;