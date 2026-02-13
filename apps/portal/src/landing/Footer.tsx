import { Link } from 'react-router-dom';

export function Footer() {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/20">
              <span className="text-brand font-bold text-sm">O</span>
            </div>
            <span className="text-sm font-semibold text-slate-700">
              Otium<span className="text-brand">IT</span>
            </span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm" aria-label="Links do rodapé">
            <Link to="/login" className="text-slate-600 hover:text-brand transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded">
              Entrar
            </Link>
            <Link to="/register" className="text-slate-600 hover:text-brand transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded">
              Criar conta
            </Link>
            <button
              type="button"
              onClick={scrollToTop}
              className="text-slate-600 hover:text-brand transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded"
            >
              Voltar ao topo
            </button>
          </nav>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500 sm:text-left">
          Sistema de Inteligência Tributária para escritórios de contabilidade e advocacia.
        </p>
        <p className="mt-2 text-center text-xs text-slate-500 sm:text-left">
          Ferramenta de apoio à decisão. Não substitui consultoria jurídica ou contábil.
        </p>
      </div>
    </footer>
  );
}
