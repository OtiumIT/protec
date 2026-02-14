import { DashboardMockup } from './DashboardMockup';

export function ProductPreview() {
  return (
    <section className="py-12 sm:py-16 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[12px] border border-slate-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Em Ação
            </h2>
            <p className="mt-2 text-slate-600 text-base">
              Organize tudo em um único painel por cliente e competência.
            </p>
          </div>
          <div className="relative overflow-hidden min-h-[240px] aspect-video max-h-[320px] rounded-b-[12px]">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
