import { useState } from 'react';
import { Link } from 'react-router-dom';
import { protecClasses } from './protecTheme';

export function LandingHeaderProtec() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '#funcionalidades', label: 'Funcionalidades' },
    { href: '#diferenciais', label: 'Diferenciais' },
    { href: '#como-usar', label: 'Como usar' },
  ];

  return (
    <>
      {/* Barra utilitária – redes sociais */}
      <div className={`${protecClasses.bgDarkDarker} py-2`}>
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <a
              href="https://www.facebook.com/protec.assessoria"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-[#e8dfd0] transition-colors"
              aria-label="Facebook"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a
              href="https://br.linkedin.com/company/protec---assessoria-e-consultoria"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-[#e8dfd0] transition-colors"
              aria-label="LinkedIn"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/protec.assessoria"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/80 hover:text-[#e8dfd0] transition-colors"
              aria-label="Instagram"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>
      </div>

      {/* Header principal – tema escuro */}
      <header className={`sticky top-0 z-50 w-full ${protecClasses.bgPrimary} border-b border-white/10 shadow-lg`}>
        <div className="mx-auto flex h-20 sm:h-24 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo Protec (já inclui nome e subtítulo) */}
          <Link
            to="/protec"
            className="flex items-center min-w-0"
            aria-label="Ir para o início"
            onClick={() => setMobileMenuOpen(false)}
          >
            <img
              src="/logo-protec-1.png"
              alt="Protec – Contabilidade Assessoria e Consultoria Empresarial"
              className="h-12 sm:h-14 w-auto max-h-full object-contain object-left"
            />
          </Link>

          {/* Desktop: Navegação + CTAs */}
          <nav className="hidden sm:flex items-center gap-4 sm:gap-6" aria-label="Navegação principal">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-white hover:text-[#e8dfd0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#e8dfd0] focus:ring-offset-2 focus:ring-offset-[#1a4d3d] rounded"
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/login"
              className="text-sm font-semibold text-white hover:text-[#e8dfd0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#e8dfd0] focus:ring-offset-2 focus:ring-offset-[#1a4d3d] rounded"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className={`inline-flex items-center justify-center rounded-md ${protecClasses.bgAccent} ${protecClasses.bgAccentHover} ${protecClasses.textAccent} px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#e8dfd0] focus:ring-offset-2 focus:ring-offset-[#1a4d3d]`}
            >
              Começar
            </Link>
          </nav>

          {/* Mobile: Hamburger + CTAs */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              to="/login"
              className="text-sm font-semibold text-white hover:text-[#e8dfd0] transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className={`inline-flex items-center justify-center rounded-md ${protecClasses.bgAccent} ${protecClasses.textAccent} px-3 py-2 text-sm font-semibold transition-colors`}
            >
              Começar
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#e8dfd0] focus:ring-offset-2 focus:ring-offset-[#1a4d3d]"
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

        {/* Mobile menu drawer – tema escuro */}
        {mobileMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 sm:hidden"
              aria-hidden="true"
              onClick={() => setMobileMenuOpen(false)}
            />
            <nav
              className={`fixed inset-y-0 right-0 z-50 w-full max-w-xs ${protecClasses.bgPrimary} shadow-xl sm:hidden flex flex-col pt-20 pb-6 px-4`}
              aria-label="Menu mobile"
            >
              <ul className="space-y-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block rounded-lg px-4 py-3 text-base font-medium text-white hover:bg-white/10 hover:text-[#e8dfd0] transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
                <li className="border-t border-white/20 pt-4 mt-4">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block rounded-lg px-4 py-3 text-base font-semibold text-white hover:bg-white/10 hover:text-[#e8dfd0] transition-colors"
                  >
                    Entrar
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block rounded-lg px-4 py-3 text-base font-semibold ${protecClasses.bgAccent} ${protecClasses.textAccent} text-center transition-colors`}
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
