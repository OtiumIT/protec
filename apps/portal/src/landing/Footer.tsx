import { Link } from 'react-router-dom';
import { LogoProvisorio } from './LogoProvisorio';

const institutionalLinks = [
  { to: '/quem-somos', label: 'Quem somos' },
  { to: '/o-produto', label: 'O Produto' },
  { to: '/aviso-legal', label: 'Aviso Legal' },
  { to: '/politica-privacidade', label: 'Política de Privacidade' },
  { to: '/termos-de-uso', label: 'Termos de Uso' },
  { to: '/fale-conosco', label: 'Contato' },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#0f172a] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:items-center md:gap-6">
          <div>
            <LogoProvisorio dark variant="iatax" className="text-sm" />
          </div>
          <p className="text-center md:text-center text-slate-300 leading-relaxed max-w-sm md:max-w-none mx-auto md:mx-0">
            Tecnologia nascida da expertise de grandes players do setor contábil
          </p>
          <nav
            className="flex flex-col sm:flex-row sm:flex-wrap sm:justify-center gap-3 md:flex-col md:items-end md:justify-center text-sm"
            aria-label="Links institucionais"
          >
            {institutionalLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="hover:text-white transition-colors rounded px-1"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="border-t border-white/10 py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm text-slate-500">
            © 2026 Iatax Sistemas Inteligentes LTDA — 65.178.164/0001-59. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
