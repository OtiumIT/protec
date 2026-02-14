import { Link } from 'react-router-dom';

const beneficios = [
  'Dados limpos = vantagem: aproveite a base que você já tem.',
  'Entrega rápida: módulos em semanas, não em meses.',
  'Organização por cliente e competência: como você já trabalha.',
  'Risco zero de inventário: comece com cliente real e escale quando quiser.',
];

export function Differentials() {
  return (
    <section id="diferenciais" className="py-16 sm:py-24 bg-white border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
          {/* Coluna esquerda: Por Que Escolher */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Por Que Escolher
            </h2>
            <ul className="mt-6 space-y-3">
              {beneficios.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600"
                    aria-hidden
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-slate-600">{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/fale-conosco"
                className="inline-flex items-center justify-center rounded-md bg-landing-cta px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                Agendar demonstração
              </Link>
              <Link
                to="/fale-conosco"
                className="inline-flex items-center justify-center rounded-md border-2 border-slate-300 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Falar com especialista
              </Link>
            </div>
            <p className="mt-4">
              <Link to="/quem-somos" className="text-sm font-medium text-landing-accent hover:text-landing-accent-hover transition-colors">
                Nosso case
              </Link>
            </p>
          </div>

          {/* Coluna direita: Credibilidade e Parceria */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Credibilidade e Parceria
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Desenvolvido em parceria com escritórios de contabilidade e advocacia e com base em regras fiscais e editais vigentes. O sistema foi pensado para quem já atende empresas e precisa de visão consolidada e cálculos alinhados às normas, sem depender apenas de planilhas dispersas.
            </p>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Ferramenta de apoio à decisão: não substitui consultoria jurídica ou contábil, mas agiliza o trabalho de quem precisa encontrar oportunidades e simular cenários em minutos.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
