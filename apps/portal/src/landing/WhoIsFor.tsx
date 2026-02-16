const PERSONAS = [
  {
    id: 'tributario',
    title: 'Escritórios tributários',
    description:
      'Equipes focadas em planejamento e contencioso tributário que precisam transformar arquivos fiscais em diagnósticos rápidos, identificando oportunidades de recuperação e redução de riscos.',
    profile:
      'Normalmente já lidam com grandes volumes de dados, mas ainda dependem de planilhas e análises manuais para priorizar projetos.',
  },
  {
    id: 'contabeis-bpo',
    title: 'Escritórios contábeis e BPO',
    description:
      'Estruturas que cuidam do dia a dia fiscal e contábil dos clientes e querem ir além da conformidade, oferecendo análises e simulações como serviço recorrente.',
    profile:
      'Buscam padronizar processos e ganhar escala sem perder a visão por cliente, por competência e por tipo de oportunidade.',
  },
  {
    id: 'departamentos-internos',
    title: 'Departamentos internos de grandes empresas',
    description:
      'Times internos que já possuem todos os SPEDs, ECDs, PGDAS e balanços organizados, mas precisam de visão consolidada para apoiar decisões estratégicas.',
    profile:
      'Precisam responder rápido a diretoria, com simulações e validações alinhadas às normas vigentes, sem depender de múltiplas ferramentas.',
  },
] as const;

export function WhoIsFor() {
  return (
    <section className="py-10 sm:py-14 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Para quem é
          </h2>
          <p className="mt-3 text-slate-600">
            O IATax foi pensado para times que já lidam com dados fiscais todos os dias e querem sair do modo reativo para uma atuação
            consultiva, com visão clara da carteira e oportunidades priorizadas.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map((persona) => (
            <article
              key={persona.id}
              className="flex flex-col h-full rounded-2xl border border-[#f0f0f0] bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow text-left"
            >
              <h3 className="text-base font-semibold tracking-wide text-slate-900">{persona.title}</h3>
              <p className="mt-3 text-sm text-slate-700 leading-relaxed">{persona.description}</p>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">{persona.profile}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
