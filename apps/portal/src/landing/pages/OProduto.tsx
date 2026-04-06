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
    title: 'Tudo no lugar, nada perdido',
    description:
      'SPED, ECD, PGDAS e balanços por cliente e competência em um só lugar. Simulações e indicadores integrados — sem planilhas paralelas e sem tempo perdido procurando arquivo.',
  },
  {
    id: 'decisoes-seguras',
    title: 'Decisões com fundamento, não no feeling',
    description:
      'Simulações padronizadas e validações automáticas reduzem risco e dão base técnica para suas recomendações. Menos contas manuais, mais segurança para você e para o cliente.',
  },
  {
    id: 'oportunidades-visiveis',
    title: 'Oportunidades que viram receita',
    description:
      'Enxergue na carteira editais elegíveis, cenários tributários e ratings revisáveis. Cada módulo aponta onde há espaço para novos projetos e honorários recorrentes.',
  },
] as const;

const MODULOS = [
  {
    id: 'transacao-tributaria',
    title: 'Validador de Rating (CAPAG) — Transação Tributária',
    description:
      'A Receita classifica seu cliente em A, B, C ou D — e essa classificação define descontos em transações. O IATax analisa Balanço e DRE, recalcula os indicadores (Liquidez Corrente, Liquidez Geral, Solvência) e gera relatório para revisão do enquadramento. Fundamentação com números, não com impressão.',
    barColor: 'bg-[#1e3a5f]',
    imageSrc: '/modulo-validador-rating.png',
    imageAlt: 'Validador de Rating - Análise da capacidade de pagamento',
    bullets: [
      'Revisão do enquadramento com dados contábeis analisados pelo sistema.',
      'Relatório pronto para fundamentar pedido de revisão à Receita.',
      'Simulação manual ou extração a partir do PDF da ECD.',
    ],
  },
  {
    id: 'simulador-in2306',
    title: 'Simulador IN 2.306 / LC 224/2025 — Lucro Presumido',
    description:
      'A LC 224/2025 e a IN 2.306/2026 mudam as regras do lucro presumido. Compare em poucos cliques: tributação antes e depois, cenário de equiparação hospitalar, adicional de IRPJ e ajuste anual. Identifique quanto sobe o imposto e onde há espaço para economia — com memória de cálculo para o cliente.',
    barColor: 'bg-brand',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Simulador IN 2.306 - Impacto no lucro presumido',
    bullets: [
      'Compare cenários 2025 x 2026 x equiparação hospitalar.',
      'Identifique o aumento tributário e oportunidades de economia.',
      'Receitas por trimestre (produtos, serviços, hospitalar, demais) e memória de cálculo.',
    ],
  },
  {
    id: 'irpf-alta-renda',
    title: 'IRPF Alta Renda — Lei 15.270/2025',
    description:
      'Dividendos e alta renda passam a ser tributados. O IATax importa a declaração (PDF da DAA ou arquivo .dec), calcula a base e a alíquota e simula cenários de redução: holding, segregação com cônjuge/filhos, otimização isento vs. tributado. Resultado claro para o cliente e recomendações objetivas.',
    barColor: 'bg-protec',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Simulador IRPF Alta Renda',
    bullets: [
      'Importe DAA (PDF) ou arquivo da declaração (.dec/.dbk).',
      'Compare cenários antes e depois da nova legislação.',
      'Soluções para redução: holding, segregação de renda, memória legal.',
    ],
  },
  {
    id: 'gestao-imoveis',
    title: 'Gestão Imobiliária — Simule PF, PJ e Reforma 2027',
    description:
      'Cadastre imóveis por cliente, lance receitas e despesas (dedutíveis e operacionais) e simule a carga tributária em três cenários: Pessoa Física (Carnê-Leão), PJ (Lucro Presumido/Holding) e pós-Reforma (IBS/CBS com redutor para locação). Ideal para consultoria patrimonial e planejamento de investimentos em imóveis.',
    barColor: 'bg-[#0f766e]',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Simulador Imobiliário - Cenários tributários',
    bullets: [
      'Cenários PF, PJ e Reforma 2027 com redutor para locação.',
      'Break-even e fluxo de caixa; modo detalhado ou reduzido.',
      'Locação fixa e flexível (Airbnb); custos operacionais para créditos Reforma.',
    ],
  },
  {
    id: 'arquivos-fiscais',
    title: 'Arquivos Fiscais — Base organizada por cliente',
    description:
      'Upload seguro de SPED, ECD, PGDAS, XML e PDF por cliente e competência. Centralize a base do escritório e alimente simulações e validações sem perder tempo procurando arquivos. A organização que todo módulo de análise precisa.',
    barColor: 'bg-[#1e3a5f]',
    imageSrc: '/modulo-validador-rating.png',
    imageAlt: 'Arquivos Fiscais - Organização por cliente e competência',
    bullets: [
      'Upload por cliente e competência; tipos: SPED, ECD, PGDAS, XML, PDF.',
      'Base organizada para todos os módulos (rating, IN 2306, IRPF, etc.).',
      'Status de processamento e dados prontos para extração e simulação.',
    ],
  },
  {
    id: 'processos-judiciais',
    title: 'Processos Judiciais e Editais de Contencioso',
    description:
      'Cadastre processos judiciais por cliente e tese (IPI Praça, PRL, IRPJ/CSLL desmutualização). O sistema verifica elegibilidade para editais (52, 53, 54/2025) e integra com o validador de rating na modalidade contencioso — para não perder oportunidade de desconto com fundamento em processo ativo.',
    barColor: 'bg-brand',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Processos Judiciais - Editais de contencioso',
    bullets: [
      'Teses elegíveis: IPI Praça, PRL, IRPJ/CSLL desmutualização.',
      'Integração com validação de rating (modalidade contencioso).',
      'Gestão de processos ativos por cliente para editais PGFN.',
    ],
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
                  Inteligência tributária que gera resultado: simule, valide e recupere com os dados que você já tem
                </h1>
                <p className="mt-5 text-base text-slate-300 sm:text-lg leading-relaxed">
                  Seis módulos integrados para escritórios que querem transformar SPED, ECD, PGDAS e balanços em oportunidades concretas: revisão de rating, impacto da LC 224/2025, tributação da alta renda, simulação imobiliária, arquivos organizados e elegibilidade a editais. Menos planilha, mais consultoria.
                </p>
              </div>
              <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start lg:mt-auto lg:mb-1">
                <Link
                  to="/login"
                  className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg bg-landing-cta px-6 py-3 text-base font-semibold text-white shadow-lg hover:bg-orange-600 hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-landing-cta focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                >
                  Entrar no sistema
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
          subtitle="Da organização dos arquivos fiscais às simulações e validação de rating, em uma demonstração guiada que mostra como cada módulo gera valor na rotina do escritório."
          tone="white"
        >
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-xl">
              <ul className="mt-1 space-y-2 text-sm text-slate-700">
                <li>• Revisão da capacidade de pagamento (rating) com dados contábeis e relatório para fundamentação.</li>
                <li>• Comparativo do lucro presumido antes e depois da LC 224/2025 e IN 2.306/2026.</li>
                <li>• Simulação da tributação da alta renda (Lei 15.270/2025) e cenários de redução.</li>
                <li>• Gestão imobiliária, arquivos fiscais centralizados e elegibilidade a editais de contencioso.</li>
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
                Na demo, percorremos a análise da capacidade de pagamento, a simulação LC 224/2025 e a tributação da alta renda com exemplos de clientes reais —
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
          subtitle="Organize a base fiscal, reduza risco nas decisões e transforme dados em oportunidades de consultoria e honorários recorrentes — com simulações e relatórios que o cliente entende e a Receita respeita."
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
          title="Seis módulos, uma rotina integrada"
          subtitle="Cada ferramenta foi pensada para um ponto crítico da sua consultoria: validar rating com fundamentação, comparar impacto da reforma do lucro presumido, simular alta renda e imóveis, organizar arquivos e qualificar clientes para editais. Tudo com dados que você já tem."
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
                    {mod.bullets.map((bullet, i) => (
                      <li key={i}>• {bullet}</li>
                    ))}
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
