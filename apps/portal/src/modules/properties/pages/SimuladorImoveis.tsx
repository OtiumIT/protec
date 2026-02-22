import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../../../shared/components/layout/Layout';
import { Card } from '../../../shared/components/ui/Card';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { useToast } from '../../../shared/components/ui/Toast';
import { MoneyInput } from '../../../shared/components/ui/MoneyInput';
import { propertyService } from '../services/property.service';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { PropertyTaxSimulationResponse, SimulateStandaloneMesInput } from '@shared/core';

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

type MesFields = Omit<SimulateStandaloneMesInput, 'mes_referencia'>;
type SectionKey = 'receita' | 'despesa' | 'custo';

const ROWS: Array<{ label: string; field: keyof MesFields; section: SectionKey }> = [
  { label: 'Aluguel tradicional (longo prazo)', field: 'receita_aluguel_tradicional', section: 'receita' },
  { label: 'Aluguel curto prazo (Airbnb, temporada)', field: 'receita_aluguel_curto', section: 'receita' },
  { label: 'Estacionamento / vaga de garagem', field: 'receita_garagem', section: 'receita' },
  { label: 'Outras (lavanderia, depósito, etc.)', field: 'receita_outras', section: 'receita' },
  { label: 'IPTU', field: 'iptu', section: 'despesa' },
  { label: 'Condomínio', field: 'condominio', section: 'despesa' },
  { label: 'Seguro do imóvel', field: 'seguro_imovel', section: 'despesa' },
  { label: 'Juros de financiamento do imóvel', field: 'juros_financiamento', section: 'despesa' },
  { label: 'Manutenção e conservação', field: 'manutencao_conservacao', section: 'despesa' },
  { label: 'Outras despesas dedutíveis', field: 'outras_dedutiveis', section: 'despesa' },
  { label: 'Reformas e melhorias', field: 'reformas_melhorias', section: 'custo' },
  { label: 'Mobiliário e equipamentos', field: 'mobilia_equipamentos', section: 'custo' },
  { label: 'Limpeza e higienização', field: 'limpeza_higienizacao', section: 'custo' },
  { label: 'Comissão imobiliária / corretagem', field: 'comissao_corretagem', section: 'custo' },
  { label: 'Taxa de plataforma (Airbnb, Booking, etc.)', field: 'taxa_plataforma', section: 'custo' },
  { label: 'Outros custos operacionais', field: 'outros_custos', section: 'custo' },
];

const SECTION_CONFIG: Record<SectionKey, { title: string; subtitle: string; icon: React.ReactNode; bg: string; border: string; headerBg: string }> = {
  receita: {
    title: 'Receitas',
    subtitle: 'Valores mensais que entram (aluguéis, diárias, etc.)',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    bg: 'bg-emerald-50/60',
    border: 'border-emerald-200',
    headerBg: 'bg-emerald-100/80 border-emerald-200',
  },
  despesa: {
    title: 'Despesas dedutíveis (PF)',
    subtitle: 'Lei 7.713/88 — reduzem a base de cálculo do IR',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    bg: 'bg-sky-50/60',
    border: 'border-sky-200',
    headerBg: 'bg-sky-100/80 border-sky-200',
  },
  custo: {
    title: 'Custos operacionais',
    subtitle: 'Reforma IBS/CBS — geram créditos na atividade',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    bg: 'bg-amber-50/60',
    border: 'border-amber-200',
    headerBg: 'bg-amber-100/80 border-amber-200',
  },
};

const DEMO_KEY_WINDOW_MS = 1500;

/** Ctrl+D+1: Cenário viável – predominância Airbnb, receita ~140k, ultrapassa 120k no 4º trim (imposto postergado) */
function buildDemoMeses(ano: number): SimulateStandaloneMesInput[] {
  const base = {
    receita_aluguel_tradicional: 2500,
    receita_aluguel_curto: 9000,
    receita_garagem: 200,
    receita_outras: 0,
    iptu: 450,
    condominio: 380,
    seguro_imovel: 120,
    juros_financiamento: 0,
    manutencao_conservacao: 150,
    outras_dedutiveis: 0,
    reformas_melhorias: 0,
    mobilia_equipamentos: 0,
    limpeza_higienizacao: 350,
    comissao_corretagem: 0,
    taxa_plataforma: 540,
    outros_custos: 0,
  };
  return Array.from({ length: 12 }, (_, i) => ({
    mes_referencia: `${ano}-${String(i + 1).padStart(2, '0')}`,
    ...base,
  }));
}

function emptyMes(ano: number, i: number): SimulateStandaloneMesInput {
  return {
    mes_referencia: `${ano}-${String(i + 1).padStart(2, '0')}`,
    receita_aluguel_tradicional: 0,
    receita_aluguel_curto: 0,
    receita_garagem: 0,
    receita_outras: 0,
    iptu: 0,
    condominio: 0,
    seguro_imovel: 0,
    juros_financiamento: 0,
    manutencao_conservacao: 0,
    outras_dedutiveis: 0,
    reformas_melhorias: 0,
    mobilia_equipamentos: 0,
    limpeza_higienizacao: 0,
    comissao_corretagem: 0,
    taxa_plataforma: 0,
    outros_custos: 0,
  };
}

export function SimuladorImoveis() {
  const { success, error: showError, ToastContainer } = useToast();
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [meses, setMeses] = useState<SimulateStandaloneMesInput[]>(() =>
    Array.from({ length: 12 }, (_, i) => emptyMes(anoAtual, i))
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PropertyTaxSimulationResponse | null>(null);

  const updateMes = (idx: number, field: keyof MesFields, value: number) => {
    setMeses((prev) => {
      const next = [...prev];
      const m = { ...next[idx]!, [field]: round2(value) };
      next[idx] = m;
      return next;
    });
  };

  const updateAno = (newAno: number) => {
    setAno(newAno);
    setMeses((prev) =>
      prev.map((m, i) => ({
        ...m,
        mes_referencia: `${newAno}-${String(i + 1).padStart(2, '0')}`,
      }))
    );
  };

  const waitingDemoDigitRef = useRef<number>(0);
  const demoKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fillDemo1 = useCallback(() => {
    const anoDemo = anoAtual;
    setAno(anoDemo);
    setMeses(buildDemoMeses(anoDemo));
    setResult(null);
    success('Demo carregada: predominância Airbnb, ~R$ 140k/ano (Ctrl+D+1). Clique em "Simular".');
  }, [success, anoAtual]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (waitingDemoDigitRef.current && e.key === '1') {
        e.preventDefault();
        waitingDemoDigitRef.current = 0;
        if (demoKeyTimeoutRef.current) {
          clearTimeout(demoKeyTimeoutRef.current);
          demoKeyTimeoutRef.current = null;
        }
        fillDemo1();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        if (demoKeyTimeoutRef.current) clearTimeout(demoKeyTimeoutRef.current);
        waitingDemoDigitRef.current = Date.now();
        demoKeyTimeoutRef.current = setTimeout(() => {
          waitingDemoDigitRef.current = 0;
          demoKeyTimeoutRef.current = null;
        }, DEMO_KEY_WINDOW_MS);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (demoKeyTimeoutRef.current) clearTimeout(demoKeyTimeoutRef.current);
    };
  }, [fillDemo1]);

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const mesesParaEnvio: SimulateStandaloneMesInput[] = meses.map((m, i) => {
        const mesRef = m.mes_referencia || `${ano}-${String(i + 1).padStart(2, '0')}`;
        const out: SimulateStandaloneMesInput = {
          mes_referencia: mesRef,
          receita_aluguel_tradicional: round2((m.receita_aluguel_tradicional ?? 0) as number),
          receita_aluguel_curto: round2((m.receita_aluguel_curto ?? 0) as number),
          receita_garagem: round2((m.receita_garagem ?? 0) as number),
          receita_outras: round2((m.receita_outras ?? 0) as number),
          iptu: round2((m.iptu ?? 0) as number),
          condominio: round2((m.condominio ?? 0) as number),
          seguro_imovel: round2((m.seguro_imovel ?? 0) as number),
          juros_financiamento: round2((m.juros_financiamento ?? 0) as number),
          manutencao_conservacao: round2((m.manutencao_conservacao ?? 0) as number),
          outras_dedutiveis: round2((m.outras_dedutiveis ?? 0) as number),
          reformas_melhorias: round2((m.reformas_melhorias ?? 0) as number),
          mobilia_equipamentos: round2((m.mobilia_equipamentos ?? 0) as number),
          limpeza_higienizacao: round2((m.limpeza_higienizacao ?? 0) as number),
          comissao_corretagem: round2((m.comissao_corretagem ?? 0) as number),
          taxa_plataforma: round2((m.taxa_plataforma ?? 0) as number),
          outros_custos: round2((m.outros_custos ?? 0) as number),
        };
        return out;
      });
      const res = await propertyService.simulateStandalone({
        ano,
        meses: mesesParaEnvio,
      });
      setResult(res);
      success('Simulação concluída.');
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Erro ao simular');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Layout>
      <ToastContainer />
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Simulador Imobiliário – PF vs PJ vs Reforma 2027
        </h1>
        <p className="text-slate-600 mt-2 max-w-2xl">
          Preencha os totais mensais por categoria. O resultado compara Pessoa Física (Carnê-Leão), Pessoa Jurídica (Lucro Presumido) e o cenário da Reforma Tributária (IBS/CBS).
        </p>
        <p className="text-slate-500 text-sm mt-2 flex items-center gap-2">
          <kbd className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono">Ctrl</kbd>
          <span>+</span>
          <kbd className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono">D</kbd>
          <span>+</span>
          <kbd className="px-2 py-1 rounded-md bg-slate-100 border border-slate-200 text-xs font-mono">1</kbd>
          <span className="text-slate-500">— preenche cenário de teste</span>
        </p>
      </div>

      <form onSubmit={handleSimulate} className="space-y-6">
        {/* Ano e ação principal */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700">Ano da simulação</label>
              <Input
                type="number"
                min={2023}
                max={2030}
                value={ano}
                onChange={(e) => updateAno(Number(e.target.value))}
                className="w-28 h-10 text-center font-semibold text-slate-800 rounded-lg border-slate-300"
              />
            </div>
            <Button type="submit" variant="primary" disabled={loading} className="min-w-[200px]">
              {loading ? 'Simulando...' : 'Simular PF vs PJ vs Reforma 2027'}
            </Button>
          </div>
        </Card>

        {/* Seções por categoria */}
        {(['receita', 'despesa', 'custo'] as SectionKey[]).map((sectionKey) => {
          const config = SECTION_CONFIG[sectionKey];
          const sectionRows = ROWS.filter((r) => r.section === sectionKey);
          if (sectionRows.length === 0) return null;
          return (
            <Card key={sectionKey} className={`overflow-hidden border-2 ${config.border} ${config.bg}`}>
              <div className={`flex items-center gap-3 px-5 py-4 border-b ${config.headerBg}`}>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 text-slate-700 shadow-sm">
                  {config.icon}
                </span>
                <div>
                  <h3 className="font-semibold text-slate-800">{config.title}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">{config.subtitle}</p>
                </div>
              </div>
              <div className="-mx-2 overflow-x-auto px-2 py-3">
                <table className="w-full text-sm min-w-[1800px]">
                  <thead>
                    <tr className="border-b border-slate-200/80">
                      <th className="sticky left-0 z-10 min-w-[260px] py-2.5 px-3 text-left font-medium text-slate-600 bg-slate-50/80">
                        Item
                      </th>
                      {MESES.map((nome, i) => (
                        <th key={i} className="min-w-[140px] py-2 px-2 text-center font-medium text-slate-600 text-xs">
                          {nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRows.map((row) => (
                      <tr key={row.field} className="border-b border-slate-100 hover:bg-white/50 transition-colors">
                        <td className="sticky left-0 z-10 py-2 px-3 text-slate-700 bg-white/95 font-medium">
                          {row.label}
                        </td>
                        {meses.map((m, i) => (
                          <td key={i} className="py-1.5 px-2 min-w-[140px]">
                            <MoneyInput
                              value={(m[row.field] as number) ?? 0}
                              onChange={(v) => updateMes(i, row.field, v)}
                              className="!py-1.5 text-sm min-w-[7.5rem]"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}

        <div className="flex justify-end">
          <Button type="submit" variant="primary" disabled={loading} className="min-w-[220px]">
            {loading ? 'Simulando...' : 'Simular PF vs PJ vs Reforma 2027'}
          </Button>
        </div>
      </form>

      {result && (
        <div id="simulador-imoveis-resultado-print" className="space-y-6 mt-6">
          {/* Cabeçalho do resultado: título + botão Exportar PDF */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Resultado da simulação – Simulador Imobiliário</h2>
              <p className="text-sm text-slate-600">
                Ano <strong>{result.ano}</strong>
                {result.fluxo_caixa?.[0] && (
                  <> · Receita total: <strong>{formatMoney(result.fluxo_caixa[0].receita_total)}</strong></>
                )}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => window.print()}
              className="print:hidden shrink-0 inline-flex items-center gap-2"
              aria-label="Exportar resultado para PDF"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar para PDF
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <h3 className="font-semibold text-slate-700 mb-2">Pessoa Física (Carnê-Leão)</h3>
            <p className="text-2xl font-bold text-brand">
              {formatMoney(result.cenarios.pf.imposto_total)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Alíquota efetiva: {result.cenarios.pf.aliquota_efetiva_anual.toFixed(1)}%
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-700 mb-2">Pessoa Jurídica (Lucro Presumido)</h3>
            <p className="text-2xl font-bold text-slate-800">
              {formatMoney(result.cenarios.pj.imposto_total)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Alíquota efetiva: {result.cenarios.pj.aliquota_efetiva.toFixed(1)}%
            </p>
            {(() => {
              const pres16 = (result.memoria_calculo as { aplicar_presuncao_16_servicos?: boolean } | undefined)?.aplicar_presuncao_16_servicos;
              if (pres16 === undefined) return null;
              return (
                <p className="text-xs text-slate-500 mt-1">
                  {pres16
                    ? 'Elegível 16% (serviços, rec. acum. ≤ R$ 120k por trimestre)'
                    : 'Presunção 32% (locação de imóveis)'}
                </p>
              );
            })()}
            {(result.cenarios.pj.irpj_postergado ?? 0) > 0 && (
              <p className="text-xs text-amber-700 mt-1 font-medium">
                Imposto postergado (diferença ao exceder R$ 120k): {formatMoney(result.cenarios.pj.irpj_postergado ?? 0)}
              </p>
            )}
            {(result.memoria_calculo as { cenario_32_fixo_imposto?: number } | undefined)?.cenario_32_fixo_imposto !== undefined && (
              <p className="text-xs text-slate-500 mt-1">
                Comparativo: se 32% (locação) = {formatMoney((result.memoria_calculo as { cenario_32_fixo_imposto: number }).cenario_32_fixo_imposto)}
              </p>
            )}
            {result.cenarios.pj.trimestres && result.cenarios.pj.trimestres.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                  Detalhamento por trimestre
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="py-1 px-1 text-left">Trim</th>
                        <th className="py-1 px-1 text-right">Receita</th>
                        <th className="py-1 px-1 text-right">B.Cálc. IRPJ</th>
                        <th className="py-1 px-1 text-center">Pres.</th>
                        <th className="py-1 px-1 text-right">IRPJ</th>
                        <th className="py-1 px-1 text-right">CSLL</th>
                        <th className="py-1 px-1 text-right">PIS</th>
                        <th className="py-1 px-1 text-right">COFINS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.cenarios.pj.trimestres.map((t) => (
                        <tr key={t.trimestre} className="border-b border-slate-100">
                          <td className="py-1 px-1">{t.trimestre}º</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.receita)}</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.base_irpj)}</td>
                          <td className="py-1 px-1 text-center">{t.presuncao_irpj_pct ?? 32}%</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.irpj + (t.irpj_adicional ?? 0) + (t.irpj_postergado ?? 0))}</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.csll)}</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.pis)}</td>
                          <td className="py-1 px-1 text-right">{formatMoney(t.cofins)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            )}
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-700 mb-2">Reforma 2027 – Pessoa Física (IR + IBS/CBS)</h3>
            <p className="text-2xl font-bold text-slate-800">
              {formatMoney((result.cenarios.reforma_2027_pf ?? result.cenarios.reforma_2027)?.imposto_total ?? 0)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Alíquota total: {(result.cenarios.reforma_2027_pf ?? result.cenarios.reforma_2027)?.aliquota_efetiva?.toFixed(1) ?? '0'}%
            </p>
            {(() => {
              const refPf = result.cenarios.reforma_2027_pf ?? result.cenarios.reforma_2027;
              const irPf = (refPf as { ir_pf?: number })?.ir_pf;
              if (irPf == null) return null;
              return (
                <p className="text-xs text-slate-500 mt-1">
                  IR (Carnê-Leão): {formatMoney(irPf)} + IBS/CBS: {formatMoney(refPf!.ibs_cbs_liquido)} = total acima.
                </p>
              );
            })()}
            <p className="text-xs text-slate-500 mt-1">
              Em 2027 a PF continua pagando IR sobre a renda; IBS/CBS incide sobre a atividade. Carga total = IR + IBS/CBS.
            </p>
            <p className="text-xs text-amber-800/90 mt-1">
              Se tiver mais de 3 imóveis e receita &gt; R$ 240 mil/ano (ajustado IPCA), a PF pode ser tributada pelo IBS/CBS.
            </p>
          </Card>
          <Card>
            <h3 className="font-semibold text-slate-700 mb-2">Reforma 2027 – Pessoa Jurídica (IBS/CBS)</h3>
            <p className="text-2xl font-bold text-slate-800">
              {formatMoney((result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027)?.imposto_total ?? 0)}
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Alíquota efetiva IBS/CBS: {(result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027)?.aliquota_efetiva?.toFixed(1) ?? '0'}%
              {((result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027) as { redutor_locacao_aplicado_pct?: number })?.redutor_locacao_aplicado_pct === 70 && (
                <span className="text-slate-500"> (com redutor 70% para locação)</span>
              )}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Carga total holding em 2027: IBS/CBS + IRPJ + CSLL, estimada na faixa de 16% a 18%.
            </p>
          </Card>
          </div>

      {result?.cenarios?.pf?.trimestres && result?.cenarios?.pj?.trimestres && (
        <Card className="mt-6 p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Comparativo trimestral – Imposto por regime</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={result.cenarios.pf.trimestres.map((t, i) => {
                  const pjTri = result.cenarios.pj.trimestres?.[i];
                  const pjImposto = pjTri
                    ? (pjTri.irpj ?? 0) + (pjTri.irpj_adicional ?? 0) + (pjTri.irpj_postergado ?? 0) + (pjTri.csll ?? 0) + (pjTri.pis ?? 0) + (pjTri.cofins ?? 0)
                    : 0;
                  return {
                    trimestre: `${t.trimestre}º Tri`,
                    PF: Math.round(t.imposto * 100) / 100,
                    PJ: Math.round(pjImposto * 100) / 100,
                  };
                })}
                margin={{ top: 12, right: 24, left: 24, bottom: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="trimestre" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatMoney(v)} labelFormatter={(l) => l} />
                <Legend />
                <Bar dataKey="PF" name="Pessoa Física (IR)" fill="var(--color-brand, #0ea5e9)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PJ" name="Pessoa Jurídica (IRPJ+CSLL+PIS+COFINS)" fill="#475569" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {result && (
        <Card className="mt-6 p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Memória de cálculo</h3>
          <div className="space-y-4 text-sm">
            <details className="border border-slate-200 rounded-lg overflow-hidden" open>
              <summary className="p-3 bg-slate-50 font-medium cursor-pointer">Pessoa Física (Carnê-Leão)</summary>
              <div className="p-3 pt-0 space-y-1 font-mono text-xs">
                {(() => {
                  const mc = result.memoria_calculo as { detalhe_pf?: { receita_bruta_total: number; despesas_dedutiveis_total: number; base_calculo_total: number; imposto_total: number; aliquota_efetiva_anual: number; trimestres?: Array<{ trimestre: number; receita: number; despesas_dedutiveis: number; base_calculo: number; imposto: number }> } } | undefined;
                  const d = mc?.detalhe_pf;
                  const pf = result.cenarios.pf;
                  if (d) {
                    return (
                      <>
                        <p>Receita bruta: {formatMoney(d.receita_bruta_total)} | Despesas dedutíveis: {formatMoney(d.despesas_dedutiveis_total)} | Base de cálculo: {formatMoney(d.base_calculo_total)}</p>
                        <p>Imposto total: {formatMoney(d.imposto_total)} | Alíquota efetiva anual: {d.aliquota_efetiva_anual.toFixed(1)}%</p>
                        {d.trimestres?.length ? (
                          <table className="w-full mt-2 text-slate-600">
                            <thead><tr><th className="text-left">Trim</th><th className="text-right">Receita</th><th className="text-right">Desp.ded.</th><th className="text-right">Base</th><th className="text-right">IR</th></tr></thead>
                            <tbody>
                              {d.trimestres.map((t) => (
                                <tr key={t.trimestre}><td>{t.trimestre}º</td><td className="text-right">{formatMoney(t.receita)}</td><td className="text-right">{formatMoney(t.despesas_dedutiveis)}</td><td className="text-right">{formatMoney(t.base_calculo)}</td><td className="text-right">{formatMoney(t.imposto)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        ) : null}
                      </>
                    );
                  }
                  return (
                    <>
                      <p>Receita bruta: {formatMoney(pf.receita_bruta_total)} | Despesas dedutíveis: {formatMoney(pf.despesas_dedutiveis_total)} | Base de cálculo: {formatMoney(pf.base_calculo_total)}</p>
                      <p>Imposto total: {formatMoney(pf.imposto_total)} | Alíquota efetiva anual: {pf.aliquota_efetiva_anual.toFixed(1)}%</p>
                      {pf.trimestres?.length ? (
                        <table className="w-full mt-2 text-slate-600">
                          <thead><tr><th className="text-left">Trim</th><th className="text-right">Receita</th><th className="text-right">Desp.ded.</th><th className="text-right">Base</th><th className="text-right">IR</th></tr></thead>
                          <tbody>
                            {pf.trimestres.map((t) => (
                              <tr key={t.trimestre}><td>{t.trimestre}º</td><td className="text-right">{formatMoney(t.receita)}</td><td className="text-right">{formatMoney(t.despesas_dedutiveis)}</td><td className="text-right">{formatMoney(t.base_calculo)}</td><td className="text-right">{formatMoney(t.imposto)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </details>
            <details className="border border-slate-200 rounded-lg overflow-hidden">
              <summary className="p-3 bg-slate-50 font-medium cursor-pointer">Pessoa Jurídica (Lucro Presumido)</summary>
              <div className="p-3 pt-0 space-y-1 font-mono text-xs">
                {(() => {
                  const mc = result.memoria_calculo as { detalhe_pj?: { receita_bruta_total: number; presuncao_irpj_pct: number; base_presumida_irpj: number; base_presumida_csll: number; irpj: number; csll: number; pis: number; cofins: number; imposto_total: number; aplicou_in_2306?: boolean; trimestres?: Array<{ trimestre: number; receita: number; base_irpj: number; irpj: number; csll: number; pis: number; cofins: number }> } } | undefined;
                  const d = mc?.detalhe_pj;
                  const pj = result.cenarios.pj;
                  if (d) {
                    return (
                      <>
                        <p>Receita bruta: {formatMoney(d.receita_bruta_total)} | Presunção IRPJ: {d.presuncao_irpj_pct}% | Base IRPJ: {formatMoney(d.base_presumida_irpj)} | Base CSLL: {formatMoney(d.base_presumida_csll)}</p>
                        <p>IRPJ: {formatMoney(d.irpj)} | CSLL: {formatMoney(d.csll)} | PIS: {formatMoney(d.pis)} | COFINS: {formatMoney(d.cofins)} | Total: {formatMoney(d.imposto_total)}</p>
                        {d.aplicou_in_2306 && <p className="text-amber-700">Aplicou acréscimo IN 2.306/2026 (receita &gt; limites).</p>}
                        {d.trimestres?.length ? (
                          <table className="w-full mt-2 text-slate-600">
                            <thead><tr><th className="text-left">Trim</th><th className="text-right">Receita</th><th className="text-right">Base IRPJ</th><th className="text-right">IRPJ</th><th className="text-right">CSLL</th><th className="text-right">PIS</th><th className="text-right">COFINS</th></tr></thead>
                            <tbody>
                              {d.trimestres.map((t) => (
                                <tr key={t.trimestre}><td>{t.trimestre}º</td><td className="text-right">{formatMoney(t.receita)}</td><td className="text-right">{formatMoney(t.base_irpj)}</td><td className="text-right">{formatMoney(t.irpj)}</td><td className="text-right">{formatMoney(t.csll)}</td><td className="text-right">{formatMoney(t.pis)}</td><td className="text-right">{formatMoney(t.cofins)}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        ) : null}
                      </>
                    );
                  }
                  return (
                    <>
                      <p>Receita bruta: {formatMoney(pj.receita_bruta_total)} | Base IRPJ: {formatMoney(pj.base_presumida_irpj)} | Base CSLL: {formatMoney(pj.base_presumida_csll)}</p>
                      <p>IRPJ: {formatMoney(pj.irpj)} | CSLL: {formatMoney(pj.csll)} | PIS: {formatMoney(pj.pis)} | COFINS: {formatMoney(pj.cofins)} | Total: {formatMoney(pj.imposto_total)}</p>
                      {pj.aplicou_in_2306 && <p className="text-amber-700">Aplicou acréscimo IN 2.306/2026 (receita &gt; limites).</p>}
                      {pj.trimestres?.length ? (
                        <table className="w-full mt-2 text-slate-600">
                          <thead><tr><th className="text-left">Trim</th><th className="text-right">Receita</th><th className="text-right">Base IRPJ</th><th className="text-right">IRPJ</th><th className="text-right">CSLL</th><th className="text-right">PIS</th><th className="text-right">COFINS</th></tr></thead>
                          <tbody>
                            {pj.trimestres.map((t) => (
                              <tr key={t.trimestre}><td>{t.trimestre}º</td><td className="text-right">{formatMoney(t.receita)}</td><td className="text-right">{formatMoney(t.base_irpj)}</td><td className="text-right">{formatMoney(t.irpj)}</td><td className="text-right">{formatMoney(t.csll)}</td><td className="text-right">{formatMoney(t.pis)}</td><td className="text-right">{formatMoney(t.cofins)}</td></tr>
                            ))}
                          </tbody>
                        </table>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </details>
            <details className="border border-slate-200 rounded-lg overflow-hidden">
              <summary className="p-3 bg-slate-50 font-medium cursor-pointer">Reforma 2027 (IBS/CBS)</summary>
              <div className="p-3 pt-0 space-y-1 font-mono text-xs">
                {(() => {
                  const mc = result.memoria_calculo as { detalhe_reforma?: { aliquota_nominal_ibs_cbs: number; redutor_locacao_pct: number; aliquota_efetiva: number; receita_bruta_total: number; custos_operacionais_total: number; creditos_ibs_cbs: number; ibs_cbs_sobre_receita: number; ibs_cbs_liquido: number; imposto_total: number; ir_pf?: number } } | undefined;
                  const d = mc?.detalhe_reforma;
                  const ref = result.cenarios.reforma_2027_pf ?? result.cenarios.reforma_2027;
                  const refWithIr = ref as typeof ref & { ir_pf?: number };
                  if (d) {
                    return (
                      <>
                        {d.ir_pf != null && (
                          <p className="text-slate-700 font-medium">PF em 2027: IR (Carnê-Leão) + IBS/CBS → Total: {formatMoney(d.imposto_total)} (IR: {formatMoney(d.ir_pf)} + IBS/CBS: {formatMoney(d.ibs_cbs_liquido)})</p>
                        )}
                        <p>Alíquota nominal IBS/CBS: {d.aliquota_nominal_ibs_cbs}% | Redutor locação: {d.redutor_locacao_pct}% | Alíquota efetiva total: {d.aliquota_efetiva.toFixed(1)}%</p>
                        <p>Receita: {formatMoney(d.receita_bruta_total)} | Custos oper.: {formatMoney(d.custos_operacionais_total)} | Créditos IBS/CBS: {formatMoney(d.creditos_ibs_cbs)}</p>
                        <p>IBS/CBS sobre receita: {formatMoney(d.ibs_cbs_sobre_receita)} | Líquido: {formatMoney(d.ibs_cbs_liquido)}{d.ir_pf != null ? <> | IR (PF): {formatMoney(d.ir_pf)}</> : null} | Imposto total: {formatMoney(d.imposto_total)}</p>
                      </>
                    );
                  }
                  if (!ref) return null;
                  return (
                    <>
                      {refWithIr?.ir_pf != null && (
                        <p className="text-slate-700 font-medium">PF em 2027: IR (Carnê-Leão) + IBS/CBS → Total: {formatMoney(ref.imposto_total)} (IR: {formatMoney(refWithIr.ir_pf)} + IBS/CBS: {formatMoney(ref.ibs_cbs_liquido)})</p>
                      )}
                      <p>Alíquota nominal: {ref.aliquota_nominal_ibs_cbs}% | Redutor locação: {ref.redutor_locacao_aplicado_pct}% | Alíquota efetiva: {ref.aliquota_efetiva.toFixed(1)}%</p>
                      <p>Receita: {formatMoney(ref.receita_bruta_total)} | Custos oper.: {formatMoney(ref.custos_operacionais_total)} | Créditos IBS/CBS: {formatMoney(ref.creditos_ibs_cbs)}</p>
                      <p>IBS/CBS sobre receita: {formatMoney(ref.ibs_cbs_sobre_receita)} | Líquido: {formatMoney(ref.ibs_cbs_liquido)} | Imposto total: {formatMoney(ref.imposto_total)}</p>
                    </>
                  );
                })()}
              </div>
            </details>
          </div>
        </Card>
      )}

      {result?.embasamentos_legais && result.embasamentos_legais.length > 0 && (
        <Card className="mt-6 p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Embasamentos legais</h3>
          <div className="space-y-4">
            {(['pf', 'pj', 'reforma'] as const).map((cenario) => {
              const itens = result.embasamentos_legais!.filter((e) => e.cenario === cenario);
              if (itens.length === 0) return null;
              const labels = { pf: 'Pessoa Física', pj: 'Pessoa Jurídica', reforma: 'Reforma 2027 (IBS/CBS)' };
              return (
                <div key={cenario}>
                  <p className="font-medium text-slate-700 mb-1">{labels[cenario]}</p>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-0.5">
                    {itens.map((e, i) => (
                      <li key={i}>
                        <strong>{e.norma}</strong>
                        {e.artigo && ` (${e.artigo})`}: {e.descricao}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {result && result.fluxo_caixa?.length > 0 && (() => {
        const fc = result.fluxo_caixa[0]!;
        const impostoPF = result.cenarios.pf.imposto_total;
        const impostoPJ = result.cenarios.pj.imposto_total;
        const pjVence = impostoPJ < impostoPF;
        const economiaReais = Math.abs(impostoPF - impostoPJ);
        const economiaPct = impostoPF > 0 ? (economiaReais / impostoPF) * 100 : 0;
        const reforma = result.cenarios.reforma_2027_pf ?? result.cenarios.reforma_2027;
        const pres16 = (result.memoria_calculo as { aplicar_presuncao_16_servicos?: boolean })?.aplicar_presuncao_16_servicos;
        const acoes: string[] = [];
        if (pjVence && economiaReais > 0) {
          acoes.push(`Recomendação: considerar estruturação em PJ (ME/EPP) para esta atividade — economia estimada de ${formatMoney(economiaReais)} (${economiaPct.toFixed(0)}% sobre a carga em PF).`);
        } else if (!pjVence && economiaReais > 0) {
          acoes.push(`Manter como Pessoa Física é mais vantajoso neste nível de receita — você pagaria ${formatMoney(economiaReais)} a mais em impostos se optasse por PJ.`);
        }
        if (result.break_even) {
          acoes.push(`A partir de aproximadamente ${formatMoney(result.break_even.valor_mensal_break_even)}/mês de receita, PJ tende a ficar mais vantajosa que PF (break-even).`);
        }
        if (reforma) {
          acoes.push(`Reforma 2027: IBS/CBS com redutor 70% para locação → carga efetiva estimada ${reforma.aliquota_efetiva?.toFixed(1) ?? '—'}% (holding total ~16–18% com IRPJ+CSLL). Planeje revisão na vigência da reforma.`);
        }
        acoes.push('Holding em 2027: além do imposto, faz sentido por planejamento sucessório (ITCMD progressivo), proteção patrimonial e tributação na venda (menor que ganho de capital na PF).');
        acoes.push('Contratos de locação firmados até 16/01/2025 podem optar por alíquota de transição 3,65% até o fim do contrato ou 31/12/2028.');
        if ((fc.receita_total ?? 0) >= 240_000) {
          acoes.push('Receita anual ≥ R$ 240 mil: verifique se a PF não ultrapassa o limite para tributação pelo IBS/CBS (reforma).');
        }
        if (pres16 === true) {
          acoes.push(`Elegibilidade 16% (prestação de serviços): cenário considera presunção reduzida de IRPJ/CSLL enquanto receita acumulada respeitar os limites legais.`);
        }
        if (acoes.length === 0) {
          acoes.push('Revise este cenário com seu contador antes de qualquer decisão de estruturação.');
        }
        return (
          <Card className="mt-6 p-5 bg-slate-50 border-brand/20">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Resumo estratégico</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm font-medium text-slate-600">Melhor regime para este cenário</p>
                <p className="text-xl font-bold text-brand mt-0.5">
                  {pjVence ? 'Pessoa Jurídica (Lucro Presumido)' : 'Pessoa Física (Carnê-Leão)'}
                </p>
                {economiaReais > 0 && (
                  <p className="text-sm text-slate-600 mt-1">
                    {pjVence
                      ? `Economia de ${formatMoney(economiaReais)} (${economiaPct.toFixed(0)}% a menos de impostos em relação a PF).`
                      : `Diferença de ${formatMoney(economiaReais)} a menos de impostos em relação a PJ.`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Lucro líquido (o que sobra no bolso)</p>
                <p className="text-sm text-slate-700 mt-1">
                  Como PF: <strong>{formatMoney(fc.lucro_liquido_pf)}</strong> no ano
                </p>
                <p className="text-sm text-slate-700 mt-0.5">
                  Como PJ: <strong>{formatMoney(fc.lucro_liquido_pj)}</strong> no ano
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Após receitas, despesas, custos e impostos.
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Plano de ação</p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700">
                {acoes.map((texto, i) => (
                  <li key={i}>{texto}</li>
                ))}
              </ul>
            </div>
          </Card>
        );
      })()}

      {result?.break_even && (
        <Card className="mt-4 p-4 bg-slate-50">
          <p className="text-sm font-medium text-slate-700">
            Break-even: {formatMoney(result.break_even.valor_mensal_break_even)}/mês
          </p>
          <p className="text-sm text-slate-600">{result.break_even.descricao}</p>
        </Card>
      )}

        </div>
      )}

      {/* Botão flutuante — Exportar PDF (impressão) */}
      {result && (
        <button
          type="button"
          onClick={() => window.print()}
          aria-label="Exportar resultado para PDF"
          title="Exportar para PDF"
          className="print:hidden fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-brand/40"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      )}
    </Layout>
  );
}
