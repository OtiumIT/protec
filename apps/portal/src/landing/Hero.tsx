import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroIllustrationPlaceholder } from './HeroIllustrationPlaceholder';

const HERO_ILLUSTRATION_SRC = '/hero-illustration.png';

export function Hero() {
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  return (
    <section className="relative overflow-hidden py-6 sm:py-8 lg:py-10 bg-gradient-to-r from-[#1A2E4C] via-[#1e3a5f] to-[#2563eb]">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:gap-10 lg:items-center">
          <div className="mx-auto max-w-2xl text-center lg:max-w-none lg:text-left">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
              Inteligência tributária que transforma dados fiscais em oportunidades de recuperação e economia
            </h1>
            <p className="mt-4 text-base text-slate-300 sm:text-lg">
              Para escritórios que já têm os dados na mão e querem transformá-los em resultado.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-orange-400 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-orange-500 hover:shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-orange-300 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Quero transformar minhas oportunidades
              </Link>
              <Link
                to="/fale-conosco"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-blue-400 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-blue-500 hover:shadow-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Agendar demonstração
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[360px] order-first lg:order-none">
            <div className="relative aspect-square overflow-hidden">
              {showPlaceholder ? (
                <HeroIllustrationPlaceholder />
              ) : (
                <img
                  src={HERO_ILLUSTRATION_SRC}
                  alt=""
                  className="h-full w-full object-contain object-center"
                  onError={() => setShowPlaceholder(true)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
