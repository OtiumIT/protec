import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';
import { CTA } from '../CTA';
import { HeroIllustrationPlaceholder } from '../HeroIllustrationPlaceholder';

const HERO_ILLUSTRATION_SRC = '/hero-quem-somos.png';

function IconBuilding({ className = 'text-landing-accent' }: { className?: string }) {
  return (
    <svg className={`h-12 w-12 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconRocket({ className = 'text-landing-accent' }: { className?: string }) {
  return (
    <svg className={`h-12 w-12 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.8A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

const LOGO_PROTEC = '/logo-protec.png';
const LOGO_OTIUM = '/logo-otium.png';

export function QuemSomos() {
  const [showHeroPlaceholder, setShowHeroPlaceholder] = useState(false);
  const [protecOpen, setProtecOpen] = useState(false);
  const [otiumOpen, setOtiumOpen] = useState(false);
  const [protecLogoError, setProtecLogoError] = useState(false);
  const [otiumLogoError, setOtiumLogoError] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingHeader />
      {/* Hero full-width – alinhado em altura com os demais heros */}
      <section className="relative overflow-hidden w-full py-10 sm:py-12 lg:py-14 lg:min-h-[420px] bg-gradient-to-br from-[#0f172a] via-[#1A2E4C] to-[#1e3a5f]">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:gap-12 lg:items-center">
            <div className="mx-auto max-w-2xl text-center lg:max-w-none lg:text-left flex flex-col h-full">
              <div className="flex-1 flex flex-col lg:justify-center">
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                  Síntese entre Tradição e Inovação
                </h1>
                <p className="mt-5 text-base text-slate-300 sm:text-lg leading-relaxed">
                  O IATax nasce da união da expertise de 30 anos da Protec com a vanguarda digital da Otium, trazendo clareza e segurança tributária para o seu escritório.
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
            <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[300px] lg:max-w-[360px] order-first lg:order-none">
              <div className="relative aspect-square overflow-hidden">
                {showHeroPlaceholder ? (
                  <HeroIllustrationPlaceholder />
                ) : (
                  <img
                    src={HERO_ILLUSTRATION_SRC}
                    alt="Ilustração: inteligência tributária e parceria Protec e Otium"
                    className="h-full w-full object-contain object-center"
                    onError={() => setShowHeroPlaceholder(true)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Quem Somos Nós – unificado: transição limpa azul → branco, pouco espaço morto */}
          <section id="quem-somos-nos" className="bg-white pt-5 pb-12">
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl text-center mt-0 mb-1">
              Quem Somos Nós
            </h2>
            <p className="mt-3 mx-auto max-w-3xl text-lg text-slate-600 leading-relaxed text-center">
              O IATax é a síntese estratégica entre a tradição consultiva e a inovação tecnológica. Nascemos da <strong className="font-bold text-landing-navy">união</strong> entre a expertise de 30 anos da Protec e a vanguarda digital da Otium. Juntos, transformamos a complexidade tributária em oportunidades reais e seguras para nossos clientes.
            </p>
            <div className="mt-12 mx-auto max-w-5xl">
              <div className="grid gap-8 sm:grid-cols-2 items-stretch">
                {/* Card Protec */}
                <div className="flex flex-col h-full rounded-2xl border border-[#f0f0f0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow text-left">
                  <div className="h-3 w-full bg-protec shrink-0 rounded-t-2xl" aria-hidden />
                  <div className="flex flex-col flex-1 flex-grow bg-[#ffffff] p-8 pt-6">
                    <div className="min-h-[8.5rem] flex flex-col">
                    <div className="flex flex-shrink-0 items-center justify-center rounded-xl bg-protec p-3 min-h-12 min-w-12 w-fit">
                      {protecLogoError ? (
                        <IconBuilding className="text-white" />
                      ) : (
                        <img
                          src={LOGO_PROTEC}
                          alt="Logo Protec"
                          className="h-12 w-auto max-h-[48px] object-contain drop-shadow-sm"
                          onError={() => setProtecLogoError(true)}
                        />
                      )}
                    </div>
                    <h3 className="mt-5 text-xl font-bold tracking-wide text-protec-dark">
                      <a href="https://protec.cnt.br/" target="_blank" rel="noopener noreferrer" className="text-protec-dark hover:text-protec-dark/90 underline underline-offset-2">
                        Especialistas em Consultoria Tributária e Contábil
                      </a>
                    </h3>
                    </div>
                    <p className="mt-4 text-slate-600 leading-[1.6] text-base flex-1">
                      Mais de 30 anos em consultoria empresarial, com foco no sucesso dos clientes. Especialistas em assessoria trabalhista, societária, tributária e contábil e em demandas do Bacen. Essa experiência definiu o que o IATax entrega: análise da capacidade de pagamento (transação tributária), simulação do aumento da tributação do lucro presumido (LC 224/2025) e tributação da alta renda/dividendos (IRPFM - Lei 12.570/2025).
                    </p>
                    <div className="mt-auto pt-4">
                    <button
                      type="button"
                      onClick={() => setProtecOpen((o) => !o)}
                      className="inline-flex items-center rounded-lg border-2 border-protec bg-transparent px-4 py-2 text-sm font-medium text-protec transition-colors hover:bg-protec/10 text-left"
                    >
                      {protecOpen ? 'Ocultar detalhes' : 'Saiba mais'}
                    </button>
                    {protecOpen && (
                      <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 text-slate-600 text-sm leading-loose">
                        <p>
                          A Protec atua com o propósito de estar <strong>pronta para o amanhã mantendo os princípios de sempre</strong>. O ambiente corporativo é dinâmico e, muitas vezes, desafiador; por isso, a empresa busca soluções inovadoras e estratégicas para ajudar seus clientes a superarem obstáculos com segurança e inteligência fiscal.
                        </p>
                        <p>
                          Os serviços não se limitam a resolver problemas: <strong>transformam desafios em oportunidades</strong>, permitindo que as empresas se desenvolvam de forma sólida e sustentável no mercado.
                        </p>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
                {/* Card Otium */}
                <div className="flex flex-col h-full rounded-2xl border border-[#f0f0f0] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow text-left">
                  <div className="h-3 w-full bg-brand shrink-0 rounded-t-2xl" aria-hidden />
                  <div className="flex flex-col flex-1 flex-grow bg-[#ffffff] p-8 pt-6">
                <div className="min-h-[8.5rem] flex flex-col">
                  <div className="flex flex-shrink-0 items-center justify-center min-h-12 w-fit">
                    {otiumLogoError ? (
                      <IconRocket className="text-otium-dark" />
                    ) : (
                      <img
                        src={LOGO_OTIUM}
                        alt="Logo Otium"
                        className="h-12 w-auto max-h-[48px] object-contain drop-shadow-sm"
                        onError={() => setOtiumLogoError(true)}
                      />
                    )}
                  </div>
                  <h3 className="mt-6 text-xl font-bold tracking-wide text-slate-900">
                    <a href="https://otiumit.com" target="_blank" rel="noopener noreferrer" className="text-otium-dark hover:text-otium-black underline underline-offset-2">
                      Fábrica de Software e Inteligência Artificial
                    </a>
                  </h3>
                </div>
                <p className="mt-4 text-slate-600 leading-[1.6] text-base flex-1">
                  Especialistas em desenvolvimento de software e inteligência artificial. Desenhamos e construímos o IATax: gestão por cliente e por competência, módulos como Transação Tributária (análise da capacidade de pagamento), Simulação do aumento da tributação do lucro presumido (LC 224/2025) e Tributação da alta renda/dividendos (IRPFM - Lei 12.570/2025). Soluções digitais intuitivas que amplificam a capacidade do consultor.
                </p>
                <div className="mt-auto pt-4">
                <button
                  type="button"
                  onClick={() => setOtiumOpen((o) => !o)}
                  className="inline-flex items-center rounded-lg border-2 border-brand bg-transparent px-4 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand/10 text-left"
                >
                  {otiumOpen ? 'Ocultar detalhes' : 'Saiba mais'}
                </button>
                {otiumOpen && (
                  <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 text-slate-600 text-sm leading-loose">
                    <p>
                      A Otium é o parceiro responsável por transformar a visão do IATax em plataforma. A arquitetura foi pensada para escritórios de contabilidade e advocacia: integração com o fluxo de trabalho já adotado pelos profissionais. O resultado é uma ferramenta de apoio à decisão que não substitui o consultor, mas amplifica sua capacidade de encontrar valor na base de dados em segundos.
                    </p>
                    <p>
                      Essa junção entre Protec e Otium é o que faz do <strong>IATax Soluções Inteligentes</strong> o sistema que é hoje: expertise fiscal e contábil de um lado, tecnologia e produto do outro, em benefício de quem já tem os dados na mão e quer transformá-los em resultado.
                    </p>
                  </div>
                )}
                </div>
                </div>
              </div>
              </div>
            </div>

            <CTA />
          </section>
          </div>
        </main>
      <Footer />
    </div>
  );
}
