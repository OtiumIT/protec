const steps = [
  {
    step: 1,
    icon: '/icon-step-1.png',
    title: 'Cadastre seus clientes',
    description: 'Um cadastro por cliente, com CNPJ e contato no mesmo lugar.',
  },
  {
    step: 2,
    icon: '/icon-step-2.png',
    title: 'Organize arquivos fiscais por cliente e competência',
    description: 'SPED, ECD, PGDAS, XML e PDF organizados para achar rápido.',
  },
  {
    step: 3,
    icon: '/icon-step-3.png',
    title: 'Simule rating e cenários tributários quando precisar',
    description: 'Validador CAPAG (Portaria 6.757/2022) e Simulador IN 2.306/2026.',
  },
];

export function HowYouUse() {
  return (
    <section id="como-usar" className="py-16 sm:py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Como você usa no dia a dia
          </h2>
          <p className="mt-2 text-slate-600">
            Três passos para organizar a carteira e simular quando precisar.
          </p>
        </div>
        <ol className="mx-auto mt-12 max-w-2xl space-y-8 sm:mt-16">
          {steps.map((item) => (
            <li key={item.step} className="flex gap-4">
              <img
                src={item.icon}
                alt=""
                className="h-10 w-10 flex-shrink-0 object-contain"
                aria-hidden
              />
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
