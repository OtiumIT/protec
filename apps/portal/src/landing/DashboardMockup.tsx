/**
 * Mockup visual do painel – sempre visível, sem depender de imagens.
 * Usa cores do tema neutro da landing (landing-accent).
 */
export function DashboardMockup() {
  const accent = 'bg-landing-accent/20';
  const accent2 = 'bg-landing-accent/40';
  const accent3 = 'bg-landing-accent/30';

  return (
    <div className="flex h-full w-full bg-white text-left">
      {/* Sidebar mínima */}
      <div className="flex w-12 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50 py-2">
        <div className={`mx-auto mb-2 h-8 w-8 rounded ${accent}`} title="Logo" />
        <div className="my-1 mx-auto h-1 w-6 rounded-full bg-slate-300" />
        <div className={`my-1 mx-auto h-1 w-6 rounded-full ${accent2}`} />
        <div className="my-1 mx-auto h-1 w-6 rounded-full bg-slate-300" />
        <div className="my-1 mx-auto h-1 w-6 rounded-full bg-slate-300" />
      </div>
      {/* Conteúdo principal */}
      <div className="min-w-0 flex-1 p-3">
        <div className="mb-2 h-4 w-32 rounded bg-slate-200" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50/50 p-2">
              <div className="h-8 w-8 flex-shrink-0 rounded bg-slate-200" />
              <div className="min-w-0 flex-1">
                <div className="h-2 w-24 rounded bg-slate-300" />
                <div className="mt-1 h-1.5 w-16 rounded bg-slate-200" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <div className={`h-6 w-16 rounded ${accent3}`} />
          <div className="h-6 w-14 rounded bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
