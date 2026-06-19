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
      <div className="w-10 h-10 border-4 border-t-[#0E5B6D] border-gray-200 rounded-full animate-spin"></div>
      <p className="text-[12px] font-medium uppercase tracking-widest">Sincronizando Período {anioFiltro}...</p>
    </div>
  );

  return (
    <div className="w-full h-full bg-[#F8FAFC] overflow-auto p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <BarChart3 className="text-[#0E5B6D]" size={28} />
            Dashboard Financiero
          </h1>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
          <Calendar size={16} className="text-slate-400 ml-2" />
          <select value={anioFiltro} onChange={(e) => setAnioFiltro(e.target.value)} className="bg-transparent border-none text-[13px] font-bold text-slate-700 focus:ring-0 cursor-pointer pr-8">
            {aniosDisponibles.map(a => <option key={a} value={a}>Año Comercial {a}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-[#0E5B6D] transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign size={80} className="text-slate-900" /></div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total General Bruto</p>
          <h3 className="text-2xl font-black text-slate-800">{formatCur(datosAnio?.total)}</h3>
          <div className="mt-4 flex items-center gap-2 text-[#0E5B6D] text-[12px] font-bold"><TrendingUp size={14} /> Flujo de Caja Estimado</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-green-500 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><ArrowUpRight size={80} className="text-green-600" /></div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monto Facturado</p>
          <h3 className="text-2xl font-black text-green-600">{formatCur(datosAnio?.facturado)}</h3>
          <div className="mt-4 flex items-center gap-2 text-slate-400 text-[12px]">{datosAnio?.total > 0 ? ((datosAnio.facturado / datosAnio.total) * 100).toFixed(1) : 0}% de avance de cobro</div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-amber-500 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Clock size={80} className="text-amber-600" /></div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monto Pendiente</p>
          <h3 className="text-2xl font-black text-amber-600">{formatCur(datosAnio?.pendiente)}</h3>
          <div className="mt-4 flex items-center gap-2 text-amber-600 text-[12px] font-bold italic">Cartera por cobrar activa</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50"><h4 className="font-bold text-slate-700 flex items-center gap-2 text-[14px]"><Calendar size={18} className="text-[#0E5B6D]" /> Evolución Mensual</h4></div>
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr><th className="p-4">Mes</th><th className="p-4 text-right">Facturado</th><th className="p-4 text-right text-amber-600">Pendiente</th><th className="p-4 text-right bg-slate-100 text-slate-800 font-black">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mesesDelAnio.map(m => (
                <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 font-bold text-slate-700 capitalize">{m.mes}</td>
                  <td className="p-4 text-right text-green-600 font-medium">{formatCur(m.facturado)}</td>
                  <td className="p-4 text-right text-amber-600 font-medium">{formatCur(m.pendiente)}</td>
                  <td className="p-4 text-right font-black text-slate-800 bg-slate-50/30">{formatCur(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50"><h4 className="font-bold text-slate-700 flex items-center gap-2 text-[14px]"><Building2 size={18} className="text-[#0E5B6D]" /> Resumen de Cuentas por Proveedor</h4></div>
          <table className="w-full text-left text-[12px]">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
              <tr><th className="p-4">Empresa</th><th className="p-4 text-right">Facturado</th><th className="p-4 text-right">Pendiente</th><th className="p-4 text-right bg-slate-100 text-slate-800">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(empresasDelAnio.reduce((acc, curr) => {
                if (!acc[curr.empresa]) acc[curr.empresa] = { t: 0, f: 0, p: 0 };
                acc[curr.empresa].t += curr.total;
                acc[curr.empresa].f += curr.facturado;
                acc[curr.empresa].p += curr.pendiente;
                return acc;
              }, {})).map(([nombre, vals]) => (
                <tr key={nombre} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-4 font-bold text-slate-700">{nombre}</td>
                  <td className="p-4 text-right text-green-600 font-medium">{formatCur(vals.f)}</td>
                  <td className="p-4 text-right text-amber-600 font-medium">{formatCur(vals.p)}</td>
                  <td className="p-4 text-right font-black text-slate-800 bg-slate-50/30">{formatCur(vals.t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardFinanciero;