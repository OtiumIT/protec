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
    title: 'Número para a reunião',
    description:
      'Locação PF×PJ, LC 224, regime da empresa, ITBI e ITCMD no mesmo cliente. Sem planilha paralela: o aluno chega na reunião com imposto, base e memória.',
  },
  {
    id: 'decisoes-seguras',
    title: 'Decisões com fundamento, não no feeling',
    description:
      'Simulações padronizadas e memória de cálculo para holding, doação e a empresa do cliente. Você estrutura o instrumento; o IATax entrega o número.',
  },
  {
    id: 'oportunidades-visiveis',
    title: 'Um PDF com a sua marca',
    description:
      'Relatório único white-label junta as simulações salvas e o parágrafo de recomendação. Pronto para enviar ao cliente depois da reunião.',
  },
] as const;

const MODULOS = [
  {
    id: 'gestao-imoveis',
    title: 'Imóveis — locação PF × PJ × Reforma',
    description:
      'Cadastre imóveis por cliente e compare a carga na pessoa física, na holding e após a Reforma. Número para a reunião de patrimônio — sem ERP, boleto ou minuta.',
    barColor: 'bg-[#0f766e]',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Simulador imobiliário — cenários tributários',
    bullets: [
      'Cenários PF, PJ e Reforma 2027 com redutor para locação.',
      'Ganho de capital na venda, no mesmo cliente.',
      'Importação de imóveis a partir da DIRPF.',
    ],
  },
  {
    id: 'simulador-in2306',
    title: 'LC 224/2025 — Lucro Presumido',
    description:
      'A LC 224/2025 e a IN 2.306/2026 mudam o presumido. Compare antes e depois, adicional de IRPJ e ajuste anual — com memória de cálculo para o cliente da empresa.',
    barColor: 'bg-brand',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Simulador IN 2.306 — impacto no lucro presumido',
    bullets: [
      'Compare cenários 2025 × 2026 × equiparação hospitalar.',
      'Identifique o aumento tributário e espaço de economia.',
      'Receitas por trimestre e memória de cálculo.',
    ],
  },
  {
    id: 'irpf-alta-renda',
    title: 'IRPF Alta Renda — Lei 15.270/2025',
    description:
      'Dividendos e alta renda. Importe a declaração, calcule a base e simule holding ou segregação. Resultado claro para o sócio e para o escritório.',
    barColor: 'bg-protec',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Simulador IRPF Alta Renda',
    bullets: [
      'Importe DAA (PDF) ou arquivo da declaração (.dec/.dbk).',
      'Compare cenários antes e depois da nova legislação.',
      'Holding e segregação de renda com memória legal.',
    ],
  },
  {
    id: 'comparativo-regimes',
    title: 'Comparativo LP × LR × Simples',
    description:
      'O regime da empresa do cliente: lucro presumido, real e Simples no mesmo quadro. Serve o advogado e o contador que cuida da PJ operacional.',
    barColor: 'bg-[#1e3a5f]',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Comparativo de regimes tributários',
    bullets: [
      'Carga estimada por regime no mesmo faturamento.',
      'Memória para a reunião de planejamento da empresa.',
      'Entra no relatório único do projeto.',
    ],
  },
  {
    id: 'itbi-itcmd',
    title: 'ITBI na integralização e ITCMD na doação',
    description:
      'Tema 796 na holding patrimonial, alíquota informada, usufruto por idade e tabelas de oito estados. Número para a reunião de sucessão — sem guia nem jurisprudência municipal.',
    barColor: 'bg-[#0f766e]',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'ITBI e ITCMD',
    bullets: [
      'ITBI: incidência, imunidade total ou parcial (Tema 796).',
      'ITCMD: SP, RJ, MG, RS, PR, SC, GO, DF; demais UFs com alíquota manual.',
      'PDF white-label com aviso de simulação.',
    ],
  },
  {
    id: 'relatorio-projeto',
    title: 'Relatório único do projeto',
    description:
      'Escolha o cliente, marque as simulações já salvas e escreva a recomendação. Um PDF com a logo do escritório — capa, memória resumida e aviso legal.',
    barColor: 'bg-brand',
    imageSrc: '/modulo-simulador-in2306.png',
    imageAlt: 'Relatório do projeto',
    bullets: [
      'Locação, ganho de capital, ITBI, ITCMD, IRPF, LC 224 e regime.',
      'Parágrafo de recomendação editável.',
      'Não recalcula o que não foi salvo.',
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
                  Ferramentas para advogados e contadores: imóveis, LC 224, IRPF, regime da PJ, ITBI, ITCMD e um PDF com a marca do escritório. Número para a reunião — você estrutura o instrumento.
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
          subtitle="Da locação e da LC 224 ao ITBI, ITCMD e ao PDF do projeto — uma demonstração guiada da reunião de patrimônio e da empresa do cliente."
          tone="white"
        >
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-xl">
              <ul className="mt-1 space-y-2 text-sm text-slate-700">
                <li>• Locação PF × PJ × Reforma e ganho de capital no mesmo cliente.</li>
                <li>• Comparativo do lucro presumido (LC 224/2025) e do regime LP × LR × Simples.</li>
                <li>• IRPF alta renda, ITBI na integralização (Tema 796) e ITCMD na doação.</li>
                <li>• Relatório único white-label com as simulações salvas.</li>
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
                Na demo, percorremos locação, LC 224, regime, ITBI e ITCMD com exemplos de clientes reais —
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
          title="Ferramentas da reunião, um só cliente"
          subtitle="Patrimônio e sucessão de um lado; empresa do cliente do outro. Locação, LC 224, regime, IRPF, ITBI, ITCMD e o PDF do projeto — sem CAPAG, SPED no menu nem processos judiciais neste lançamento."
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
