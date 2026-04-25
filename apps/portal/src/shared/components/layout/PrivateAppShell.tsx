import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Layout } from './Layout';

/**
 * Shell persistente da área logada: Layout + Sidebar montam uma vez;
 * só o conteúdo da rota (Outlet) troca ao navegar.
 */
export function PrivateAppShell() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-canvas text-slate-600">
        Carregando…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
