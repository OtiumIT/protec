import { Link } from 'react-router-dom';
import { LogoProvisorio } from './LogoProvisorio';

/** URL do perfil LinkedIn; use '#' ou vazio para ocultar o ícone no footer. */
const LINKEDIN_URL = '#';

export function Footer() {
  const showLinkedIn = Boolean(LINKEDIN_URL && LINKEDIN_URL !== '#');

  return (
    <footer className="border-t border-slate-200 bg-[#0f172a] py-10 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
          <LogoProvisorio dark variant="iatax" className="text-sm" />
          <nav className="flex flex-wrap items-center justify-center gap-2 text-sm" aria-label="Links legais e contato">
            <Link to="/aviso-legal" className="hover:text-white transition-colors rounded px-1">
              Aviso Legal
            </Link>
            <span className="text-slate-500" aria-hidden>|</span>
            <Link to="/fale-conosco" className="hover:text-white transition-colors rounded px-1">
              Contato
            </Link>
            <span className="text-slate-500" aria-hidden>|</span>
            <Link to="/politica-privacidade" className="hover:text-white transition-colors rounded px-1">
              Política de Privacidade
            </Link>
          </nav>
          {showLinkedIn && (
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </footer>
  );
}
