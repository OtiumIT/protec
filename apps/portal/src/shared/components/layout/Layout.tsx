import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { ApiVersionBadge } from '../ApiVersionBadge';
import { FeedbackFab } from '../feedback/FeedbackFab';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(isSidebarCollapsed));
    } catch {
      // ignore
    }
  }, [isSidebarCollapsed]);

  return (
    <div className="h-screen overflow-hidden bg-slate-50 flex">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((c) => !c)}
      />
      <div className="flex-1 h-screen min-h-0 flex flex-col min-w-0 relative">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-private-scroll-container="true">
          {/* Header */}
          <header
            className="bg-[#0c326f] border-b border-[#1351b4] px-4 sm:px-6 sticky top-0 z-30 shadow-md h-[72px]"
            style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
          >
            <div className="h-full flex items-start justify-between gap-4 pt-2.5">
              <div className="flex items-center gap-4 min-w-0">
                {/* Botão abrir menu: mobile sempre; no desktop só quando menu está escondido */}
                <button
                  onClick={() => {
                    if (isSidebarCollapsed) setIsSidebarCollapsed(false);
                    else setIsSidebarOpen((o) => !o);
                  }}
                  className={`p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors flex ${!isSidebarCollapsed ? 'lg:hidden' : ''}`}
                  aria-label="Abrir menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="min-w-0 text-right leading-tight">
                  <h2 className="text-base sm:text-lg font-semibold text-white truncate">Bem-vindo, {user?.name}!</h2>
                  <p className="text-xs sm:text-sm text-white/70 truncate">
                    {user?.role === 'super_admin' ? 'Super Administrador' :
                    user?.role === 'admin' ? 'Administrador' : 'Usuário'}
                  </p>
                </div>
                <Button variant="tertiary" size="sm" onClick={logout} className="inline-flex items-center justify-center gap-1.5 h-9 min-h-[36px] px-3 py-2 text-sm bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline text-white">Sair</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="px-4 sm:px-6 pb-6 sm:pb-8 pt-3 sm:pt-4">
            {children}
          </main>
          <FeedbackFab />
          {user?.role?.toLowerCase() === 'super_admin' && (
            <div className="absolute bottom-2 right-4 pointer-events-none">
              <ApiVersionBadge />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
