import { Link } from 'react-router-dom';
import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';
import { DashboardMockup } from '../DashboardMockup';
import { Features } from '../Features';
import { ProductPreview } from '../ProductPreview';
import { HowYouUse } from '../HowYouUse';
import { Differentials } from '../Differentials';
import { FAQ } from '../FAQ';

export function OProduto() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <LandingHeader />
      <main className="flex-1">
        <section className="py-14 sm:py-20 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-2 lg:gap-12 lg:items-center">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  O Produto
                </h1>
                <p className="mt-4 text-lg text-slate-600">
                  Soluções para organizar clientes, arquivos fiscais e simular rating e cenários tributários. Ferramenta de apoio à decisão para contadores e advogados.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    to="/fale-conosco"
                    className="inline-flex items-center justify-center rounded-lg bg-landing-cta px-6 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors"
                  >
                    Agendar demonstração
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Começar agora
                  </Link>
                </div>
              </div>
              <div className="relative rounded-[12px] border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden min-h-[240px] aspect-video max-h-[320px]">
                <DashboardMockup />
              </div>
            </div>
          </div>
        </section>
        <Features />
        <ProductPreview />
        <HowYouUse />
        <Differentials />
        <FAQ />
        <section className="py-14 sm:py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[12px] bg-gradient-to-br from-slate-50 to-white px-6 py-10 text-center sm:px-14 sm:py-14 border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Pronto para transformar?
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-slate-600 text-base">
                Agende uma demonstração gratuita ou comece agora. Estamos à disposição para tirar dúvidas sobre o produto.
              </p>
              <p className="mt-2 text-sm text-slate-500">
                Demonstração gratuita, sem compromisso. Dados protegidos em conformidade com a LGPD.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/fale-conosco"
                  className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg bg-landing-cta px-6 py-3 text-base font-semibold text-white hover:bg-orange-600 transition-colors"
                >
                  Agendar demonstração
                </Link>
                <Link
                  to="/register"
                  className="w-full sm:w-auto min-h-[48px] inline-flex items-center justify-center rounded-lg border-2 border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Começar agora
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
