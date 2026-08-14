import { useState, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { getApiUrl } from '../../../shared/services/api';
import { ReportCoverSection } from '../../../lib/report-pdf/ReportCoverSection';
import { ReportPrintHeader, ReportPrintFooter } from '../../../lib/report-pdf/ReportPrintChrome';
import { useReportPrint } from '../../../lib/report-pdf/useReportPrint';

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

interface GenericShareData {
  simulation_type: string;
  snapshot: Record<string, unknown>;
  title: string | null;
  branding: { report_brand_name: string | null; report_logo_url: string | null };
}

function formatMoney(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(2)}%`;
}

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined;
}

function getResult(snapshot: Record<string, unknown>): Record<string, unknown> {
  return asRecord(snapshot.result_data) ?? snapshot;
}

function getInput(snapshot: Record<string, unknown>): Record<string, unknown> {
  return asRecord(snapshot.input_data) ?? {};
}

function num(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
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
  const result = d.simulation.result_data ?? {};
  return {
    simulationType: d.share.simulation_kind ?? 'locacao_pf_pj',
    title: d.share.title || d.simulation.title || 'Simulação Tributária',
    ano: d.simulation.ano,
    snapshot: {
      input_data: d.simulation.input_data,
      result_data: d.simulation.result_data,
      ...result,
    },
    createdAt: d.simulation.created_at,
    brandName: d.branding?.report_brand_name || 'IATax Soluções Inteligentes',
    brandLogo: d.branding?.report_logo_url ?? null,
  };
}

function normalizeGenericData(d: GenericShareData): NormalizedData {
  const snap = d.snapshot ?? {};
  return {
    simulationType: d.simulation_type,
    title: d.title || (typeof snap.title === 'string' ? snap.title : '') || 'Simulação Tributária',
    ano: typeof snap.ano === 'number' ? snap.ano : null,
    snapshot: snap,
    createdAt: typeof snap.created_at === 'string' ? snap.created_at : null,
    brandName: d.branding?.report_brand_name || 'IATax Soluções Inteligentes',
    brandLogo: d.branding?.report_logo_url ?? null,
  };
}

function DlRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
      {rows.map((r) => (
        <div key={r.label} className="contents">
          <dt className="text-slate-500">{r.label}</dt>
          <dd className="text-right font-medium text-slate-800">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5 break-inside-avoid">
      <h3 className="text-sm font-bold text-slate-900 mb-2">{title}</h3>
      {children}
    </section>
  );
}

function LocacaoResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const result = getResult(snapshot);
  const cenarios = asRecord(result.cenarios) ?? asRecord(snapshot.cenarios);
  const pf = asRecord(cenarios?.pf);
  const pj = asRecord(cenarios?.pj);
  const reformaPf = asRecord(cenarios?.reforma_2027_pf) ?? asRecord(cenarios?.reforma_2027);
  const reformaPj = asRecord(cenarios?.reforma_2027_pj);
  const breakEven = asRecord(result.break_even) ?? asRecord(snapshot.break_even);
  const memoria = asRecord(result.memoria_calculo) ?? asRecord(snapshot.memoria_calculo);

  if (!pf && !pj && !reformaPf) {
    return <p className="text-sm text-slate-500">Sem dados de cenários.</p>;
  }

  return (
    <div className="space-y-5">
      {pf && (
        <Section title="Pessoa Física">
          <DlRows
            rows={[
              { label: 'Receita bruta', value: formatMoney(pf.receita_bruta_total) },
              { label: 'Despesas dedutíveis', value: formatMoney(pf.despesas_dedutiveis_total) },
              { label: 'Base de cálculo', value: formatMoney(pf.base_calculo_total) },
              { label: 'IR (carnê-leão)', value: formatMoney(pf.imposto_total) },
              { label: 'Alíquota efetiva', value: fmtPct(pf.aliquota_efetiva_anual ?? pf.aliquota_efetiva) },
            ]}
          />
        </Section>
      )}
      {pj && (
        <Section title="Pessoa Jurídica (Lucro Presumido)">
          <DlRows
            rows={[
              { label: 'Receita bruta', value: formatMoney(pj.receita_bruta_total) },
              { label: 'Base IRPJ', value: formatMoney(pj.base_presumida_irpj) },
              { label: 'Base CSLL', value: formatMoney(pj.base_presumida_csll) },
              { label: 'IRPJ', value: formatMoney(pj.irpj) },
              { label: 'CSLL', value: formatMoney(pj.csll) },
              { label: 'PIS', value: formatMoney(pj.pis) },
              { label: 'COFINS', value: formatMoney(pj.cofins) },
              { label: 'Imposto total', value: formatMoney(pj.imposto_total) },
              { label: 'Alíquota efetiva', value: fmtPct(pj.aliquota_efetiva) },
            ]}
          />
          {asRecord(pj.dividendos) && (
            <p className="text-xs text-slate-600 mt-2">
              Dividendos — IRRF {formatMoney(asRecord(pj.dividendos)?.irrf_total)} · líquido sócio{' '}
              {formatMoney(asRecord(pj.dividendos)?.lucro_liquido_socio)}
            </p>
          )}
        </Section>
      )}
      {(reformaPf || reformaPj) && (
        <Section title="Reforma LC 214/2025">
          {reformaPf && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-600 mb-1">Ótica PF</p>
              <DlRows
                rows={[
                  { label: 'IBS/CBS líquido', value: formatMoney(reformaPf.ibs_cbs_liquido) },
                  { label: 'Imposto total', value: formatMoney(reformaPf.imposto_total) },
                  { label: 'Alíquota efetiva', value: fmtPct(reformaPf.aliquota_efetiva) },
                ]}
              />
            </div>
          )}
          {reformaPj && (
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-1">Ótica PJ</p>
              <DlRows
                rows={[
                  { label: 'IBS/CBS líquido', value: formatMoney(reformaPj.ibs_cbs_liquido) },
                  { label: 'Imposto total', value: formatMoney(reformaPj.imposto_total) },
                  { label: 'Alíquota efetiva', value: fmtPct(reformaPj.aliquota_efetiva) },
                ]}
              />
            </div>
          )}
        </Section>
      )}
      {breakEven && (
        <Section title="Break-even">
          <DlRows
            rows={[
              { label: 'Valor mensal', value: formatMoney(breakEven.valor_mensal_break_even) },
            ]}
          />
          {typeof breakEven.descricao === 'string' && (
            <p className="text-xs text-slate-600 mt-2">{breakEven.descricao}</p>
          )}
        </Section>
      )}
      {memoria && (
        <Section title="Memória de cálculo">
          <ScalarDump data={memoria} />
        </Section>
      )}
    </div>
  );
}

function GanhoCapitalResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const result = getResult(snapshot);
  const input = getInput(snapshot);
  return (
    <div className="space-y-5">
      {(num(input.venda) != null || num(input.custo) != null) && (
        <Section title="Entradas">
          <DlRows
            rows={[
              ...(num(input.venda) != null ? [{ label: 'Valor de alienação', value: formatMoney(input.venda) }] : []),
              ...(num(input.custo) != null ? [{ label: 'Custo de aquisição', value: formatMoney(input.custo) }] : []),
              ...(num(input.despesas) != null ? [{ label: 'Despesas', value: formatMoney(input.despesas) }] : []),
              ...(typeof input.dtAq === 'string' ? [{ label: 'Data aquisição', value: input.dtAq }] : []),
              ...(typeof input.dtAl === 'string' ? [{ label: 'Data alienação', value: input.dtAl }] : []),
            ]}
          />
        </Section>
      )}
      <Section title="Resultado">
        <DlRows
          rows={[
            { label: 'Ganho de capital bruto', value: formatMoney(result.gcBruto) },
            { label: 'IRPF', value: formatMoney(result.irpfTotal) },
            { label: 'PJ mercadoria', value: formatMoney(result.pjMercTotal) },
            { label: 'PJ ativo', value: formatMoney(result.pjAtivoTotal) },
            { label: 'IBS/CBS', value: formatMoney(result.ibsCbsTotalDev) },
          ]}
        />
      </Section>
    </div>
  );
}

function cenarioImpostoTotal(c: Record<string, unknown>): number {
  if (typeof c.total_impostos === 'number') return c.total_impostos;
  const keys = ['irpj_total', 'irpj_adicional_total', 'csll_total', 'pis_a_rec_total', 'cofins_a_rec_total'];
  return keys.reduce((s, k) => s + (typeof c[k] === 'number' ? (c[k] as number) : 0), 0);
}

function IN2306Result({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = getResult(snapshot);
  const c25 = asRecord(rd.cenario_2025);
  const c26 = asRecord(rd.cenario_2026);
  const comparativo = asRecord(rd.comparativo);
  if (!c25 && !c26) {
    const total = rd.total_impostos ?? rd.imposto_total ?? asRecord(rd.result_data)?.total_impostos;
    if (total != null) {
      return (
        <Section title="Total de impostos">
          <p className="text-2xl font-bold text-slate-800">{formatMoney(total)}</p>
        </Section>
      );
    }
    return <ScalarDump data={rd} />;
  }

  const rowsFor = (c: Record<string, unknown>) => [
    { label: 'Receita bruta', value: formatMoney(c.receita_bruta_total) },
    { label: 'IRPJ', value: formatMoney(c.irpj_total) },
    { label: 'CSLL', value: formatMoney(c.csll_total) },
    { label: 'Total', value: formatMoney(cenarioImpostoTotal(c)) },
  ];

  return (
    <div className="space-y-5">
      {c25 && (
        <Section title="Cenário 2025">
          <DlRows rows={rowsFor(c25)} />
        </Section>
      )}
      {c26 && (
        <Section title="Cenário 2026 (LC 224)">
          <DlRows rows={rowsFor(c26)} />
        </Section>
      )}
      {comparativo && (
        <Section title="Comparativo">
          <DlRows
            rows={[
              { label: 'Imposto a maior 2026×2025', value: formatMoney(comparativo.imposto_a_maior_2026_vs_2025) },
              ...(comparativo.imposto_a_maior_2026_vs_equiparacao != null
                ? [{ label: 'A maior vs equiparação', value: formatMoney(comparativo.imposto_a_maior_2026_vs_equiparacao) }]
                : []),
              ...(comparativo.economia_equiparacao_vs_2026 != null
                ? [{ label: 'Economia equiparação vs 2026', value: formatMoney(comparativo.economia_equiparacao_vs_2026) }]
                : []),
            ]}
          />
        </Section>
      )}
    </div>
  );
}

function IrpfResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const r = asRecord(snapshot.resultado_simulacao) ?? getResult(snapshot);
  const nome = typeof snapshot.contribuinte_nome === 'string' ? snapshot.contribuinte_nome : undefined;
  const bcc = num(snapshot.base_calculo_combinada) ?? num(r.base_calculo_combinada);
  return (
    <Section title="IRPF alta renda">
      <DlRows
        rows={[
          ...(nome ? [{ label: 'Contribuinte', value: nome }] : []),
          { label: 'Base combinada', value: formatMoney(bcc) },
          { label: 'Faixa', value: String(r.faixa ?? '—') },
          { label: 'Alíquota', value: fmtPct(r.aliquota_percentual ?? r.aliquota_marginal) },
          { label: 'Imposto estimado', value: formatMoney(r.imposto_estimado) },
        ]}
      />
    </Section>
  );
}

function lineFromObject(key: string, obj: Record<string, unknown>): { label: string; value: string }[] {
  const label = typeof obj.label === 'string' ? obj.label : key.replace(/_/g, ' ');
  const rows: { label: string; value: string }[] = [];
  const moneyKeys = ['carga_total', 'carga_total_anual', 'preco_sugerido', 'total_impostos', 'margem_liquida_resultante', 'imposto_total', 'valor'];
  const pctKeys = ['aliquota_efetiva'];
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'label' || k === 'regime') continue;
    if (moneyKeys.includes(k) && typeof v === 'number') rows.push({ label: `${label} · ${k.replace(/_/g, ' ')}`, value: formatMoney(v) });
    else if (pctKeys.includes(k) && typeof v === 'number') rows.push({ label: `${label} · ${k.replace(/_/g, ' ')}`, value: fmtPct(v) });
    else if (typeof v === 'number') rows.push({ label: `${label} · ${k.replace(/_/g, ' ')}`, value: formatMoney(v) });
    else if (typeof v === 'string' && v.length < 80) rows.push({ label: `${label} · ${k.replace(/_/g, ' ')}`, value: v });
  }
  return rows;
}

function DistribuicaoLucrosResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = getResult(snapshot);
  const scenarios = asRecord(rd.scenarios) ?? rd;
  const keys = Object.keys(scenarios).filter((k) => asRecord(scenarios[k]));
  if (keys.length === 0) return <ScalarDump data={rd} />;
  return (
    <Section title="Distribuição de lucros">
      <DlRows rows={keys.flatMap((k) => lineFromObject(k, asRecord(scenarios[k])!))} />
    </Section>
  );
}

function ComparativoRegimesResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = getResult(snapshot);
  const regimes = ['lucro_presumido', 'lucro_real', 'simples_nacional'] as const;
  const labels: Record<string, string> = { lucro_presumido: 'Lucro Presumido', lucro_real: 'Lucro Real', simples_nacional: 'Simples Nacional' };
  const best = typeof rd.regime_mais_economico === 'string' ? rd.regime_mais_economico : undefined;
  const rows: { label: string; value: string }[] = [];
  for (const key of regimes) {
    const r = asRecord(rd[key]);
    if (!r) continue;
    const tag = best === key ? ' (mais econômico)' : '';
    rows.push({ label: `${labels[key]}${tag}`, value: formatMoney(r.carga_total_anual) });
    if (r.aliquota_efetiva != null) rows.push({ label: `${labels[key]} · alíquota`, value: fmtPct(r.aliquota_efetiva) });
  }
  if (typeof rd.recomendacao === 'string') rows.push({ label: 'Recomendação', value: rd.recomendacao });
  if (rows.length === 0) return <ScalarDump data={rd} />;
  return (
    <Section title="Comparativo de regimes">
      <DlRows rows={rows} />
    </Section>
  );
}

function PrecificadorPublicResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = getResult(snapshot);
  const items = [rd.lucro_presumido, rd.lucro_real, rd.simples_nacional, rd.reforma_ibs_cbs]
    .map(asRecord)
    .filter((x): x is Record<string, unknown> => !!x);
  const best = typeof rd.melhor_regime === 'string' ? rd.melhor_regime : undefined;
  if (items.length === 0) return <ScalarDump data={rd} />;
  return (
    <Section title="Precificador">
      <DlRows
        rows={items.flatMap((r) => {
          const name = String(r.regime ?? 'Regime');
          const tag = r.regime === best ? ' (melhor margem)' : '';
          return [
            { label: `${name}${tag} · preço`, value: formatMoney(r.preco_sugerido) },
            { label: `${name} · impostos`, value: formatMoney(r.total_impostos) },
            { label: `${name} · margem`, value: formatMoney(r.margem_liquida_resultante) },
          ];
        })}
      />
    </Section>
  );
}

function SplitPaymentPublicResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const rd = getResult(snapshot);
  const resumo = asRecord(rd.resumo);
  if (!resumo) return <ScalarDump data={rd} />;
  return (
    <Section title="Split payment">
      <DlRows
        rows={[
          { label: 'Capital de giro necessário', value: formatMoney(resumo.capital_giro_necessario) },
          { label: 'Custo financeiro mensal', value: formatMoney(resumo.custo_financeiro_mensal) },
          { label: 'Custo financeiro anual', value: formatMoney(resumo.custo_financeiro_anual) },
          { label: 'Redução no caixa', value: fmtPct(resumo.reducao_caixa_percentual) },
        ]}
      />
    </Section>
  );
}

const ITBI_ENQ: Record<string, string> = {
  incidencia: 'Incidência',
  imunidade_total: 'Imunidade total',
  imunidade_parcial: 'Imunidade parcial',
};

function ItbiResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const r = getResult(snapshot);
  const memoria = Array.isArray(r.memoria) ? (r.memoria as { ordem: number; descricao: string; valor?: number }[]) : [];
  return (
    <div className="space-y-5">
      <Section title="ITBI na integralização — Tema 796">
        <DlRows
          rows={[
            { label: 'Enquadramento', value: ITBI_ENQ[String(r.enquadramento)] ?? String(r.enquadramento ?? '—') },
            { label: 'Referência', value: formatMoney(r.valor_referencia) },
            { label: 'Base cheia', value: formatMoney(r.base_cheia) },
            { label: 'Capital imune', value: formatMoney(r.capital_imune) },
            { label: 'Base tributável', value: formatMoney(r.base_tributavel) },
            { label: 'Alíquota', value: fmtPct(r.aliquota_percent) },
            { label: 'ITBI', value: formatMoney(r.itbi) },
          ]}
        />
      </Section>
      {memoria.length > 0 && (
        <Section title="Memória Tema 796">
          <ol className="text-xs space-y-1 text-slate-600">
            {memoria.map((m) => (
              <li key={m.ordem}>
                {m.ordem}. {m.descricao}
                {m.valor != null ? ` — ${formatMoney(m.valor)}` : ''}
              </li>
            ))}
          </ol>
        </Section>
      )}
      {typeof r.aviso === 'string' && <p className="text-xs text-slate-500">{r.aviso}</p>}
    </div>
  );
}

function ItcmdResult({ snapshot }: { snapshot: Record<string, unknown> }) {
  const r = getResult(snapshot);
  const memoria = Array.isArray(r.memoria) ? (r.memoria as { ordem: number; descricao: string; valor?: number }[]) : [];
  return (
    <div className="space-y-5">
      <Section title="ITCMD na doação">
        <DlRows
          rows={[
            { label: 'UF', value: String(r.uf ?? '—') },
            { label: 'Valor do bem', value: formatMoney(r.valor_bem) },
            { label: 'Base', value: formatMoney(r.base) },
            { label: 'Alíquota', value: fmtPct(r.aliquota_percent) },
            { label: 'ITCMD', value: formatMoney(r.itcmd) },
          ]}
        />
        {typeof r.efeito_usufruto === 'string' && (
          <p className="text-sm text-slate-700 mt-2">{r.efeito_usufruto}</p>
        )}
      </Section>
      {memoria.length > 0 && (
        <Section title="Memória">
          <ol className="text-xs space-y-1 text-slate-600">
            {memoria.map((m) => (
              <li key={m.ordem}>
                {m.ordem}. {m.descricao}
                {m.valor != null ? ` — ${formatMoney(m.valor)}` : ''}
              </li>
            ))}
          </ol>
        </Section>
      )}
      {typeof r.aviso === 'string' && <p className="text-xs text-slate-500">{r.aviso}</p>}
    </div>
  );
}

function ProjetoPpsResultView({ snapshot }: { snapshot: Record<string, unknown> }) {
  const r = getResult(snapshot);
  const input = getInput(snapshot);
  const resumos = Array.isArray(r.resumos)
    ? (r.resumos as { kind: string; titulo: string; linhas: { label: string; valor: string }[] }[])
    : [];
  const recomendacao = typeof input.recomendacao === 'string' ? input.recomendacao : '';
  return (
    <div className="space-y-5">
      {resumos.map((item) => (
        <Section key={item.kind} title={item.titulo}>
          <DlRows rows={item.linhas.map((l) => ({ label: l.label, value: l.valor }))} />
        </Section>
      ))}
      {recomendacao && (
        <Section title="Recomendação">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{recomendacao}</p>
        </Section>
      )}
    </div>
  );
}

function ScalarDump({ data }: { data: Record<string, unknown> }) {
  const rows: { label: string; value: string }[] = [];
  const walk = (obj: Record<string, unknown>, prefix: string) => {
    for (const [k, v] of Object.entries(obj)) {
      if (k === 'input_data' || k === 'result_data' || k === 'memoria' || k === 'memoria_calculo') continue;
      const label = prefix ? `${prefix} · ${k}` : k.replace(/_/g, ' ');
      if (typeof v === 'number') {
        rows.push({ label, value: Math.abs(v) <= 100 && !Number.isInteger(v) ? fmtPct(v) : formatMoney(v) });
      } else if (typeof v === 'boolean') {
        rows.push({ label, value: v ? 'Sim' : 'Não' });
      } else if (typeof v === 'string' && v.length > 0 && v.length < 160) {
        rows.push({ label, value: v });
      } else if (v && typeof v === 'object' && !Array.isArray(v) && prefix.split('·').length < 2) {
        walk(v as Record<string, unknown>, label);
      }
    }
  };
  walk(data, '');
  if (rows.length === 0) return <p className="text-sm text-slate-500">Dados da simulação disponíveis.</p>;
  return <DlRows rows={rows.slice(0, 40)} />;
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
  itbi_integralizacao: 'ITBI na integralização',
  itcmd_doacao: 'ITCMD na doação',
  projeto_pps: 'Relatório do projeto',
};

export function SimulacaoPublica() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const isGeneric = params.get('type') === 'generic';
  const [data, setData] = useState<NormalizedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { print } = useReportPrint('simulacao-publica-print-wrapper');

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
  const input = getInput(snapshot);
  const clientName =
    (typeof input.client_name === 'string' && input.client_name) ||
    (typeof snapshot.contribuinte_nome === 'string' && snapshot.contribuinte_nome) ||
    undefined;

  function renderResult() {
    switch (simulationType) {
      case 'locacao_pf_pj':
        return <LocacaoResult snapshot={snapshot} />;
      case 'ganho_capital_imovel':
        return <GanhoCapitalResult snapshot={snapshot} />;
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
      case 'itbi_integralizacao':
        return <ItbiResult snapshot={snapshot} />;
      case 'itcmd_doacao':
        return <ItcmdResult snapshot={snapshot} />;
      case 'projeto_pps':
        return <ProjetoPpsResultView snapshot={snapshot} />;
      default:
        return (
          <Section title="Dados da simulação">
            <ScalarDump data={getResult(snapshot)} />
          </Section>
        );
    }
  }

  const coverDetails = [
    { label: 'Tipo', value: typeLabel },
    ...(ano != null ? [{ label: 'Ano-base', value: String(ano) }] : []),
    ...(createdAt ? [{ label: 'Gerada em', value: new Date(createdAt).toLocaleDateString('pt-BR') }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white py-6 px-3">
      <div className="max-w-[210mm] mx-auto mb-4 print:hidden flex justify-end">
        <Button type="button" variant="primary" onClick={() => print()}>
          Imprimir / Exportar PDF
        </Button>
      </div>

      <div
        id="simulacao-publica-print-wrapper"
        className="max-w-[210mm] mx-auto bg-white shadow-lg print:shadow-none px-8 py-8 sm:px-10"
      >
        <ReportPrintHeader
          variant="previewModal"
          reportTitle={title}
          metaLine={typeLabel}
          logoUrl={brandLogo}
          brandName={brandName}
        />
        <ReportCoverSection
          variant="previewModal"
          title={typeLabel}
          clientName={clientName}
          subtitle={title !== typeLabel ? title : undefined}
          brandName={brandName}
          details={coverDetails}
        />

        {renderResult()}

        <p className="mt-6 text-xs text-slate-500 border-t border-slate-200 pt-3">
          Simulação para reunião. Não substitui guia, DAA nem parecer. Link somente leitura.
        </p>
        <ReportPrintFooter variant="previewModal" brandName={brandName} />
      </div>
    </div>
  );
}
