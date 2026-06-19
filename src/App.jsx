import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';
import CambiarPassword from './pages/auth/CambiarPassword';
import ProtectedRoute from './components/ProtectedRoute';
import TestPage from './pages/TestPage';
import { ToastProvider } from './context/ToastContext';
import { ModalProvider } from './context/ModalContext';
import { UserProvider } from './context/UserContext';
import { signOut } from 'firebase/auth';
import { auth } from './firebaseConfig';

function App() {
  useEffect(() => {
    const sessionActive = sessionStorage.getItem('sessionActive');

    if (!sessionActive) {
      signOut(auth);
    }

    sessionStorage.setItem('sessionActive', 'true');
  }, []);

  return (
    <UserProvider>
      <ToastProvider>
        <ModalProvider>
          <Router>
            <Routes>
              <Route path="/" element={<LoginForm />} />
              <Route path="/cambiar-password" element={<CambiarPassword />} />
              <Route path="/test-spinner" element={<TestPage />} />
              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Router>
        </ModalProvider>
      </ToastProvider>
    </UserProvider>
  );
}

export default App;