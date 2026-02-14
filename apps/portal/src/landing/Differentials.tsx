import { Link } from 'react-router-dom';
import { WhoMakesIATax } from './WhoMakesIATax';

const vantagens = [
  {
    title: 'Dados limpos',
    description: 'Aproveite a base que você já tem.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  {
    title: 'Entrega rápida',
    description: 'Módulos em semanas, não meses.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Organização',
    description: 'Por cliente e competência, como você já trabalha.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Risco zero',
    description: 'Comece com cliente real e escale quando quiser.',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

export function Differentials({ showPartners = true }: { showPartners?: boolean }) {
  return (
    <section id="diferenciais" className="py-12 sm:py-16 bg-slate-50 border-t border-slate-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="sr-only">Pilares de Confiança</h2>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 lg:items-stretch">
          {/* Coluna esquerda: Por Que Escolher (Vantagens) – mini-cards */}
          <div className="rounded-[12px] border border-slate-200/80 bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Por Que Escolher
            </h3>
            <p className="mt-1 text-slate-600 text-sm font-medium">Vantagens</p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {vantagens.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4"
                >
                  <span
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600"
                    aria-hidden
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/fale-conosco"
                className="min-h-[44px] inline-flex items-center justify-center rounded-lg bg-landing-cta px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                Agendar demonstração
              </Link>
              <Link
                to="/fale-conosco"
                className="min-h-[44px] inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:border-slate-400 transition-colors"
              >
                Falar com especialista
              </Link>
            </div>
          </div>

          {/* Coluna direita: Expertise Comprovada + Selo LGPD */}
          <div className="rounded-[12px] border border-slate-200/80 bg-white p-8 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col">
            <div className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-white"
                aria-hidden
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </span>
              <span className="font-bold text-slate-900">Expertise Comprovada</span>
            </div>
            <div className="mt-6 flex-1 space-y-4 text-slate-600 leading-relaxed text-base">
              <p>
                O IATax não é apenas um software, é o resultado de uma <strong className="text-slate-800">aliança estratégica</strong> entre tecnologia de ponta e o conhecimento de especialistas com <strong className="text-slate-800">mais de 30 anos de atuação sólida</strong> nos mercados contábil e consultivo.
              </p>
              <p>
                Nossa inteligência algorítmica foi construída sob uma base rigorosa de <strong className="text-slate-800">regras fiscais, tributárias e editais vigentes</strong>, garantindo que cada oportunidade de recuperação identificada tenha <strong className="text-slate-800">respaldo normativo total</strong>. <strong className="text-slate-800">Diferente de soluções genéricas</strong>, entregamos uma ferramenta desenhada por <strong className="text-slate-800">quem entende as dores e a complexidade do dia a dia dos grandes escritórios</strong>.
              </p>
            </div>
            {/* Selo de Garantia / Segurança LGPD */}
            <div className="mt-8 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <span
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600"
                aria-hidden
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <div>
                <p className="font-semibold text-slate-900">Segurança LGPD</p>
                <p className="text-sm text-slate-600">Seus dados protegidos conforme a lei.</p>
              </div>
            </div>
          </div>
        </div>
        {showPartners && <WhoMakesIATax />}
      </div>
    </section>
  );
}
