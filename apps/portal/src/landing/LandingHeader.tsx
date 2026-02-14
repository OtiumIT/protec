import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoProvisorio } from './LogoProvisorio';

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/quem-somos', label: 'Quem Somos' },
    { to: '/o-produto', label: 'O Produto' },
    { to: '/fale-conosco', label: 'Fale Conosco' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-slate-900 border-b border-white/10 shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <LogoProvisorio dark variant="iatax" onClick={() => setMobileMenuOpen(false)} />

        {/* Desktop: 4 links + Criar conta + ícone Entrar */}
        <nav className="hidden sm:flex items-center gap-4 sm:gap-6" aria-label="Navegação principal">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/register"
            className="text-sm font-semibold text-white bg-landing-cta hover:bg-orange-600 px-4 py-2 rounded-md transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Criar conta
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
        </nav>

        {/* Mobile: Criar conta + ícone Entrar + Hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            to="/register"
            className="text-sm font-semibold text-white bg-landing-cta hover:bg-orange-600 px-3 py-2 rounded-md transition-colors"
          >
            Criar conta
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
                    className="block rounded-lg px-4 py-3 text-base font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="border-t border-white/10 pt-4 mt-4">
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-base font-semibold text-white bg-landing-cta hover:bg-orange-600 transition-colors text-center"
                >
                  Criar conta
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
