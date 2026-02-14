const faqs = [
  {
    question: 'Preciso instalar algo para usar o sistema?',
    answer:
      'Não. O sistema é SaaS e roda diretamente no navegador. Basta ter acesso à internet para entrar com seu usuário e senha.',
  },
  {
    question: 'Quais arquivos posso subir hoje?',
    answer:
      'Você pode armazenar e organizar arquivos SPED, ECD, PGDAS, XML e PDFs vinculados a cada cliente e competência. Hoje o foco é upload, organização, listagem e download seguro – sem processamento automático do conteúdo.',
  },
  {
    question: 'Meus dados e os dados dos clientes ficam seguros?',
    answer:
      'Cada empresa tem seus dados isolados por tenant (company_id), com controle de acesso por usuário. O objetivo é evitar que um escritório veja dados de outro e garantir rastreabilidade das ações.',
  },
  {
    question: 'Posso começar com poucos clientes primeiro?',
    answer:
      'Sim. Você pode cadastrar apenas alguns clientes e ir ampliando a carteira conforme se acostuma com o fluxo de trabalho no sistema.',
  },
];

export function FAQ() {
  return (
    <section className="py-16 sm:py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Perguntas frequentes
          </h2>
          <p className="mt-2 text-slate-600">
            Respostas rápidas para as dúvidas mais comuns antes de começar.
          </p>
        </div>
        <dl className="mx-auto mt-10 max-w-3xl space-y-6">
          {faqs.map((item) => (
            <div
              key={item.question}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <dt className="text-sm font-semibold text-slate-900">{item.question}</dt>
              <dd className="mt-2 text-sm text-slate-600 leading-relaxed">{item.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

