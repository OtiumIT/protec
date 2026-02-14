import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';
import { CTA } from '../CTA';
import { WhoIsFor } from '../WhoIsFor';
import { TrustBlock } from '../TrustBlock';
import { HeroIllustrationPlaceholder } from '../HeroIllustrationPlaceholder';

const HERO_IMAGE_SRC = '/hero-o-produto.png';

const MODULOS = [
  {
    id: 'scanner-pgfn',
    title: 'Scanner de Editais PGFN',
    description:
      'Identifique oportunidades em editais do PGFN com agilidade. O módulo cruza dados do seu escritório com publicações oficiais para apoiar decisões de adesão e recuperação.',
    barColor: 'bg-[#194f47]',
    imageSrc: '/modulo-scanner-pgfn.png',
    imageAlt: 'Tela do Scanner de Editais PGFN',
  },
  {
    id: 'simulador-in2306',
    title: 'Simulador IN 2.306',
    description:
      'Compare cenários em minutos: cálculo 2025, projeção 2026 (IN 2.306) e Equiparação Hospitalar. Planejamento para Lucro Presumido com ajuste anual e adicional de IRPJ – sem horas de planilha.',
    barColor: 'bg-brand',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Tela do Simulador IN 2.306',
  },
  {
    id: 'validador-rating',
    title: 'Validador de Rating CAPAG',
    description:
      'Informe os dados do balanço e da DRE; o sistema calcula Liquidez Corrente, Liquidez Geral e Solvência conforme Portaria 6.757/2022 e classifica o rating. Confronte estimado x real para decisões mais seguras.',
    barColor: 'bg-[#1e3a5f]',
    imageSrc: '/modulo-validador-rating.png',
    imageAlt: 'Tela do Validador de Rating CAPAG',
  },
] as const;

function ModuloImage({
  src,
  alt,
  barColor,
  fallbackIcon,
}: {
  src: string;
  alt: string;
  barColor: string;
  fallbackIcon: React.ReactNode;
}) {
  const [useFallback, setUseFallback] = useState(false);

  if (useFallback) {
    return (
      <div
        className={`aspect-[4/3] w-full flex items-center justify-center ${barColor} rounded-t-2xl`}
        aria-hidden
      >
        <span className="text-white/80">{fallbackIcon}</span>
      </div>
    );
  }

  return (
    <div className="aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-slate-100">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        onError={() => setUseFallback(true)}
      />
    </div>
  );
}

export function OProduto() {
  const [heroPlaceholder, setHeroPlaceholder] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingHeader />

      {/* Hero com CTAs e imagem */}
      <section className="relative overflow-hidden w-full py-10 sm:py-12 lg:py-14 bg-gradient-to-br from-[#0f172a] via-[#1A2E4C] to-[#1e3a5f]">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:gap-12 lg:items-center">
            <div className="mx-auto max-w-2xl text-center lg:max-w-none lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                A inteligência tributária que o seu escritório sempre quis
              </h1>
              <p className="mt-5 text-base text-slate-300 sm:text-lg leading-relaxed">
                Soluções para organizar clientes, arquivos fiscais e simular rating e cenários tributários.
              </p>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
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
                {heroPlaceholder ? (
                  <HeroIllustrationPlaceholder />
                ) : (
                  <img
                    src={HERO_IMAGE_SRC}
                    alt="Ilustração de inteligência tributária e análise de dados para escritórios"
                    className="h-full w-full object-contain object-center"
                    onError={() => setHeroPlaceholder(true)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 bg-white">
        {/* Vídeo demonstrativo */}
        <div className="mt-10 mb-[60px] mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
          <div
            className="aspect-video w-full rounded-xl border border-slate-200/80 bg-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center gap-3"
            aria-label="Placeholder para vídeo demonstrativo"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm">
              <svg className="ml-1 h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">Vídeo demonstrativo em breve</p>
          </div>
        </div>

        {/* Módulos com imagem e link */}
        <section className="py-12 sm:py-16 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {MODULOS.map((mod) => (
                <div
                  key={mod.id}
                  className="flex flex-col rounded-2xl border border-[#f0f0f0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
                >
                  <ModuloImage
                    src={mod.imageSrc}
                    alt={mod.imageAlt}
                    barColor={mod.barColor}
                    fallbackIcon={
                      <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    }
                  />
                  <div className="flex flex-1 flex-col bg-white p-8 pt-6">
                    <h3 className="text-xl font-bold tracking-wide text-slate-900">{mod.title}</h3>
                    <p className="mt-4 flex-1 text-slate-600 leading-[1.6] text-base">{mod.description}</p>
                    <Link
                      to="/fale-conosco"
                      className="mt-5 inline-flex items-center text-sm font-semibold text-landing-accent transition-colors hover:text-landing-cta"
                    >
                      Ver em ação →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <WhoIsFor />
        <TrustBlock />

        {/* CTA intermediário */}
        <section className="py-10 sm:py-12 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to="/fale-conosco"
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg bg-landing-cta px-6 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-landing-cta focus:ring-offset-2"
              >
                Agendar demonstração
              </Link>
              <Link
                to="/register"
                className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-landing-accent focus:ring-offset-2"
              >
                Criar minha conta
              </Link>
            </div>
          </div>
        </section>

        <CTA />
      </main>
      <Footer />
    </div>
  );
}
