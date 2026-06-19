import React, { useState } from 'react';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth } from "../../firebaseConfig";
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, XCircle } from 'lucide-react';

const CambiarPassword = () => {
  const { showToast } = useToast();
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const validations = {
    length: passwords.new.length >= 8,
    upper: /[A-Z]/.test(passwords.new),
    lower: /[a-z]/.test(passwords.new),
    number: /\d/.test(passwords.new),
  };

  const isFormValid = Object.values(validations).every(Boolean) &&
    passwords.new === passwords.confirm &&
    passwords.new !== '';

  const handleUpdate = async () => {
    if (!isFormValid) {
      showToast("Por favor, cumple con todos los requisitos de seguridad.", "error");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser;
      await updatePassword(user, passwords.new);
      await updateDoc(doc(db, "usuarios", user.uid), { passwordChanged: true });

      showToast("Contraseña actualizada correctamente", "success");
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    } catch (error) {
      showToast("Error: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const RequirementItem = ({ valid, text }) => (
    <div className={`flex items-center gap-2 text-xs ${valid ? 'text-green-600' : 'text-red-500'}`}>
      {valid ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
      <span>{text}</span>
    </div>
  );

  return (
    <div className="flex justify-center items-center h-screen bg-pattern">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-96 border border-gray-100">
        <h2 className="text-xl font-bold mb-2 text-[#0E5B6D]">Configura tu acceso</h2>
        <p className="text-sm text-gray-600 mb-6">Define una nueva contraseña segura.</p>

        <input
          type="password" placeholder="Nueva contraseña"
          className="w-full p-3 border rounded-lg mb-3"
          onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
        />

        <div className="grid grid-cols-2 gap-2 mb-4">
          <RequirementItem valid={validations.length} text="Mínimo 8 caracteres" />
          <RequirementItem valid={validations.upper} text="Una mayúscula" />
          <RequirementItem valid={validations.lower} text="Una minúscula" />
          <RequirementItem valid={validations.number} text="Un número" />
        </div>

        <input
          type="password" placeholder="Confirmar contraseña"
          className={`w-full p-3 border rounded-lg mb-6 ${passwords.confirm && passwords.new !== passwords.confirm ? 'border-red-500' : ''}`}
          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
        />

        <button
          onClick={handleUpdate}
          disabled={loading || !isFormValid}
          className="w-full bg-[#0E5B6D] text-white p-3 rounded-lg hover:bg-[#0a4a58] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Guardar Contraseña'}
        </button>
      </div>
    </div>
  );
};

export default CambiarPassword;