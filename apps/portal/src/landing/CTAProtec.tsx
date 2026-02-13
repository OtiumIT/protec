import { Link } from 'react-router-dom';
import { protecClasses } from './protecTheme';

export function CTAProtec() {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-br from-[#1a4d3d] via-[#0f3428] to-[#0a2520]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/20 bg-white/5 px-6 py-12 text-center sm:px-12 sm:py-16 backdrop-blur-sm">
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Pronto para começar?
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-slate-300">
            Organize sua carteira de clientes, arquivos fiscais e simule rating e cenários em um único painel.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className={`w-full sm:w-auto inline-flex items-center justify-center rounded-md ${protecClasses.bgAccent} ${protecClasses.bgAccentHover} ${protecClasses.textAccent} px-6 py-3 text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[#e8dfd0] focus:ring-offset-2 focus:ring-offset-[#1a4d3d]`}
            >
              Criar conta
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border-2 border-white text-white px-6 py-3 text-base font-semibold hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#1a4d3d]"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
