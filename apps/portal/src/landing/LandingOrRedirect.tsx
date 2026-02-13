import { Navigate } from 'react-router-dom';
import { useAuth } from '../shared/contexts/AuthContext';
import { Landing } from './Landing';

/**
 * Rota raiz (/): exibe a landing se o usuário não estiver logado;
 * redireciona para /dashboard se estiver logado.
 */
export function LandingOrRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Carregando...</p>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Landing />;
}
