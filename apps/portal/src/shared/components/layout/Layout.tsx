import { ReactNode, useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { FeedbackTrigger } from '../feedback/FeedbackFab';
import { TOP_RAIL_HEIGHT_CLASS } from './layout-top-rail';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user } = useAuth();
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
    <div className="h-screen overflow-hidden bg-app-canvas flex">
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((c) => !c)}
      />
      <div className="flex-1 h-screen min-h-0 flex flex-col min-w-0 relative">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-private-scroll-container="true">
          <header
            className={`bg-white/90 backdrop-blur border-b border-slate-200/90 box-border px-3 sm:px-5 sticky top-0 z-30 shadow-sm ${TOP_RAIL_HEIGHT_CLASS} flex items-center shrink-0`}
            style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0px)' }}
          >
            <div className="h-full min-h-0 w-full flex items-center justify-between gap-3">
              <div className="flex items-center min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isSidebarCollapsed) setIsSidebarCollapsed(false);
                    else setIsSidebarOpen((o) => !o);
                  }}
                  className={`p-2 rounded-[10px] hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center -ml-1 ${!isSidebarCollapsed ? 'lg:hidden' : ''}`}
                  aria-label="Abrir menu"
                >
                  <Menu className="w-6 h-6" strokeWidth={2} aria-hidden />
                </button>
              </div>

              <div className="ml-auto flex min-w-0 items-center justify-end gap-2 sm:gap-3">
                <div className="hidden min-[400px]:block min-w-0 max-w-[220px] text-right leading-tight sm:max-w-[280px]">
                  <p className="truncate text-sm font-semibold text-slate-900" title={user?.name ?? undefined}>
                    {user?.name}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 sm:text-xs">
                    {user?.role === 'super_admin'
                      ? 'Super Admin'
                      : user?.role === 'admin'
                        ? 'Administrador'
                        : 'Usuário'}
                  </p>
                </div>
                <div className="flex shrink-0 items-center min-[400px]:ml-0.5 min-[400px]:border-l min-[400px]:border-slate-200 min-[400px]:pl-3">
                  <FeedbackTrigger variant="header" />
                </div>
              </div>
            </div>
          </header>

          <main className="px-4 sm:px-6 pb-6 sm:pb-8 pt-3 sm:pt-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
