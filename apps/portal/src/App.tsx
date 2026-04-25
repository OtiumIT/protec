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
import { ForgotPassword } from './modules/auth/pages/ForgotPassword';
import { ResetPassword } from './modules/auth/pages/ResetPassword';
import { Dashboard } from './modules/system/pages/Dashboard';
import { Clients } from './modules/clients/pages/Clients';
import { Tenants } from './modules/companies/pages/Tenants';
import { Users } from './modules/users/pages/Users';
import { Administrators } from './modules/users/pages/Administrators';
import { Editais } from './modules/editais/pages/Editais';
import { Plans } from './modules/plans/pages/Plans';
import { MeuPlano } from './modules/plans/pages/MeuPlano';
import { GestaoAssinatura } from './modules/billing/pages/GestaoAssinatura';
import { FiscalFiles } from './modules/fiscal-files/pages/FiscalFiles';
import { FiscalFilesUpload } from './modules/fiscal-files/pages/FiscalFilesUpload';
import { FiscalFilesCalibrator } from './modules/fiscal-files/pages/FiscalFilesCalibrator';
import { Modules } from './modules/modules/pages/Modules';
import { RatingValidator } from './modules/rating-validator/pages/RatingValidator';
import { RatingValidatorPrintPreview } from './modules/rating-validator/pages/RatingValidatorPrintPreview';
import { SimuladorIN2306 } from './modules/simulador-in-2306/pages/SimuladorIN2306';
import { IrpfAltaRenda } from './modules/irpf-alta-renda/pages/IrpfAltaRenda';
import { SimuladorDistribuicaoLucros } from './modules/simulador-distribuicao-lucros/pages/SimuladorDistribuicaoLucros';
import { SimuladorImoveis } from './modules/properties/pages/SimuladorImoveis';
import SimuladorGanhoCapitalImovel from './modules/properties/pages/SimuladorGanhoCapitalImovel';
import { Properties } from './modules/properties/pages/Properties';
import { PropertyDetail } from './modules/properties/pages/PropertyDetail';
import { Documentacao } from './modules/documentacao/pages/Documentacao';
import { Glossario } from './modules/documentacao/pages/Glossario';
import { AccessList } from './modules/access-list/pages/AccessList';
import { FeedbackAdmin } from './modules/feedback/pages/FeedbackAdmin';
import { ChangePassword } from './modules/auth/pages/ChangePassword';
import { EPSLanding } from './landing/pages/EPSLanding';
import { initAnalytics, trackEvent, trackPageView } from './shared/services/analytics';
import { PrivateAppShell } from './shared/components/layout/PrivateAppShell';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user) return <Navigate to="/login" />;

  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return <>{children}</>;
}

function ScrollToTop() {
  const location = useLocation();

  // Sempre que a rota mudar:
  // - se houver container de scroll da área logada, reseta nele;
  // - caso contrário, usa o scroll global da janela.
  useEffect(() => {
    const privateScrollContainer = document.querySelector('[data-private-scroll-container="true"]');
    if (privateScrollContainer instanceof HTMLElement) {
      privateScrollContainer.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);

  return null;
}

function AnalyticsTracker() {
  const location = useLocation();
  const { user, tenantId } = useAuth();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;

    trackPageView(fullPath, document.title, {
      userId: user?.id,
      companyId: tenantId,
      userRole: user?.role,
    });
  }, [location.hash, location.pathname, location.search, tenantId, user?.id, user?.role]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const clickable = target.closest('a,button,[role="button"],[data-analytics-event]');
      if (!clickable) return;

      const analyticsEvent = clickable.getAttribute('data-analytics-event') || 'ui_click';
      const analyticsLabel =
        clickable.getAttribute('data-analytics-label') ||
        clickable.getAttribute('aria-label') ||
        clickable.textContent?.trim() ||
        undefined;

      trackEvent(
        analyticsEvent,
        {
          page_path: `${location.pathname}${location.search}${location.hash}`,
          element_tag: clickable.tagName.toLowerCase(),
          element_id: clickable.id || undefined,
          element_label: analyticsLabel,
          link_url: clickable instanceof HTMLAnchorElement ? clickable.href : undefined,
        },
        {
          userId: user?.id,
          companyId: tenantId,
          userRole: user?.role,
        },
      );
    };

    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, [location.hash, location.pathname, location.search, tenantId, user?.id, user?.role]);

  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <AnalyticsTracker />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/EPS" element={<EPSLanding />} />
        <Route
          path="/change-password"
          element={
            <PrivateRoute>
              <ChangePassword />
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
        <Route element={<PrivateAppShell />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/tenants" element={<Tenants />} />
          <Route path="/users" element={<Users />} />
          <Route path="/administrators" element={<Administrators />} />
          <Route path="/editais" element={<Editais />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/meu-plano" element={<MeuPlano />} />
          <Route path="/gestao-assinatura" element={<GestaoAssinatura />} />
          <Route path="/fiscal-files" element={<FiscalFiles />} />
          <Route path="/fiscal-files/upload" element={<FiscalFilesUpload />} />
          <Route path="/fiscal-files/calibrator" element={<FiscalFilesCalibrator />} />
          <Route path="/fiscal-files/calibrador" element={<Navigate to="/fiscal-files/calibrator" replace />} />
          <Route path="/modules" element={<Modules />} />
          <Route path="/rating-validator" element={<RatingValidator />} />
          <Route path="/simulador-in-2306" element={<SimuladorIN2306 />} />
          <Route path="/irpf-alta-renda" element={<IrpfAltaRenda />} />
          <Route path="/simulador-distribuicao-lucros-lei-15270" element={<SimuladorDistribuicaoLucros />} />
          <Route path="/properties/simulador" element={<SimuladorImoveis />} />
          <Route path="/properties/simulador-ganho-capital" element={<SimuladorGanhoCapitalImovel />} />
          <Route path="/properties/dashboard" element={<Navigate to="/properties/simulador" replace />} />
          <Route path="/properties/:id" element={<PropertyDetail />} />
          <Route path="/properties" element={<Properties />} />
          <Route path="/documentacao" element={<Documentacao />} />
          <Route path="/documentacao/glossario" element={<Glossario />} />
          <Route path="/access-list" element={<AccessList />} />
          <Route path="/feedback-admin" element={<FeedbackAdmin />} />
        </Route>
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
