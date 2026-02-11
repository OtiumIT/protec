import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/contexts/AuthContext';
import { Login } from './modules/auth/pages/Login';
import { Register } from './modules/auth/pages/Register';
import { Dashboard } from './modules/system/pages/Dashboard';
import { Clients } from './modules/clients/pages/Clients';
import { Tenants } from './modules/companies/pages/Tenants';
import { Users } from './modules/users/pages/Users';
import { Administrators } from './modules/users/pages/Administrators';
import { Editais } from './modules/editais/pages/Editais';
import { Plans } from './modules/plans/pages/Plans';
import { FiscalFiles } from './modules/fiscal-files/pages/FiscalFiles';
import { FiscalFilesUpload } from './modules/fiscal-files/pages/FiscalFilesUpload';
import { Modules } from './modules/modules/pages/Modules';
import { RatingValidator } from './modules/rating-validator/pages/RatingValidator';
import { SimuladorIN2306 } from './modules/simulador-in-2306/pages/SimuladorIN2306';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<div className="min-h-screen flex items-center justify-center"><p className="text-slate-600">Página em desenvolvimento</p></div>} />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <PrivateRoute>
            <Clients />
          </PrivateRoute>
        }
      />
      <Route
        path="/tenants"
        element={
          <PrivateRoute>
            <Tenants />
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <Users />
          </PrivateRoute>
        }
      />
      <Route
        path="/administrators"
        element={
          <PrivateRoute>
            <Administrators />
          </PrivateRoute>
        }
      />
      <Route
        path="/editais"
        element={
          <PrivateRoute>
            <Editais />
          </PrivateRoute>
        }
      />
      <Route
        path="/plans"
        element={
          <PrivateRoute>
            <Plans />
          </PrivateRoute>
        }
      />
      <Route
        path="/fiscal-files"
        element={
          <PrivateRoute>
            <FiscalFiles />
          </PrivateRoute>
        }
      />
      <Route
        path="/fiscal-files/upload"
        element={
          <PrivateRoute>
            <FiscalFilesUpload />
          </PrivateRoute>
        }
      />
      <Route
        path="/modules"
        element={
          <PrivateRoute>
            <Modules />
          </PrivateRoute>
        }
      />
      <Route
        path="/rating-validator"
        element={
          <PrivateRoute>
            <RatingValidator />
          </PrivateRoute>
        }
      />
      <Route
        path="/simulador-in-2306"
        element={
          <PrivateRoute>
            <SimuladorIN2306 />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
