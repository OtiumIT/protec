import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';
import { HeroIllustrationPlaceholder } from '../HeroIllustrationPlaceholder';

const HERO_ILLUSTRATION_SRC = '/hero-quem-somos.png';

function IconBuilding() {
  return (
    <svg className="h-12 w-12 text-landing-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function IconRocket() {
  return (
    <svg className="h-12 w-12 text-landing-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.8A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

export function QuemSomos() {
  const [showHeroPlaceholder, setShowHeroPlaceholder] = useState(false);
  const [protecOpen, setProtecOpen] = useState(false);
  const [otiumOpen, setOtiumOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <LandingHeader />
      {/* Hero full-width (igual à landing) */}
      <section className="relative overflow-hidden w-full py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-[#0f172a] via-[#1A2E4C] to-[#1e3a5f]">
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:gap-12 lg:items-center">
            <div className="mx-auto max-w-2xl text-center lg:max-w-none lg:text-left">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Nossa Jornada: Inteligência e Parceria
              </h1>
              <p className="mt-5 text-base text-slate-300 sm:text-lg leading-relaxed">
                Construindo o futuro da inteligência tributária para o seu escritório.
              </p>
            </div>
            <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[320px] lg:max-w-[380px] order-first lg:order-none">
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
          {/* Quem Somos Nós – bloco curto */}
          <section className="py-20 sm:py-28 bg-white">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-8 shadow-md">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Quem Somos Nós
                </h2>
                <p className="mt-6 text-lg text-slate-600 leading-relaxed">
                  O IATax é o sistema que nasce da <strong>junção</strong> da Protec e da Otium: expertise contábil e consultiva de um lado, tecnologia e produto do outro. Juntos, criamos novas oportunidades reais para nossos clientes.
                </p>
              </div>
            </div>
          </section>

          {/* Cartões Protec e Otium com ícones e credenciais */}
          <section className="py-20 sm:py-28 bg-slate-50 border-t border-slate-200">
            <div className="mx-auto max-w-5xl">
              <div className="grid gap-8 sm:grid-cols-2">
                <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-8 shadow-md hover:shadow-xl transition-shadow text-left">
                  <div className="flex flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 p-3">
                    <IconBuilding />
                  </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
                  <a href="https://protec.cnt.br/" target="_blank" rel="noopener noreferrer" className="text-landing-accent hover:text-landing-accent-hover underline underline-offset-2">
                    Protec – Contabilidade, Assessoria e Consultoria
                  </a>
                </h3>
                <p className="mt-4 text-slate-600 leading-relaxed text-base">
                  Mais de 30 anos em consultoria empresarial, com compromisso com o sucesso dos clientes. Especialistas em assessoria trabalhista, societária, tributária e contábil e atuação em demandas Bacen. Essa experiência definiu o que o IATax entrega: ferramentas que agilizam rating (CAPAG), simulação IN 2.306/2026 e oportunidades em editais PGFN.
                </p>
                <button
                  type="button"
                  onClick={() => setProtecOpen((o) => !o)}
                  className="mt-4 text-sm font-medium text-landing-accent hover:text-landing-accent-hover text-left"
                >
                  {protecOpen ? 'Ocultar detalhes' : 'Saiba mais'}
                </button>
                {protecOpen && (
                  <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 text-slate-600 text-sm leading-relaxed">
                    <p>
                      A Protec atua com o propósito de estar <strong>pronta para o amanhã mantendo os princípios de sempre</strong>. O ambiente corporativo é dinâmico e, muitas vezes, desafiador; por isso, a empresa busca soluções inovadoras e estratégicas para ajudar seus clientes a superarem obstáculos com segurança e inteligência fiscal.
                    </p>
                    <p>
                      Os serviços não se limitam a resolver problemas: <strong>transformam desafios em oportunidades</strong>, permitindo que as empresas se desenvolvam de forma sólida e sustentável no mercado.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-8 shadow-md hover:shadow-xl transition-shadow text-left">
                <div className="flex flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 p-3">
                  <IconRocket />
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
                  <a href="https://otiumit.com" target="_blank" rel="noopener noreferrer" className="text-landing-accent hover:text-landing-accent-hover underline underline-offset-2">
                    Otium – Parceiro de Tecnologia e Inovação
                  </a>
                </h3>
                <p className="mt-4 text-slate-600 leading-relaxed text-base">
                  Especialistas em desenvolvimento de software e inteligência artificial. Desenhamos e construímos o IATax: gestão por cliente e competência, módulos como Validador de Rating CAPAG, Simulador IN 2.306/2026 e Scanner de Editais PGFN. Soluções digitais intuitivas que amplificam a capacidade do consultor.
                </p>
                <button
                  type="button"
                  onClick={() => setOtiumOpen((o) => !o)}
                  className="mt-4 text-sm font-medium text-landing-accent hover:text-landing-accent-hover text-left"
                >
                  {otiumOpen ? 'Ocultar detalhes' : 'Saiba mais'}
                </button>
                {otiumOpen && (
                  <div className="mt-4 space-y-4 border-t border-slate-100 pt-4 text-slate-600 text-sm leading-relaxed">
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
        </section>

          {/* Bloco visual: junção Protec + Otium = IATax */}
          <section className="py-20 sm:py-28 bg-white border-t border-slate-200">
            <div className="mx-auto max-w-4xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl text-center">
                IATax: a junção de Protec e Otium
              </h2>
              <p className="mt-3 text-slate-600 text-center max-w-2xl mx-auto text-base">
                Quem faz o IATax — expertise e tecnologia em um único sistema.
              </p>
              <div className="mt-14 flex flex-col items-center gap-10">
                <div className="flex flex-col rounded-2xl border-2 border-landing-accent bg-white px-8 py-6 shadow-md text-center">
                  <span className="text-2xl font-bold text-slate-900">IATax</span>
                  <span className="mt-2 text-sm text-slate-600">Soluções Inteligentes</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 w-full max-w-2xl">
                  <a
                    href="https://protec.cnt.br/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md w-full sm:min-w-[200px] sm:max-w-[240px] text-center hover:shadow-xl transition-shadow"
                  >
                    <span className="text-xl font-bold text-slate-900">Protec</span>
                    <span className="mt-2 text-sm text-slate-600">Contabilidade, Assessoria e Consultoria</span>
                  </a>
                  <a
                    href="https://otiumit.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md w-full sm:min-w-[200px] sm:max-w-[240px] text-center hover:shadow-xl transition-shadow"
                  >
                    <span className="text-xl font-bold text-slate-900">Otium</span>
                    <span className="mt-2 text-sm text-slate-600">Parceiro de tecnologia</span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Prova social – quem confia / depoimentos */}
          <section className="py-20 sm:py-28 bg-slate-50 border-t border-slate-200">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  Quem já usa
                </h2>
                <p className="mt-3 text-slate-600 text-base">
                  Ferramenta pensada para o dia a dia de times fiscais e jurídicos.
                </p>
              </div>
              <div className="mx-auto mt-14 grid max-w-3xl gap-8 sm:grid-cols-2">
                <figure className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 text-left shadow-md">
                  <blockquote className="text-sm text-slate-700 leading-relaxed">
                    &ldquo;Conseguimos centralizar os arquivos fiscais por cliente e competência, o que reduziu muito o tempo gasto procurando SPED, ECD e PDFs em pastas soltas.&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 text-xs font-medium text-slate-500">
                    Coordenador Fiscal em escritório parceiro
                  </figcaption>
                </figure>
                <figure className="h-full rounded-2xl border border-slate-200/80 bg-white p-6 text-left shadow-md">
                  <blockquote className="text-sm text-slate-700 leading-relaxed">
                    &ldquo;A simulação de rating e cenários da IN 2.306/2026 virou apoio rápido para reuniões com clientes – sem depender só de planilhas.&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 text-xs font-medium text-slate-500">
                    Advogado tributário
                  </figcaption>
                </figure>
              </div>
            </div>
          </section>

          {/* Próximos passos */}
          <section className="py-20 sm:py-28 bg-white border-t border-slate-200">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Próximos passos
              </h2>
              <p className="mt-4 text-slate-600 max-w-xl mx-auto text-base">
                Faça parte dessa revolução. Conheça o IATax em detalhes ou converse com nossa equipe.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/o-produto"
                  className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg bg-landing-cta px-6 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors"
                >
                  Conhecer a plataforma
                </Link>
                <Link
                  to="/fale-conosco"
                  className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Fale com um consultor
                </Link>
              </div>
            </div>
          </section>
          </div>
        </main>
      <Footer />
    </div>
  );
}
