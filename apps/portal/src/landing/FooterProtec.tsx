import { Link } from 'react-router-dom';

const PROTEC_CONTACT = {
  phone: '(43) 3374-6160',
  email: 'contato@protec.cnt.br',
  address: 'Rua Brasil, 862 - 1º Andar, Londrina',
} as const;

export function FooterProtec() {
  return (
    <footer className="border-t border-white/10 bg-[#0f3428] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex items-center">
              <img
                src="/logo-protec-1.png"
                alt="Protec – Contabilidade Assessoria e Consultoria Empresarial"
                className="h-10 sm:h-12 w-auto flex-shrink-0 object-contain object-left"
              />
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm" aria-label="Links do rodapé">
              <Link
                to="/login"
                className="text-slate-300 hover:text-[#e8dfd0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#e8dfd0] focus:ring-offset-2 focus:ring-offset-[#0f3428] rounded"
              >
                Entrar
              </Link>
              <Link
                to="/register"
                className="text-slate-300 hover:text-[#e8dfd0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#e8dfd0] focus:ring-offset-2 focus:ring-offset-[#0f3428] rounded"
              >
                Criar conta
              </Link>
            </nav>
          </div>

          <div className="grid gap-4 text-sm text-slate-300 sm:grid-cols-3 sm:gap-6">
            <a
              href={`tel:${PROTEC_CONTACT.phone.replace(/\D/g, '')}`}
              className="hover:text-[#e8dfd0] transition-colors"
            >
              Ligue: {PROTEC_CONTACT.phone}
            </a>
            <a
              href={`mailto:${PROTEC_CONTACT.email}`}
              className="hover:text-[#e8dfd0] transition-colors"
            >
              {PROTEC_CONTACT.email}
            </a>
            <span>{PROTEC_CONTACT.address}</span>
          </div>

          <div className="flex justify-center gap-4">
            <a
              href="https://www.facebook.com/protec.assessoria"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-[#e8dfd0] transition-colors"
              aria-label="Facebook"
            >
              <span className="sr-only">Facebook</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
              </svg>
            </a>
            <a
              href="https://br.linkedin.com/company/protec---assessoria-e-consultoria"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-[#e8dfd0] transition-colors"
              aria-label="LinkedIn"
            >
              <span className="sr-only">LinkedIn</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/protec.assessoria"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-[#e8dfd0] transition-colors"
              aria-label="Instagram"
            >
              <span className="sr-only">Instagram</span>
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.048-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 sm:text-left">
          Sistema de Inteligência Tributária para escritórios de contabilidade e advocacia.
        </p>
        <p className="mt-2 text-center text-xs text-slate-400 sm:text-left">
          Ferramenta de apoio à decisão. Não substitui consultoria jurídica ou contábil.
        </p>
        <div className="mt-4 text-center sm:text-left">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="text-xs text-slate-400 hover:text-[#e8dfd0] transition-colors focus:outline-none focus:ring-2 focus:ring-[#e8dfd0] focus:ring-offset-2 focus:ring-offset-[#0f3428] rounded"
          >
            Voltar ao topo
          </button>
        </div>
      </div>
    </footer>
  );
}
