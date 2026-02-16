import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';
import { CTA } from '../CTA';
import { WhoIsFor } from '../WhoIsFor';
import { TrustBlock } from '../TrustBlock';
import { HeroIllustrationPlaceholder } from '../HeroIllustrationPlaceholder';
import { LandingSection } from '../LandingSection';
import { SectionNav } from '../SectionNav';

const HERO_IMAGE_SRC = '/hero-o-produto.png';

const BENEFICIOS = [
  {
    id: 'rotina-organizada',
    title: 'Rotina fiscal organizada',
    description:
      'Centralize SPED, ECD, PGDAS e balanços por cliente, com simulações e indicadores em um só lugar, sem depender de planilhas paralelas.',
  },
  {
    id: 'decisoes-seguras',
    title: 'Decisões mais seguras',
    description:
      'Simulações padronizadas e validações automáticas reduzem o risco de decisões baseadas apenas em feeling ou em contas manuais.',
  },
  {
    id: 'oportunidades-visiveis',
    title: 'Oportunidades visíveis na carteira',
    description:
      'Enxergue rapidamente editais, cenários tributários e ratings que podem virar novos projetos e honorários recorrentes.',
  },
] as const;

const MODULOS = [
  {
    id: 'scanner-pgfn',
    title: 'Scanner de Editais PGFN',
    description:
      'Encontre rapidamente oportunidades em editais do PGFN sem varrer diários e portais manualmente. O módulo cruza a base de clientes do seu escritório com publicações oficiais para apontar editais aderentes e apoiar decisões de adesão e recuperação com mais segurança.',
    barColor: 'bg-protec',
    imageSrc: '/modulo-scanner-pgfn.png',
    imageAlt: 'Tela do Scanner de Editais PGFN',
  },
  {
    id: 'simulador-in2306',
    title: 'Simulador IN 2.306',
    description:
      'Simule, em minutos, cenários 2025 x 2026 (IN 2.306) e Equiparação Hospitalar para clientes no Lucro Presumido. Planeje impacto tributário com ajuste anual e adicional de IRPJ sem depender de planilhas complexas e versões paralelas.',
    barColor: 'bg-brand',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Tela do Simulador IN 2.306',
  },
  {
    id: 'validador-rating',
    title: 'Validador de Rating CAPAG',
    description:
      'Valide o rating CAPAG com base nos dados do balanço e da DRE, de forma alinhada à Portaria 6.757/2022. Compare o rating estimado pelo escritório com o cálculo automatizado do sistema para reduzir risco de surpresas em operações com o setor público.',
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
      <section className="relative overflow-hidden w-full py-10 sm:py-12 lg:py-14 lg:min-h-[420px] bg-gradient-to-br from-[#0f172a] via-[#1A2E4C] to-[#1e3a5f]">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:gap-12 lg:items-center">
            <div className="mx-auto max-w-2xl text-center lg:max-w-none lg:text-left flex flex-col h-full">
              <div className="flex-1 flex flex-col lg:justify-center">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Veja na prática como o IATax organiza arquivos fiscais e simulações para o seu escritório
                </h1>
                <p className="mt-5 text-base text-slate-300 sm:text-lg leading-relaxed">
                  Página dedicada ao produto: três módulos pensados para escritórios que já têm os dados em mãos e querem transformar SPED, ECD, PGDAS e balanços em oportunidades concretas de recuperação e economia.
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
            <div className="relative mx-auto w-full max-w-[320px] sm:max-w-[360px] lg:max-w-[420px] order-first lg:order-none">
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

      {/* Navegação entre seções da página */}
      <SectionNav />

      <main className="flex-1 bg-white">
        {/* Vídeo demonstrativo com contexto */}
        <LandingSection
          id="video"
          eyebrow="Demonstração"
          title="Veja o fluxo completo em poucos minutos"
          subtitle="Da leitura dos arquivos fiscais às simulações e validação de riscos, em uma demonstração guiada que conecta os três módulos."
          tone="white"
        >
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-xl">
              <ul className="mt-1 space-y-2 text-sm text-slate-700">
                <li>• Como o scanner aponta editais aderentes à sua carteira.</li>
                <li>• Como comparar cenários 2025 x 2026 na prática, com a IN 2.306.</li>
                <li>• Como validar o rating CAPAG e reduzir surpresas em operações com o setor público.</li>
              </ul>
            </div>
            <div
              className="aspect-video w-full rounded-xl border border-slate-200/80 bg-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex flex-col items-center justify-center gap-3"
              aria-label="Em breve, vídeo demonstrativo do produto"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm">
                <svg className="ml-1 h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M8 5v14l11-7L8 5z" />
                </svg>
              </div>
              <p className="text-sm text-slate-600 text-center px-6">
                Em breve, você poderá assistir a um caso real de uso do IATax em vídeo. Enquanto isso, na demonstração guiada mostramos, em
                poucos minutos, como os três módulos funcionam na rotina do seu escritório.
              </p>
              <p className="text-xs text-slate-500 text-center px-8">
                Na demo, percorremos o scanner de editais, o simulador IN 2.306 e o validador de rating com exemplos de clientes reais —
                focado em organização, agilidade e segurança nas decisões.
              </p>
            </div>
          </div>
        </LandingSection>

        {/* Benefícios principais – mini seção inspirada nas Features */}
        <LandingSection
          id="beneficios"
          eyebrow="Benefícios"
          title="O que o IATax resolve na prática"
          subtitle="Mais do que um sistema, o IATax organiza a base fiscal do escritório e traduz os dados em oportunidades concretas de atuação consultiva, com foco em segurança e recorrência."
          tone="muted"
        >
          <div className="mt-2 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFICIOS.map((beneficio) => (
              <div
                key={beneficio.id}
                className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
              >
                <h3 className="text-base font-semibold text-slate-900">{beneficio.title}</h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{beneficio.description}</p>
              </div>
            ))}
          </div>
        </LandingSection>

        {/* Módulos com imagem e link */}
        <LandingSection
          id="modulos"
          eyebrow="Módulos"
          title="Três módulos, uma rotina integrada"
          subtitle="Cada módulo foi desenhado para resolver um ponto crítico da rotina: localizar oportunidades em editais, simular cenários tributários e validar riscos com base em normas vigentes."
          tone="white"
          className="border-y border-slate-200/70"
        >
          <div className="mt-2 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                  <p className="mt-4 text-slate-600 leading-[1.6] text-base">{mod.description}</p>
                  <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
                    {mod.id === 'scanner-pgfn' && (
                      <>
                        <li>• Reduza o tempo gasto monitorando editais.</li>
                        <li>• Evite perder oportunidades aderentes à carteira atual.</li>
                      </>
                    )}
                    {mod.id === 'simulador-in2306' && (
                      <>
                        <li>• Compare cenários com clareza para o cliente.</li>
                        <li>• Ganhe confiança para recomendar a melhor opção tributária.</li>
                      </>
                    )}
                    {mod.id === 'validador-rating' && (
                      <>
                        <li>• Antecipe o rating provável e reduza surpresas.</li>
                        <li>• Apoie decisões com base em cálculos padronizados.</li>
                      </>
                    )}
                  </ul>
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
        </LandingSection>

        <div id="para-quem-e" className="bg-slate-50 border-b border-slate-200/70">
          <WhoIsFor />
        </div>
        <div id="confianca">
          <TrustBlock />
        </div>

        <div id="proximo-passo">
          <CTA />
        </div>
      </main>
      <Footer />
    </div>
  );
}
