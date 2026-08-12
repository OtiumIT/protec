import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { getApiUrl } from '../../../shared/services/api';

// Property share data (existing endpoint)
interface PropertyShareData {
  simulation: {
    id: string;
    ano: number;
    input_data: Record<string, unknown>;
    result_data: Record<string, unknown>;
    title: string | null;
    created_at: string;
  };
  share: { title: string | null; simulation_kind: string };
  branding: { report_brand_name: string | null; report_logo_url?: string | null };
}

// Generic share data (new endpoint)
interface GenericShareData {
  simulation_type: string;
  snapshot: Record<string, unknown>;
  title: string | null;
  branding: { report_brand_name: string | null; report_logo_url: string | null };
}

function formatMoney(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtPct(v: number): string {
  return `${v.toFixed(2)}%`;
}

type NormalizedData = {
  simulationType: string;
  title: string;
  ano: number | null;
  snapshot: Record<string, unknown>;
  createdAt: string | null;
  brandName: string;
  brandLogo: string | null;
};

function normalizePropertyData(d: PropertyShareData): NormalizedData {
  return {
    simulationType: d.share.simulation_kind ?? 'locacao_pf_pj',
    title: d.share.title || d.simulation.title || 'Simulação Tributária',
    ano: d.simulation.ano,
    snapshot: d.simulation.result_data,
    createdAt: d.simulation.created_at,
    brandName: d.branding?.report_brand_name || 'IATax Soluções Inteligentes',
    brandLogo: (d.branding as any)?.report_logo_url ?? null,
  };
}

function normalizeGenericData(d: GenericShareData): NormalizedData {
  const snap = d.snapshot ?? {};
  return {
    simulationType: d.simulation_type,
    title: d.title || (snap as any).title || 'Simulação Tributária',
    ano: (snap as any).ano ?? null,
    snapshot: snap,
    createdAt: (snap as any).created_at ?? null,
    brandName: d.branding?.report_brand_name || 'IATax Soluções Inteligentes',
    brandLogo: d.branding?.report_logo_url ?? null,
  };
}

// ---- Renderers by simulation type ----

function LocacaoResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const result = (snapshot.result_data ?? snapshot) as Record<string, unknown>;
  const cenarios = result.cenarios as Record<string, { imposto_total?: number; aliquota_efetiva?: number; aliquota_efetiva_anual?: number; dividendos?: { irrf_total?: number; lucro_liquido_socio?: number } }> | undefined;
  if (!cenarios) return <p className="text-sm text-slate-500">Sem dados de cenários.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cenarios.pf && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-1">Pessoa Física</h3>
          <p className="text-2xl font-bold text-slate-800">{formatMoney(cenarios.pf.imposto_total ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">Alíquota efetiva: {fmtPct(cenarios.pf.aliquota_efetiva_anual ?? cenarios.pf.aliquota_efetiva ?? 0)}</p>
        </Card>
      )}
      {cenarios.pj && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-1">Pessoa Jurídica (LP)</h3>
          <p className="text-2xl font-bold text-slate-800">{formatMoney(cenarios.pj.imposto_total ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">Alíquota efetiva: {fmtPct(cenarios.pj.aliquota_efetiva ?? 0)}</p>
          {cenarios.pj.dividendos && (cenarios.pj.dividendos.irrf_total ?? 0) > 0 && (
            <p className="text-xs text-violet-600 mt-1">IRRF dividendos: {formatMoney(cenarios.pj.dividendos.irrf_total ?? 0)}</p>
          )}
        </Card>
      )}
      {(cenarios.reforma_2027_pf || cenarios.reforma_2027) && (() => {
        const ref = (cenarios.reforma_2027_pf || cenarios.reforma_2027) as any;
        return (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Reforma IBS/CBS</h3>
            <p className="text-2xl font-bold text-slate-800">{formatMoney(ref.imposto_total ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Alíquota efetiva: {fmtPct(ref.aliquota_efetiva ?? 0)}</p>
          </Card>
        );
      })()}
    </div>
  );
}

function IN2306Result({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = (snapshot.result_data ?? snapshot) as Record<string, any>;
  const isTributario = rd && 'cenario_2025' in rd;
  if (isTributario) {
    const c25 = rd.cenario_2025 as Record<string, any> | undefined;
    const c26 = rd.cenario_2026 as Record<string, any> | undefined;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {c25 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Cenário 2025</h3>
            <p className="text-lg font-bold text-slate-800">{formatMoney(c25.total_impostos ?? 0)}</p>
            <p className="text-xs text-slate-500">Regime: {c25.regime ?? '-'}</p>
          </Card>
        )}
        {c26 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-1">Cenário 2026 (LC 224)</h3>
            <p className="text-lg font-bold text-slate-800">{formatMoney(c26.total_impostos ?? 0)}</p>
            <p className="text-xs text-slate-500">Regime: {c26.regime ?? '-'}</p>
          </Card>
        )}
      </div>
    );
  }
  const resultData = rd.result_data ?? rd;
  const total = (resultData as any)?.total_impostos ?? (resultData as any)?.imposto_total;
  if (total != null) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-1">Total de impostos</h3>
        <p className="text-2xl font-bold text-slate-800">{formatMoney(total)}</p>
      </Card>
    );
  }
  return <p className="text-sm text-slate-500">Dados da simulação disponíveis.</p>;
}

function IrpfResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const r = (snapshot.resultado_simulacao ?? snapshot) as Record<string, any>;
  const nome = (snapshot as any).contribuinte_nome;
  const bcc = Number((snapshot as any).base_calculo_combinada) || 0;
  return (
    <div className="space-y-4">
      {nome && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-1">Contribuinte</h3>
          <p className="text-lg font-bold text-slate-800">{nome}</p>
          <p className="text-xs text-slate-500">Base de cálculo combinada: {formatMoney(bcc)}</p>
        </Card>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-1">Faixa</h3>
          <p className="text-xl font-bold text-slate-800">{r.faixa ?? '-'}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-1">Alíquota Marginal</h3>
          <p className="text-xl font-bold text-slate-800">{fmtPct(r.aliquota_marginal ?? 0)}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-1">Imposto Estimado</h3>
          <p className="text-xl font-bold text-slate-800">{formatMoney(r.imposto_estimado ?? 0)}</p>
        </Card>
      </div>
    </div>
  );
}

function DistribuicaoLucrosResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = (snapshot.result_data ?? snapshot) as Record<string, any>;
  const scenarios = rd.scenarios ?? rd;
  const keys = Object.keys(scenarios).filter((k) => typeof scenarios[k] === 'object' && scenarios[k] !== null);
  if (keys.length === 0) return <p className="text-sm text-slate-500">Dados da simulação disponíveis.</p>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {keys.slice(0, 4).map((k) => {
        const s = scenarios[k];
        return (
          <Card key={k} className="p-4">
            <h3 className="text-sm font-semibold text-slate-600 mb-1">{s.label ?? k}</h3>
            {s.carga_total != null && <p className="text-lg font-bold text-slate-800">{formatMoney(s.carga_total)}</p>}
            {s.aliquota_efetiva != null && <p className="text-xs text-slate-500">Alíquota efetiva: {fmtPct(s.aliquota_efetiva)}</p>}
          </Card>
        );
      })}
    </div>
  );
}

function ComparativoRegimesResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = (snapshot.result_data ?? snapshot) as Record<string, any>;
  const regimes = ['lucro_presumido', 'lucro_real', 'simples_nacional'] as const;
  const labels: Record<string, string> = { lucro_presumido: 'Lucro Presumido', lucro_real: 'Lucro Real', simples_nacional: 'Simples Nacional' };
  const best = rd.regime_mais_economico as string | undefined;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {regimes.map((key) => {
        const r = rd[key] as Record<string, any> | undefined;
        if (!r) return null;
        const isBest = best === key;
        return (
          <Card key={key} className={`p-4 ${isBest ? 'ring-2 ring-green-400' : ''}`}>
            <h3 className="text-sm font-semibold text-slate-600 mb-1">
              {labels[key]}{isBest && <span className="ml-1 text-xs text-green-600">Mais econômico</span>}
            </h3>
            <p className="text-2xl font-bold text-slate-800">{formatMoney(r.carga_total_anual ?? 0)}</p>
            <p className="text-xs text-slate-500 mt-1">Alíquota efetiva: {fmtPct(r.aliquota_efetiva ?? 0)}</p>
          </Card>
        );
      })}
    </div>
  );
}

function PrecificadorPublicResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = (snapshot.result_data ?? snapshot) as Record<string, any>;
  const regimes = [rd.lucro_presumido, rd.lucro_real, rd.simples_nacional, rd.reforma_ibs_cbs].filter(Boolean);
  const best = rd.melhor_regime as string | undefined;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {regimes.map((r: any) => (
        <Card key={r.regime} className={`p-4 ${r.regime === best ? 'ring-2 ring-green-400' : ''}`}>
          <h3 className="text-sm font-semibold text-slate-600 mb-1">
            {r.regime}{r.regime === best && <span className="ml-1 text-xs text-green-600">Melhor margem</span>}
          </h3>
          <p className="text-2xl font-bold text-slate-800">{formatMoney(r.preco_sugerido ?? 0)}</p>
          <p className="text-xs text-slate-500 mt-1">Total impostos: {formatMoney(r.total_impostos ?? 0)}</p>
          <p className="text-xs text-slate-500">Margem líq.: {formatMoney(r.margem_liquida_resultante ?? 0)}</p>
        </Card>
      ))}
    </div>
  );
}

function SplitPaymentPublicResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = (snapshot.result_data ?? snapshot) as Record<string, any>;
  const resumo = rd.resumo as Record<string, any> | undefined;
  if (!resumo) return <GenericSnapshotResult snapshot={snapshot} />;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-1">Capital de Giro Necessário</h3>
        <p className="text-xl font-bold text-slate-800">{formatMoney(resumo.capital_giro_necessario ?? 0)}</p>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-1">Custo Financeiro Mensal</h3>
        <p className="text-xl font-bold text-slate-800">{formatMoney(resumo.custo_financeiro_mensal ?? 0)}</p>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-1">Custo Financeiro Anual</h3>
        <p className="text-xl font-bold text-slate-800">{formatMoney(resumo.custo_financeiro_anual ?? 0)}</p>
      </Card>
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-600 mb-1">Redução no Caixa</h3>
        <p className="text-xl font-bold text-slate-800">{fmtPct(resumo.reducao_caixa_percentual ?? 0)}</p>
      </Card>
    </div>
  );
}

function GenericSnapshotResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = (snapshot.result_data ?? snapshot) as Record<string, any>;
  const entries = Object.entries(rd).filter(([, v]) => typeof v === 'number' || typeof v === 'string').slice(0, 10);
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold text-slate-600 mb-2">Dados da simulação</h3>
      <div className="text-sm text-slate-700 space-y-1">
        {entries.map(([k, v]) => (
          <p key={k}><span className="font-medium">{k}:</span> {typeof v === 'number' ? formatMoney(v) : String(v)}</p>
        ))}
      </div>
    </Card>
  );
}

const TYPE_LABELS: Record<string, string> = {
  locacao_pf_pj: 'Locação — PF vs PJ vs Reforma',
  ganho_capital_imovel: 'Ganho de Capital — Venda de Imóvel',
  in_2306: 'Simulador LC 224/2025 (IN 2306)',
  irpf_alta_renda: 'IRPF Alta Renda — Lei 15.270/2025',
  distribuicao_lucros: 'Distribuição de Lucros — Lei 15.270/2025',
  comparativo_regimes: 'Comparativo de Regimes Tributários',
  precificador: 'Precificador com Custo Tributário',
  split_payment: 'Simulador de Impacto — Split Payment',
};

export function SimulacaoPublica() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const isGeneric = params.get('type') === 'generic';
  const [data, setData] = useState<NormalizedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setError('Token não informado'); setLoading(false); return; }
    const baseUrl = getApiUrl();
    const url = isGeneric
      ? `${baseUrl}/api/v1/simulation-shares/public/${encodeURIComponent(token)}`
      : `${baseUrl}/api/v1/properties/public/simulation/${encodeURIComponent(token)}`;

    fetch(url)
      .then((res) => { if (!res.ok) return res.json().then((j) => { throw new Error(j.error?.message || 'Erro'); }); return res.json(); })
      .then((json) => {
        const d = json.data;
        setData(isGeneric ? normalizeGenericData(d) : normalizePropertyData(d));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, isGeneric]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand mx-auto mb-3" />
          <p className="text-slate-500">Carregando simulação...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="max-w-md p-8 text-center">
          <svg className="w-12 h-12 mx-auto text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.07 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">Link indisponível</h2>
          <p className="text-slate-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  const { simulationType, title, ano, snapshot, createdAt, brandName, brandLogo } = data;
  const typeLabel = TYPE_LABELS[simulationType] ?? simulationType;

  function renderResult() {
    switch (simulationType) {
      case 'locacao_pf_pj':
      case 'ganho_capital_imovel':
        return <LocacaoResult snapshot={snapshot} />;
      case 'in_2306':
        return <IN2306Result snapshot={snapshot} />;
      case 'irpf_alta_renda':
        return <IrpfResult snapshot={snapshot} />;
      case 'distribuicao_lucros':
        return <DistribuicaoLucrosResult snapshot={snapshot} />;
      case 'comparativo_regimes':
        return <ComparativoRegimesResult snapshot={snapshot} />;
      case 'precificador':
        return <PrecificadorPublicResult snapshot={snapshot} />;
      case 'split_payment':
        return <SplitPaymentPublicResult snapshot={snapshot} />;
      default:
        return <GenericSnapshotResult snapshot={snapshot} />;
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {brandLogo && (
              <img src={brandLogo} alt="" className="h-9 max-w-[140px] object-contain rounded" />
            )}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{brandName}</p>
              <h1 className="text-lg font-bold text-slate-900">{title}</h1>
            </div>
          </div>
          {ano && <span className="text-xs text-slate-400 shrink-0">Ano-base: {ano}</span>}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {renderResult()}

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Dados da simulação</h3>
          <div className="text-xs text-slate-600 space-y-1">
            {ano && <p>Ano-base: {ano}</p>}
            <p>Tipo: {typeLabel}</p>
            {createdAt && <p>Gerada em: {new Date(createdAt).toLocaleDateString('pt-BR')}</p>}
          </div>
        </Card>

        <footer className="text-center text-xs text-slate-400 py-4 border-t border-slate-200">
          <p>{brandName} — Documento gerado automaticamente</p>
          <p className="mt-1">Este link é de acesso público e somente leitura</p>
        </footer>
      </main>
    </div>
  );
}
