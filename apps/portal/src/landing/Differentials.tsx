export function Differentials() {
  return (
    <section id="diferenciais" className="py-16 sm:py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Por que usar
          </h2>
          <p className="mt-2 text-slate-600">
            Foco em eficiência operacional e nos dados que o seu escritório já possui.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl">
          <ul className="space-y-4 text-slate-700">
            <li className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-lg">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand text-sm font-semibold">1</span>
              <span><strong>Organização por cliente e competência:</strong> como você já trabalha. Clientes, arquivos fiscais e simulações em um só lugar, com isolamento por empresa.</span>
            </li>
            <li className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-lg">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand text-sm font-semibold">2</span>
              <span><strong>Cálculos alinhados à norma:</strong> indicadores CAPAG conforme Portaria 6.757/2022 e cenários da IN 2.306/2026. Rating e cenários tributários para apoio à decisão.</span>
            </li>
            <li className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-lg">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand/20 text-brand text-sm font-semibold">3</span>
              <span><strong>Segurança e controle:</strong> dados isolados por empresa, gestão de usuários e módulos ativados conforme o plano.</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
