import { useState } from 'react';
import { Link } from 'react-router-dom';

export function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '#funcionalidades', label: 'Funcionalidades' },
    { href: '#diferenciais', label: 'Diferenciais' },
    { href: '#como-usar', label: 'Como usar' },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-3 min-w-0"
          aria-label="Ir para o início"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-brand-dark shadow-sm">
            <span className="text-white font-bold text-xl">O</span>
          </div>
          <span className="text-lg font-bold text-slate-900 truncate">
            Otium<span className="text-brand">IT</span>
          </span>
        </Link>

        {/* Desktop: Navegação + CTAs */}
        <nav className="hidden sm:flex items-center gap-4 sm:gap-6" aria-label="Navegação principal">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-slate-600 hover:text-brand transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-700 hover:text-brand transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-otium-black hover:bg-brand-dark transition-colors"
          >
            Começar
          </Link>
        </nav>

        {/* Mobile: Hamburger + CTAs */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            to="/login"
            className="text-sm font-semibold text-slate-700 hover:text-brand transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center rounded-md bg-brand px-3 py-2 text-sm font-semibold text-otium-black hover:bg-brand-dark transition-colors"
          >
            Começar
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
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
            className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-white shadow-xl sm:hidden flex flex-col pt-20 pb-6 px-4"
            aria-label="Menu mobile"
          >
            <ul className="space-y-1">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-4 py-3 text-base font-medium text-slate-700 hover:bg-slate-50 hover:text-brand transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="border-t border-slate-200 pt-4 mt-4">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:text-brand transition-colors"
                >
                  Entrar
                </Link>
              </li>
              <li>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block rounded-lg px-4 py-3 text-base font-semibold text-brand hover:bg-brand/10 transition-colors"
                >
                  Começar
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
