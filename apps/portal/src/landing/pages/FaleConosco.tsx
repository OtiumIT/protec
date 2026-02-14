import { useState } from 'react';
import { LandingHeader } from '../LandingHeader';
import { Footer } from '../Footer';

const CONTACT = {
  phone: '(43) 3374-6160',
  email: 'contato@iatax.com.br',
  address: 'Rua Brasil, 862 - 1º Andar, Londrina',
  whatsappUrl: 'https://wa.me/554333746160',
} as const;

function LockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function PhoneIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function MailIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

export function FaleConosco() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent('Contato - IATax');
    const body = encodeURIComponent(`Nome: ${nome}\nE-mail: ${email}\n\nMensagem:\n${mensagem}`);
    window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
    setNome('');
    setEmail('');
    setMensagem('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <LandingHeader />
      <main className="flex-1">
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Fale Conosco
            </h1>
            <p className="mt-2 text-slate-600">
              Preencha o formulário ou use um dos canais abaixo.
            </p>
            <div className="mt-10 grid gap-8 lg:grid-cols-[3fr_2fr] lg:gap-12 lg:items-start">
              {/* Coluna esquerda: Formulário (60%) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] sm:p-8">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="nome" className="block text-sm font-medium text-slate-700">
                      Nome
                    </label>
                    <input
                      id="nome"
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 shadow-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                      E-mail
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 shadow-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="mensagem" className="block text-sm font-medium text-slate-700">
                      Mensagem
                    </label>
                    <textarea
                      id="mensagem"
                      rows={4}
                      required
                      value={mensagem}
                      onChange={(e) => setMensagem(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 shadow-sm focus:border-[#FF6B00] focus:outline-none focus:ring-1 focus:ring-[#FF6B00]"
                      placeholder="Como podemos ajudar?"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full min-h-[48px] inline-flex items-center justify-center rounded-lg bg-[#FF6B00] px-6 py-3 text-base font-semibold text-white hover:bg-[#e55f00] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FF6B00] focus:ring-offset-2"
                    >
                      Enviar mensagem
                    </button>
                    <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
                      <LockIcon className="h-4 w-4 flex-shrink-0" />
                      <span>Seus dados protegidos em conformidade com a LGPD</span>
                    </div>
                  </div>
                </form>
                {submitted && (
                  <p className="mt-4 text-sm text-green-600 font-medium">
                    O seu cliente de e-mail será aberto. Envie a mensagem para finalizar o contato.
                  </p>
                )}
              </div>

              {/* Coluna direita: Canais de contato */}
              <div className="space-y-6">
                <a
                  href={`tel:${CONTACT.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-3 text-slate-700 hover:text-[#FF6B00] transition-colors"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <PhoneIcon />
                  </span>
                  <div>
                    <p className="font-medium">Telefone</p>
                    <p className="text-slate-600">{CONTACT.phone}</p>
                  </div>
                </a>
                <a
                  href={`mailto:${CONTACT.email}`}
                  className="flex items-center gap-3 text-slate-700 hover:text-[#FF6B00] transition-colors break-all"
                >
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <MailIcon />
                  </span>
                  <div>
                    <p className="font-medium">E-mail</p>
                    <p className="text-slate-600">{CONTACT.email}</p>
                  </div>
                </a>
                <a
                  href={CONTACT.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-3 font-semibold text-white shadow-md hover:bg-[#20BD5A] transition-colors"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Conversar no WhatsApp
                </a>
                <div className="flex items-start gap-3 text-slate-600">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-medium text-slate-700">Endereço</p>
                    <p className="text-sm text-slate-500">{CONTACT.address}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
