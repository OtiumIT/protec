import { Link } from 'react-router-dom';

export function CTA() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-br from-brand/10 to-brand/5 px-6 py-12 text-center sm:px-12 sm:py-16">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Pronto para começar?
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-slate-600">
            Organize sua carteira de clientes, arquivos fiscais e simule rating e cenários em um único painel.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-brand px-6 py-3 text-base font-semibold text-otium-black hover:bg-brand-dark hover:brightness-110 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              Criar conta
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
