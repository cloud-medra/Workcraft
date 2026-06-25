import React, { useState } from 'react';
import { auth } from '../../../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { CheckCircle2, XCircle, ShieldCheck, Lock } from 'lucide-react';

const CambiarPasswordSeguro = () => {
  const [passwordActual, setPasswordActual] = useState('');
  const [nuevaPassword, setNuevaPassword] = useState('');
  const [confirmarPassword, setConfirmarPassword] = useState('');
  const [mensaje, setMensaje] = useState('');

  const tieneLongitud = nuevaPassword.length >= 8;
  const tieneMayuscula = /[A-Z]/.test(nuevaPassword);
  const tieneNumero = /\d/.test(nuevaPassword);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (nuevaPassword !== confirmarPassword) {
      setMensaje('Error: Las contraseñas nuevas no coinciden.');
      return;
    }
    if (!tieneLongitud || !tieneMayuscula || !tieneNumero) {
      setMensaje('Error: La contraseña no cumple con los requisitos.');
      return;
    }

    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, passwordActual);

    try {
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, nuevaPassword);
      setMensaje('¡Contraseña actualizada correctamente!');
      setPasswordActual(''); setNuevaPassword(''); setConfirmarPassword('');
    } catch (error) {
      setMensaje(error.code === 'auth/wrong-password' ? 'Contraseña actual incorrecta.' : error.message);
    }
  };

  const ValidationItem = ({ isValid, text }) => (
    <div className={`flex items-center gap-2 text-[11px] ${isValid ? 'text-green-600' : 'text-gray-400'}`}>
      {isValid ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden p-0">
      {/* Encabezado Principal */}
      <h2 className="text-[14px] font-bold text-gray-700 p-4 flex items-center gap-2 border-b border-gray-200">
        <ShieldCheck size={16} className="text-[#2383C2]" /> AJUSTES DE SEGURIDAD
      </h2>

      {/* Contenedor centralizado con el patrón de fondo */}
      <div className="flex-grow p-6 flex justify-center items-start bg-gray-50 overflow-auto relative">
        {/* Capa del Patrón */}
        <div
          className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage: `url('/pattern.jpg')`, // Asegúrate de que las comillas sean correctas
            backgroundSize: '150px', // Patrón un poco más pequeño para que se note
            backgroundRepeat: 'repeat'
          }}
        ></div>

        {/* Formulario con z-10 para quedar sobre el patrón */}
        <div className="w-full max-w-lg bg-white border border-gray-200 rounded shadow-sm relative z-10">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Lock size={14} className="text-gray-500" />
            <p className="text-[12px] text-gray-600 font-medium">
              Valida tu identidad para actualizar tu contraseña
            </p>
          </div>

          <form onSubmit={handleUpdate} className="p-6 space-y-4">
            {[
              { label: 'Contraseña Actual', value: passwordActual, setter: setPasswordActual },
              { label: 'Nueva Contraseña', value: nuevaPassword, setter: setNuevaPassword },
              { label: 'Confirmar Contraseña', value: confirmarPassword, setter: setConfirmarPassword }
            ].map((field, idx) => (
              <div key={idx}>
                <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">{field.label}</label>
                <input
                  type="password"
                  value={field.value}
                  onChange={(e) => field.setter(e.target.value)}
                  className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-[#2383C2] transition-colors"
                  required
                />
              </div>
            ))}

            <div className="space-y-1 py-1">
              <ValidationItem isValid={tieneLongitud} text="Mínimo 8 caracteres" />
              <ValidationItem isValid={tieneMayuscula} text="Al menos una mayúscula" />
              <ValidationItem isValid={tieneNumero} text="Al menos un número" />
            </div>

            <button
              type="submit"
              className="w-full h-9 bg-[#2383C2] text-white text-[12px] font-bold rounded hover:bg-[#1d6fa5] transition-all"
            >
              Actualizar Contraseña
            </button>

            {mensaje && (
              <p className={`text-[11px] font-bold text-center ${mensaje.includes('¡') ? 'text-green-600' : 'text-red-500'}`}>
                {mensaje}
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CambiarPasswordSeguro;