import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogoProvisorio } from './LogoProvisorio';

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/quem-somos', label: 'Quem Somos' },
    { to: '/o-produto', label: 'O Produto' },
    { to: '/fale-conosco', label: 'Fale Conosco' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#0f172a] border-b border-white/10 shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <LogoProvisorio dark variant="iatax" onClick={() => setMobileMenuOpen(false)} className="flex-shrink-0" />

        {/* Desktop: menu centralizado + Entrar à direita */}
        <nav className="hidden sm:flex flex-1 justify-center items-center gap-6 lg:gap-8" aria-label="Navegação principal">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors ${
                isActive(link.to) ? 'text-white underline underline-offset-4 decoration-2' : 'text-slate-400 hover:text-white'
              }`}
              aria-current={isActive(link.to) ? 'page' : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
          <Link
            to="/login"
            className="text-sm font-semibold text-white bg-landing-cta hover:bg-orange-600 px-4 py-2.5 rounded-md transition-colors min-h-[44px] inline-flex items-center"
            onClick={() => setMobileMenuOpen(false)}
          >
            Entrar
          </Link>
          <Link
            to="/login"
            className="rounded-lg p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Entrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
        </div>

        {/* Mobile: Entrar + ícone + Hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            to="/login"
            className="text-sm font-semibold text-white bg-landing-cta hover:bg-orange-600 px-3 py-2 rounded-md transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/login"
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Entrar"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 sm:hidden"
            aria-hidden="true"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-slate-900 shadow-xl sm:hidden flex flex-col pt-20 pb-6 px-4 border-l border-white/10"
            aria-label="Menu mobile"
          >
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                      isActive(link.to) ? 'text-white bg-white/10' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                    aria-current={isActive(link.to) ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="border-t border-white/10 pt-4 mt-4">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-base font-semibold text-white bg-landing-cta hover:bg-orange-600 transition-colors text-center"
                >
                  Entrar
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-base font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  Entrar
                </Link>
              </li>
            </ul>
          </nav>
        </>
      )}
    </header>
    </>
  );
}
