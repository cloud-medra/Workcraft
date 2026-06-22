import React from 'react';
import { User, Mail, Shield, AtSign } from 'lucide-react';

const Perfil = ({ userData }) => {
  return (
    <div className="max-w-xl">
      <h3 className="text-2xl font-bold mb-6 text-gray-800">Mi Perfil</h3>

      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">

        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
          <User className="text-[#2383C2]" />
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Nombre Completo</p>
            <p className="font-semibold text-gray-700">{userData.nombreCompleto || 'No disponible'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
          <AtSign className="text-[#2383C2]" />
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Nombre de Usuario</p>
            <p className="font-semibold text-gray-700">{userData.nombreUsuario || 'No disponible'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
          <Mail className="text-[#2383C2]" />
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Email</p>
            <p className="font-semibold text-gray-700">{userData.email || 'No disponible'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
          <Shield className="text-[#2383C2]" />
          <div>
            <p className="text-xs text-gray-400 uppercase font-bold">Rol</p>
            <p className="font-semibold text-gray-700 capitalize">{userData.rol || 'No asignado'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Perfil;