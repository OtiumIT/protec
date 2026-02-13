import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DashboardMockup } from './DashboardMockup';

export function Hero() {
  const [heroImageLoaded, setHeroImageLoaded] = useState(false);

  return (
    <section className="relative overflow-hidden bg-slate-50 py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-center">
          <div className="mx-auto max-w-2xl text-center lg:max-w-none lg:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Organize clientes, arquivos e simule rating e cenários em um só lugar
            </h1>
            <p className="mt-4 text-lg text-slate-600 sm:text-xl">
              Para contadores e advogados que atendem empresas. Ferramenta de apoio à decisão: gestão por cliente e competência, simulação de Rating (Portaria 6.757/2022) e cenários da IN 2.306/2026.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
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
          <div className="relative mx-auto w-full max-w-lg lg:max-w-none order-first lg:order-none">
            <div className="relative aspect-video rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
              <img
                src="/hero-dashboard.png"
                alt="Dashboard do sistema com visão de clientes e arquivos fiscais por competência"
                className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity ${heroImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setHeroImageLoaded(true)}
                onError={() => setHeroImageLoaded(false)}
              />
              <div
                className={`absolute inset-0 transition-opacity ${heroImageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                aria-hidden={heroImageLoaded}
              >
                <DashboardMockup />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
