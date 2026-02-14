import { DashboardMockup } from './DashboardMockup';

export function ProductPreview() {
  return (
    <section className="py-16 sm:py-24 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Veja como fica organizado
          </h2>
          <p className="mt-2 text-slate-600">
            Organize tudo em um único painel por cliente e competência.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-4xl">
          <div className="relative rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden min-h-[240px] aspect-video max-h-[320px]">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
