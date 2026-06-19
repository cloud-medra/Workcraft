import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import Spinner from './ui/Spinner';

const ProtectedRoute = ({ children }) => {
  const { userData, loading } = useUser();

  // 1. Mientras Firebase está verificando la sesión, mostramos el spinner
  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  // 2. Si no hay usuario en el contexto, redirigimos al login
  if (!userData) {
    return <Navigate to="/" replace />;
  }

  // 3. Si el usuario existe pero no ha cambiado su contraseña, redirigimos
  if (userData.passwordChanged === false) {
    return <Navigate to="/cambiar-password" replace />;
  }

  // 4. Si todo está correcto, renderizamos el contenido protegido
  return <>{children}</>;
};

export default ProtectedRoute;