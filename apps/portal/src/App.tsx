import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/contexts/AuthContext';
import { LandingOrRedirect } from './landing/LandingOrRedirect';
import { QuemSomos } from './landing/pages/QuemSomos';
import { OProduto } from './landing/pages/OProduto';
import { FaleConosco } from './landing/pages/FaleConosco';
import { AvisoLegal } from './landing/pages/AvisoLegal';
import { PoliticaPrivacidade } from './landing/pages/PoliticaPrivacidade';
import { TermosDeUso } from './landing/pages/TermosDeUso';
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
import { RatingValidatorPrintPreview } from './modules/rating-validator/pages/RatingValidatorPrintPreview';
import { SimuladorIN2306 } from './modules/simulador-in-2306/pages/SimuladorIN2306';
import { IrpfAltaRenda } from './modules/irpf-alta-renda/pages/IrpfAltaRenda';
import { SimuladorImoveis } from './modules/properties/pages/SimuladorImoveis';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
}

function ScrollToTop() {
  const location = useLocation();

  // Sempre que o pathname mudar, força o scroll para o topo
  // para evitar que telas deslogadas e internas abram "no meio" da página anterior.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
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
        path="/rating-validator/print-preview"
        element={
          <PrivateRoute>
            <RatingValidatorPrintPreview />
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
      <Route
        path="/irpf-alta-renda"
        element={
          <PrivateRoute>
            <IrpfAltaRenda />
          </PrivateRoute>
        }
      />
      <Route
        path="/properties/simulador"
        element={
          <PrivateRoute>
            <SimuladorImoveis />
          </PrivateRoute>
        }
      />
      <Route path="/properties/dashboard" element={<Navigate to="/properties/simulador" replace />} />
      <Route path="/properties/:id" element={<Navigate to="/properties/simulador" replace />} />
      <Route path="/properties" element={<Navigate to="/properties/simulador" replace />} />
        <Route path="/quem-somos" element={<QuemSomos />} />
        <Route path="/o-produto" element={<OProduto />} />
        <Route path="/fale-conosco" element={<FaleConosco />} />
        <Route path="/aviso-legal" element={<AvisoLegal />} />
        <Route path="/politica-privacidade" element={<PoliticaPrivacidade />} />
        <Route path="/termos-de-uso" element={<TermosDeUso />} />
        <Route path="/" element={<LandingOrRedirect />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
