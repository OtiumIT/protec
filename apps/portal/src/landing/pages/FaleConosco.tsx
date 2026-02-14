import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';

const CONTACT = {
  phone: '(43) 3374-6160',
  email: 'contato@iatax.com.br',
  address: 'Rua Brasil, 862 - 1º Andar, Londrina',
  faleConoscoUrl: '#',
} as const;

export function FaleConosco() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <LandingHeader />
      <main className="flex-1">
        <section className="py-16 sm:py-24 bg-white">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Fale Conosco
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Entre em contato com a equipe. Estamos à disposição para tirar dúvidas sobre o produto e agendar demonstrações.
            </p>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
                <h3 className="text-sm font-semibold text-slate-900">Telefone</h3>
                <a
                  href={`tel:${CONTACT.phone.replace(/\D/g, '')}`}
                  className="mt-2 block text-slate-600 hover:text-landing-accent transition-colors"
                >
                  {CONTACT.phone}
                </a>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
                <h3 className="text-sm font-semibold text-slate-900">E-mail</h3>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="mt-2 block text-slate-600 hover:text-landing-accent transition-colors break-all"
                >
                  {CONTACT.email}
                </a>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6">
                <h3 className="text-sm font-semibold text-slate-900">Endereço</h3>
                <p className="mt-2 text-slate-600">{CONTACT.address}</p>
              </div>
            </div>
            <div className="mt-12">
              <a
                href={`mailto:${CONTACT.email}`}
                className="inline-flex items-center justify-center rounded-md bg-landing-accent px-6 py-3 text-base font-semibold text-white hover:bg-landing-accent-hover transition-colors"
              >
                Enviar e-mail
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
