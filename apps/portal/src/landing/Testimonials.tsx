const testimonials = [
  {
    id: 1,
    name: 'Coordenador Fiscal em escritório parceiro',
    quote:
      'Conseguimos centralizar os arquivos fiscais por cliente e competência, o que reduziu muito o tempo gasto procurando SPED, ECD e PDFs em pastas soltas.',
  },
  {
    id: 2,
    name: 'Advogado tributário',
    quote:
      'A simulação de cenários tributários (capacidade de pagamento, LC 224/2025 e alta renda) virou apoio rápido para reuniões com clientes – sem depender só de planilhas.',
  },
];

export function Testimonials() {
  return (
    <section className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Quem já usa este tipo de abordagem
          </h2>
          <p className="mt-2 text-slate-600">
            Ferramenta pensada para o dia a dia de times fiscais e jurídicos.
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-3xl gap-6 sm:grid-cols-2">
          {testimonials.map((item) => (
            <figure
              key={item.id}
              className="h-full rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-left shadow-sm"
            >
              <blockquote className="text-sm text-slate-700 leading-relaxed">
                “{item.quote}”
              </blockquote>
              <figcaption className="mt-4 text-xs font-medium text-slate-500">
                {item.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

