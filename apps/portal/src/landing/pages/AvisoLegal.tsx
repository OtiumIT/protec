import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';

export function AvisoLegal() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <LandingHeader />
      <main className="flex-1">
        <section className="py-16 sm:py-24 bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Aviso Legal
            </h1>
            <p className="mt-6 text-slate-600 leading-relaxed">
              Conteúdo em construção. Em breve esta página trará as informações legais aplicáveis ao uso do site e dos serviços IATax Soluções Inteligentes.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
