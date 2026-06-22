import React, { useState } from 'react';
import { auth } from '../../../firebaseConfig';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

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
      setMensaje('Contraseña actualizada correctamente.');
      setPasswordActual('');
      setNuevaPassword('');
      setConfirmarPassword('');
    } catch (error) {
      setMensaje('Error: ' + (error.code === 'auth/wrong-password' ? 'Contraseña actual incorrecta.' : error.message));
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'url(/pattern.jpg)', backgroundSize: 'cover' }}></div>

      <form onSubmit={handleUpdate} className="relative space-y-4">
        <div>
          <label className="block text-sm font-bold text-gray-700">Contraseña Actual</label>
          <input type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#2383C2] outline-none" required />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">Nueva Contraseña</label>
          <input type="password" value={nuevaPassword} onChange={(e) => setNuevaPassword(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#2383C2] outline-none" required />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">Confirmar Contraseña</label>
          <input type="password" value={confirmarPassword} onChange={(e) => setConfirmarPassword(e.target.value)}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-[#2383C2] outline-none" required />
        </div>

        <div className="text-xs space-y-1 text-gray-500">
          <p className={tieneLongitud ? 'text-green-600' : ''}>• Mínimo 8 caracteres</p>
          <p className={tieneMayuscula ? 'text-green-600' : ''}>• Al menos una mayúscula</p>
          <p className={tieneNumero ? 'text-green-600' : ''}>• Al menos un número</p>
        </div>

        <button type="submit" className="w-full bg-[#2383C2] text-white py-2 rounded-lg font-bold hover:bg-[#0a4a58] transition">
          Actualizar Contraseña
        </button>

        {mensaje && (
          <p className={`text-sm font-medium ${mensaje.includes('correctamente') ? 'text-green-600' : 'text-red-600'}`}>
            {mensaje}
          </p>
        )}
      </form>
    </div>
  );
};

export default CambiarPasswordSeguro;