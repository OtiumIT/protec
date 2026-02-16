import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeroIllustrationPlaceholder } from './HeroIllustrationPlaceholder';

const HERO_ILLUSTRATION_SRC = '/hero-illustration.png';

export function Hero() {
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  return (
    <section className="relative overflow-hidden w-full py-10 sm:py-12 lg:py-14 lg:min-h-[420px] bg-gradient-to-br from-[#0f172a] via-[#1A2E4C] to-[#1e3a5f]">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:gap-12 lg:items-center">
          <div className="mx-auto max-w-2xl text-center lg:max-w-none lg:text-left flex flex-col h-full">
            <div className="flex-1 flex flex-col lg:justify-center">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Inteligência tributária que transforma dados fiscais em oportunidades de recuperação e economia
              </h1>
              <p className="mt-5 text-base text-slate-300 sm:text-lg leading-relaxed">
                Para escritórios que já têm os dados na mão e querem transformá-los em resultado.
              </p>
            </div>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start lg:mt-auto lg:mb-1">
              <Link
                to="/register"
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg bg-landing-cta px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-orange-600 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-landing-cta focus:ring-offset-2 focus:ring-offset-[#0f172a]"
              >
                Quero transformar minhas oportunidades
              </Link>
              <Link
                to="/fale-conosco"
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg border-2 border-white bg-white/10 px-6 py-3 text-base font-semibold text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
              >
                Agendar demonstração
              </Link>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] order-first lg:order-none">
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
