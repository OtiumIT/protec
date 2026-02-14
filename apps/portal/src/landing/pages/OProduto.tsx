import { Link } from 'react-router-dom';
import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';
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
        <section className="py-16 sm:py-24 bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              O Produto
            </h1>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Soluções para organizar clientes, arquivos fiscais e simular rating e cenários tributários. Ferramenta de apoio à decisão para contadores e advogados.
            </p>
          </div>
        </section>
        <Features />
        <ProductPreview />
        <HowYouUse />
        <Differentials />
        <FAQ />
        <section className="py-16 sm:py-24 bg-white">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Solicitar demonstração
            </h2>
            <p className="mt-3 text-slate-600">
              Entre em contato para agendar uma demonstração ou tirar dúvidas sobre o produto.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                to="/fale-conosco"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md bg-landing-accent px-6 py-3 text-base font-semibold text-white hover:bg-landing-accent-hover transition-colors"
              >
                Fale conosco
              </Link>
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Começar agora
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
