import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../schemas/loginSchema';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { ShieldCheck, Mail, Lock, Loader2 } from 'lucide-react';
import loginIllustration from '../assets/login.svg';

const LoginForm = () => {
  const navigate = useNavigate();
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema)
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "usuarios", currentUser.uid));
          if (userDoc.exists() && userDoc.data().passwordChanged === false) {
            navigate('/cambiar-password', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } catch (error) {
          setCheckingSession(false);
        }
      } else {
        setCheckingSession(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const emailLimpio = data.email.trim();
      const userCredential = await signInWithEmailAndPassword(auth, emailLimpio, data.password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, "usuarios", user.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.passwordChanged === false) {
          navigate('/cambiar-password', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        alert("Tu usuario no tiene un perfil configurado en la base de datos.");
      }
    } catch (error) {
      alert("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin text-[#008080]" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-3xl shadow-2xl flex w-full max-w-4xl overflow-hidden min-h-[500px]">

        <div className="w-full md:w-1/2 p-10 flex flex-col justify-center">
          <h2 className="text-2xl font-bold mb-2">Iniciar Sesión</h2>
          <p className="text-gray-500 mb-8">Ingresa tus credenciales para acceder al sistema.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium mb-1">Usuario o Correo</label>
              <div className="flex items-center">
                <Mail className="absolute ml-3 text-gray-400" size={20} />
                <input 
                  {...register("email")} 
                  className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#2383C2] focus:border-[#2383C2] outline-none transition-all" 
                  placeholder="ejemplo@medra.cl" 
                />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div className="relative">
              <label className="block text-sm font-medium mb-1">Contraseña</label>
              <div className="flex items-center">
                <Lock className="absolute ml-3 text-gray-400" size={20} />
                <input
                  {...register("password")}
                  type="password"
                  className="w-full p-3 pl-10 border border-gray-200 rounded-xl focus:ring-1 focus:ring-[#2383C2] focus:border-[#2383C2] outline-none transition-all"
                  placeholder="********"
                  onKeyUp={(e) => setCapsLockOn(e.getModifierState('CapsLock'))}
                />
              </div>
              {capsLockOn && (
                <p className="text-amber-600 text-xs mt-2 flex items-center gap-1 font-semibold">
                  ⚠️ ¡La tecla Bloq Mayús está activada!
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2383C2] text-white p-3 rounded-xl font-bold hover:bg-[#369BCE] transition-all duration-200 mt-4 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Validando...
                </>
              ) : (
                "Ingresar al Sistema →"
              )}
            </button>
          </form>
        </div>

        <div className="hidden md:flex w-1/2 bg-[#208DD0] p-12 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 z-0 pointer-events-none">
            <div className="absolute -top-10 -right-10 w-full h-full bg-white/5 rounded-bl-full"></div>
            <div className="absolute top-6 right-6 grid grid-cols-4 gap-3 opacity-30">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="w-2 h-2 bg-white rounded-full"></div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <h2 className="text-4xl font-bold mb-4 leading-tight">Optimiza tu gestión</h2>
            <p className="text-lg opacity-90">Accede a herramientas avanzadas para controlar tu sistema con total eficiencia.</p>
          </div>
          <div className="relative z-10 flex justify-center my-8">
            <img src={loginIllustration} alt="Gestión" className="w-full max-w-xs object-contain" />
          </div>
          <div className="relative z-10 bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-2xl flex items-center gap-4">
            <div className="text-white"><ShieldCheck size={32} /></div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider">Sistema Integral Medra</p>
              <p className="font-bold">Productividad garantizada</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LoginForm;