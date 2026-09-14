import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';
import CambiarPassword from './pages/auth/CambiarPassword';
import ProtectedRoute from './components/ProtectedRoute';
import TestPage from './pages/TestPage';
import { ToastProvider } from './context/ToastContext';
import { ModalProvider } from './context/ModalContext';
import { UserProvider } from './context/UserContext';

function App() {
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