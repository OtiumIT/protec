import type { ReactNode } from 'react';
import { Card } from '../../../shared/components/ui/Card';
import type { PropertyTaxSimulationResponse, SimulateStandaloneMesInput } from '@shared/core';
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

function formatMoney(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function mediaMensalAnual(annual: number) {
  return round2(annual / 12);
}

function computeProjecaoReformaPjLinha(
  receita: number,
  custos: number,
  irpjCsll: number,
  aliquotaCBS: number,
  fatorReducao: number,
  ibsNominal: number,
) {
  const cbsEfetiva = round2(aliquotaCBS * fatorReducao);
  const ibsEfetivo = round2(ibsNominal * fatorReducao);
  const aliqCombinada = cbsEfetiva + ibsEfetivo;
  const ibsCbsBruto = round2((receita * aliqCombinada) / 100);
  const creditos = round2((custos * aliqCombinada) / 100);
  const ibsCbsLiquido = Math.max(0, round2(ibsCbsBruto - creditos));
  const total = round2(ibsCbsLiquido + irpjCsll);
  const aliqEfetiva = receita > 0 ? round2((total / receita) * 100) : 0;
  return {
    cbsExibido: round2((receita * cbsEfetiva) / 100),
    ibsExibido: round2((receita * ibsEfetivo) / 100),
    liquidoExibido: ibsCbsLiquido,
    irpjCsllExibido: irpjCsll,
    totalExibido: total,
    aliqEfetiva,
    ibsCbsLiquido,
    total,
  };
}

type MesFields = Omit<SimulateStandaloneMesInput, 'mes_referencia'>;

const PARAM_ROWS: Array<{ label: string; field: keyof MesFields; section: 'receita' | 'despesa' | 'custo' }> = [
  { label: 'Aluguel tradicional (longo prazo)', field: 'receita_aluguel_tradicional', section: 'receita' },
  { label: 'Aluguel curto prazo (Airbnb, temporada)', field: 'receita_aluguel_curto', section: 'receita' },
  { label: 'Estacionamento / vaga de garagem', field: 'receita_garagem', section: 'receita' },
  { label: 'Outras (lavanderia, depósito, etc.)', field: 'receita_outras', section: 'receita' },
  { label: 'IPTU Anual', field: 'iptu', section: 'despesa' },
  { label: 'Condomínio (pago pelo locador)', field: 'condominio', section: 'despesa' },
  { label: 'Seguro do imóvel Anual', field: 'seguro_imovel', section: 'despesa' },
  { label: 'Juros de financiamento do imóvel', field: 'juros_financiamento', section: 'despesa' },
  { label: 'Manutenção e conservação', field: 'manutencao_conservacao', section: 'despesa' },
  { label: 'Outras despesas dedutíveis', field: 'outras_dedutiveis', section: 'despesa' },
  { label: 'Reformas e melhorias', field: 'reformas_melhorias', section: 'custo' },
  { label: 'Mobiliário e equipamentos', field: 'mobilia_equipamentos', section: 'custo' },
  { label: 'Limpeza e higienização', field: 'limpeza_higienizacao', section: 'custo' },
  { label: 'Comissão imobiliária / corretagem', field: 'comissao_corretagem', section: 'custo' },
  { label: 'Taxa de plataforma (Airbnb, Booking, etc.)', field: 'taxa_plataforma', section: 'custo' },
  { label: 'Camareira', field: 'custo_camareira', section: 'custo' },
  { label: 'Segurança', field: 'custo_seguranca', section: 'custo' },
  { label: 'Material de limpeza', field: 'custo_material_limpeza', section: 'custo' },
  { label: 'Lavanderia e enxoval', field: 'custo_lavanderia_enxoval', section: 'custo' },
  { label: 'Check-in/checkout (terceiros)', field: 'custo_checkin_checkout_terceiros', section: 'custo' },
  { label: 'Taxas de meios de pagamento', field: 'taxas_meios_pagamento', section: 'custo' },
  { label: 'Tarifas bancárias', field: 'tarifas_bancarias', section: 'custo' },
  { label: 'Mão de obra operacional', field: 'mao_de_obra_operacional', section: 'custo' },
  { label: 'Encargos de folha', field: 'encargos_folha', section: 'custo' },
  { label: 'Vacância estimada', field: 'vacancia_estimada', section: 'custo' },
  { label: 'Inadimplência estimada', field: 'inadimplencia_estimada', section: 'custo' },
  { label: 'Outros custos operacionais', field: 'outros_custos', section: 'custo' },
];

export type LocacaoReportContext = {
  meses?: SimulateStandaloneMesInput[];
  quantidadeImoveis?: number;
  aliquotaCBS?: number;
  aliquotaPlenaIBS?: number;
  perfilLocacao?: string;
  receitaResidencialAnual?: number;
  receitaNaoResidencialAnual?: number;
};

export function isLocacaoResult(v: unknown): v is PropertyTaxSimulationResponse {
  if (!v || typeof v !== 'object') return false;
  const r = v as Record<string, unknown>;
  const cenarios = r.cenarios;
  return !!cenarios && typeof cenarios === 'object' && 'pf' in (cenarios as object) && 'pj' in (cenarios as object);
}

function MetricCard({
  title,
  value,
  aliquota,
  children,
}: {
  title: string;
  value: number;
  aliquota: string;
  children?: ReactNode;
}) {
  return (
    <Card>
      <h3 className="font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-2xl font-bold text-slate-800">{formatMoney(value)}</p>
      <p className="text-sm text-slate-500 mt-1 tabular-nums">
        <span className="text-slate-400">Média mensal:</span>{' '}
        <span className="font-medium text-slate-600">{formatMoney(mediaMensalAnual(value))}</span>
        <span className="text-slate-400 text-xs ml-1">(anual ÷ 12)</span>
      </p>
      <p className="text-sm text-slate-600 mt-1">Alíquota efetiva: {aliquota}</p>
      {children}
    </Card>
  );
}

export function LocacaoResultadoReport({
  result,
  context,
}: {
  result: PropertyTaxSimulationResponse;
  context?: LocacaoReportContext;
}) {
  const pf = result.cenarios.pf;
  const pj = result.cenarios.pj;
  const dirpf = result.cenarios.pf_dirpf_simplificado;
  const refPf = result.cenarios.reforma_2027_pf ?? result.cenarios.reforma_2027;
  const refPj = result.cenarios.reforma_2027_pj ?? result.cenarios.reforma_2027;
  const meses = context?.meses ?? [];
  const qtdImoveis = context?.quantidadeImoveis ?? 1;
  const aliquotaCBS = context?.aliquotaCBS ?? 9;
  const aliquotaPlenaIBS = context?.aliquotaPlenaIBS ?? 19;
  const perfil = context?.perfilLocacao ?? 'residencial_comum';

  const LIMITE_RECEITA = 240_000;
  const LIMITE_IMOVEIS = 3;
  const receitaPf = refPf?.receita_bruta_total ?? pf.receita_bruta_total ?? 0;
  const ehContribuinteIbsCbs = qtdImoveis > LIMITE_IMOVEIS && receitaPf > LIMITE_RECEITA;

  const irpjCsll = (pj.irpj ?? 0) + (pj.irpj_adicional ?? 0) + (pj.irpj_postergado ?? 0) + (pj.csll ?? 0);
  const receitaCardBase = pf.receita_bruta_total;
  const recRes = context?.receitaResidencialAnual ?? 0;
  const recCom = context?.receitaNaoResidencialAnual ?? 0;
  const receitaProj =
    recRes > 0 || recCom > 0 ? recRes + recCom : receitaCardBase;
  const custos = refPj?.custos_operacionais_total ?? 0;
  const aliqNominalRef = (refPj as { aliquota_nominal_ibs_cbs?: number } | undefined)?.aliquota_nominal_ibs_cbs ?? 26.5;
  const debitoRefBruto =
    (refPj as { ibs_cbs_antes_redutor_social?: number } | undefined)?.ibs_cbs_antes_redutor_social
    ?? (refPj as { ibs_cbs_sobre_receita?: number } | undefined)?.ibs_cbs_sobre_receita
    ?? 0;
  const fatorReducao =
    receitaProj > 0 && aliqNominalRef > 0
      ? debitoRefBruto / receitaProj / (aliqNominalRef / 100)
      : (100 - (perfil === 'hospedagem_temporada' ? 40 : 70)) / 100;
  const linha2033 = computeProjecaoReformaPjLinha(
    receitaProj, custos, irpjCsll, aliquotaCBS, fatorReducao, aliquotaPlenaIBS,
  );

  const totalAnual = (field: keyof MesFields) =>
    meses.reduce((s, m) => s + (Number(m[field]) || 0), 0);

  const renderParamSection = (title: string, section: 'receita' | 'despesa' | 'custo', color: string) => {
    const visible = PARAM_ROWS.filter((r) => r.section === section && totalAnual(r.field) > 0);
    if (visible.length === 0) return null;
    const total = visible.reduce((s, r) => s + totalAnual(r.field), 0);
    return (
      <div key={title}>
        <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${color}`}>{title}</p>
        <table className="w-full text-xs border-collapse">
          <tbody>
            {visible.map((r) => (
              <tr key={r.field} className="border-b border-slate-100">
                <td className="py-0.5 pr-2 text-slate-600 w-[65%]">{r.label}</td>
                <td className="py-0.5 text-right font-mono text-slate-800">{formatMoney(totalAnual(r.field))}</td>
              </tr>
            ))}
            <tr className="border-t border-slate-300">
              <td className="py-0.5 pr-2 font-semibold text-slate-700">Total</td>
              <td className="py-0.5 text-right font-mono font-semibold text-slate-900">{formatMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const hasParams = meses.length > 0 && PARAM_ROWS.some((r) => totalAnual(r.field) > 0);
  const hasCustos = PARAM_ROWS.some((r) => r.section === 'custo' && totalAnual(r.field) > 0);

  const melhorAtual = pf.imposto_total < pj.imposto_total ? 'PF' : 'PJ';
  const refPjImposto = linha2033.total;
  const pres16 = (result.memoria_calculo as { aplicar_presuncao_16_servicos?: boolean } | undefined)?.aplicar_presuncao_16_servicos;

  const anosProj = [
    { ano: '2027/2028', ibsNominal: 0.1 },
    { ano: '2029', ibsNominal: aliquotaPlenaIBS * 0.1 },
    { ano: '2030', ibsNominal: aliquotaPlenaIBS * 0.2 },
    { ano: '2031', ibsNominal: aliquotaPlenaIBS * 0.3 },
    { ano: '2032', ibsNominal: aliquotaPlenaIBS * 0.4 },
    { ano: '2033', ibsNominal: aliquotaPlenaIBS * 1.0 },
  ] as const;

  return (
    <div className="space-y-6">
      {hasParams && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">
            Parâmetros utilizados — Ano {result.ano}
          </h3>
          <div className={`grid gap-4 ${hasCustos ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {renderParamSection('Receitas', 'receita', 'text-emerald-700')}
            {renderParamSection('Despesas dedutíveis (PF)', 'despesa', 'text-sky-700')}
            {hasCustos && renderParamSection('Custos operacionais', 'custo', 'text-amber-700')}
          </div>
        </section>
      )}

      <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-1">Resultado da simulação – Simulador Imobiliário</h2>
        <p className="text-sm text-slate-600">
          Ano <strong>{result.ano}</strong>
          {result.fluxo_caixa?.[0] && (
            <> · Receita PF/PJ (Carnê-Leão / Lucro Presumido): <strong>{formatMoney(result.fluxo_caixa[0].receita_total)}</strong></>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="Pessoa Física (Carnê-Leão)"
          value={pf.imposto_total}
          aliquota={`${pf.aliquota_efetiva_anual.toFixed(2)}%`}
        />

        {dirpf && (
          <Card className="border-dashed border-slate-300">
            <h3 className="font-semibold text-slate-700 mb-1">PF — DIRPF com desconto simplificado</h3>
            <p className="text-xs text-slate-500 mb-2">
              Estimativa de ajuste anual (opção pelo modelo simplificado). Não substitui o carnê-leão mensal.
            </p>
            <p className="text-2xl font-bold text-slate-800">{formatMoney(dirpf.imposto_total)}</p>
            <p className="text-sm text-slate-600 mt-1">Alíquota efetiva: {dirpf.aliquota_efetiva_anual.toFixed(2)}%</p>
          </Card>
        )}

        <Card>
          <h3 className="font-semibold text-slate-700 mb-2">Pessoa Jurídica (Lucro Presumido)</h3>
          <p className="text-2xl font-bold text-slate-800">{formatMoney(pj.imposto_total)}</p>
          <p className="text-sm text-slate-500 mt-1 tabular-nums">
            <span className="text-slate-400">Média mensal:</span>{' '}
            <span className="font-medium text-slate-600">{formatMoney(mediaMensalAnual(pj.imposto_total))}</span>
            <span className="text-slate-400 text-xs ml-1">(anual ÷ 12)</span>
          </p>
          <p className="text-sm text-slate-600 mt-1">Alíquota efetiva: {pj.aliquota_efetiva.toFixed(2)}%</p>
          {pres16 !== undefined && (
            <p className="text-xs text-slate-500 mt-1">
              {pres16
                ? 'Presunção 16% – Receita anual ≤ R$ 120k (Lei 9.249/95, Art. 15, § 7º – IN RFB 1700/2017, art. 33, § 7º)'
                : 'Presunção 32% (locação de imóveis – Lei 9.249/95, Art. 15 – IN RFB 1700/2017, art. 33, § 7º)'}
            </p>
          )}
          {pj.dividendos && (
            <div className="mt-3 p-3 bg-violet-50 rounded-lg border border-violet-200">
              <p className="text-xs font-semibold text-violet-800">Custo de distribuição ao sócio (IRRF sobre dividendos)</p>
              <p className="text-[10px] text-violet-700 mt-1">Lei 15.270/2025 — IRRF 10% sobre dividendos acima de R$ 50 mil/mês</p>
              <p className="text-xs text-slate-700 mt-2">
                Lucro distribuível: <span className="font-semibold">{formatMoney(pj.dividendos.lucro_distribuivel)}</span>
              </p>
              {pj.dividendos.irrf_total > 0 ? (
                <p className="text-xs text-red-700 font-medium">
                  IRRF: {formatMoney(pj.dividendos.irrf_total)} → Líquido ao sócio: {formatMoney(pj.dividendos.lucro_liquido_socio)}
                </p>
              ) : (
                <p className="text-xs text-emerald-700">Sem IRRF — distribuição mensal ≤ R$ 50 mil</p>
              )}
              {pj.dividendos.cenarios_parcelamento && pj.dividendos.cenarios_parcelamento.length > 1 && (
                <div className="mt-2 border-t border-violet-200 pt-2">
                  <p className="text-[10px] text-violet-600 font-medium mb-1">Cenários de parcelamento da distribuição:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {pj.dividendos.cenarios_parcelamento.map((c) => (
                      <div
                        key={c.parcelas}
                        className={`text-center p-1.5 rounded text-[10px] ${c.parcela_excede_threshold ? 'bg-red-50 border border-red-200' : 'bg-emerald-50 border border-emerald-200'}`}
                      >
                        <p className="font-medium text-slate-700">{c.parcelas}× de {formatMoney(c.valor_parcela)}</p>
                        <p className={c.parcela_excede_threshold ? 'text-red-600' : 'text-emerald-600'}>IRRF: {formatMoney(c.irrf)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-2">Reforma LC 214/2025 – Pessoa Física (IR + IBS/CBS)</h3>
          <p className="text-2xl font-bold text-emerald-700">{formatMoney(ehContribuinteIbsCbs ? pf.imposto_total + (refPf?.ibs_cbs_liquido ?? 0) : pf.imposto_total)}</p>
          <p className="text-sm text-slate-500 mt-1 tabular-nums">
            <span className="text-slate-400">Média mensal:</span>{' '}
            <span className="font-medium text-slate-600">
              {formatMoney(mediaMensalAnual(ehContribuinteIbsCbs ? pf.imposto_total + (refPf?.ibs_cbs_liquido ?? 0) : pf.imposto_total))}
            </span>
            <span className="text-slate-400 text-xs ml-1">(anual ÷ 12)</span>
          </p>
          <p className="text-sm text-slate-600 mt-1">Alíquota efetiva: {pf.aliquota_efetiva_anual.toFixed(2)}%</p>
          {!ehContribuinteIbsCbs && (
            <>
              <div className="mt-2 p-2 bg-emerald-50 rounded border border-emerald-200">
                <p className="text-sm text-emerald-800 font-medium">Não contribuinte de IBS/CBS</p>
                <p className="text-xs text-emerald-700 mt-1">
                  {qtdImoveis <= LIMITE_IMOVEIS
                    ? `Com ${qtdImoveis} imóvel(is), a PF não atinge o critério de mais de ${LIMITE_IMOVEIS} imóveis exigido pelo regulamento — independentemente da receita anual de ${formatMoney(receitaPf)}.`
                    : `Com ${qtdImoveis} imóvel(is), a receita de ${formatMoney(receitaPf)} está abaixo do limite de R$ 240.000.`}
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-2">A PF continua pagando apenas o IR (Carnê-Leão) sobre a renda de locação.</p>
            </>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-700 mb-2">Reforma LC 214/2025 – Pessoa Jurídica (IBS/CBS + IRPJ + CSLL)</h3>
          <p className="text-2xl font-bold text-slate-800">{formatMoney(linha2033.total)}</p>
          <p className="text-sm text-slate-500 mt-1 tabular-nums">
            <span className="text-slate-400">Média mensal:</span>{' '}
            <span className="font-medium text-slate-600">{formatMoney(mediaMensalAnual(linha2033.total))}</span>
            <span className="text-slate-400 text-xs ml-1">(anual ÷ 12)</span>
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Alíquota efetiva total: {linha2033.aliqEfetiva.toFixed(2)}%
            <span className="text-slate-500"> (com redutor {(refPj as { redutor_locacao_aplicado_pct?: number } | undefined)?.redutor_locacao_aplicado_pct ?? 70}% para locação)</span>
          </p>
          <p className="text-xs text-slate-500 mt-1">
            IBS/CBS: {formatMoney(linha2033.ibsCbsLiquido)} + IRPJ+CSLL: {formatMoney(irpjCsll)} (IRPJ inclui adicional e postergado, se houver — mesma base da coluna IRPJ+CSLL na projeção 2027–2033) = total acima.
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Valores no regime pleno (2033) — equivalem à última linha do quadro Projeção 2027–2033.
          </p>
        </Card>
      </div>

      <Card className="p-4 border-violet-200/50 bg-violet-50/10">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Reforma LC 214/2025 – Pessoa Jurídica (IBS/CBS + IRPJ + CSLL) – Projeção 2027-2033
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Demonstração da tributação ano a ano considerando a transição gradual do IBS (0,1% fixo em 2027/2028, progressivo de 2029 a 2033).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-2 px-3 text-left font-medium text-slate-600">Ano</th>
                <th className="py-2 px-3 text-right font-medium text-slate-600">CBS</th>
                <th className="py-2 px-3 text-right font-medium text-slate-600">IBS</th>
                <th className="py-2 px-3 text-right font-medium text-slate-600">IBS/CBS Líq.</th>
                <th className="py-2 px-3 text-right font-medium text-slate-600">IRPJ+CSLL</th>
                <th className="py-2 px-3 text-right font-medium text-slate-700">Total</th>
                <th className="py-2 px-3 text-right font-medium text-slate-600">Alíq. Efet.</th>
              </tr>
            </thead>
            <tbody>
              {anosProj.map((item) => {
                const L = computeProjecaoReformaPjLinha(
                  receitaProj, custos, irpjCsll, aliquotaCBS, fatorReducao, item.ibsNominal,
                );
                return (
                  <tr key={item.ano} className="border-b border-slate-100">
                    <td className="py-2 px-3 font-medium text-slate-700">{item.ano}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{formatMoney(L.cbsExibido)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{formatMoney(L.ibsExibido)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{formatMoney(L.liquidoExibido)}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{formatMoney(L.irpjCsllExibido)}</td>
                    <td className="py-2 px-3 text-right font-semibold text-brand">{formatMoney(L.totalExibido)}</td>
                    <td className="py-2 px-3 text-right text-slate-500">{L.aliqEfetiva.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          CBS com redutor da alíquota {perfil === 'hospedagem_temporada' ? '40%' : '70%'} · IBS progressivo conforme cronograma LC 214/2025 · IRPJ/CSLL sobre lucro presumido (presunção 16% ou 32%, conforme receita anual).
        </p>
      </Card>

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Comparativo de Cenários</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-2 px-3 text-left font-medium text-slate-600">Métrica</th>
                <th className="py-2 px-3 text-right font-medium text-slate-600">
                  PF (Carnê-Leão) {melhorAtual === 'PF' && <span className="text-emerald-600 text-xs">✓</span>}
                </th>
                <th className="py-2 px-3 text-right font-medium text-slate-600">
                  PJ (L. Presumido) {melhorAtual === 'PJ' && <span className="text-emerald-600 text-xs">✓</span>}
                </th>
                <th className="py-2 px-3 text-right font-medium text-slate-600">Reforma LC 214/2025 PF</th>
                <th className="py-2 px-3 text-right font-medium text-slate-600">Reforma LC 214/2025 PJ</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 px-3 text-slate-700">Imposto total</td>
                <td className={`py-2 px-3 text-right font-semibold ${melhorAtual === 'PF' ? 'text-emerald-700' : 'text-slate-800'}`}>{formatMoney(pf.imposto_total)}</td>
                <td className={`py-2 px-3 text-right font-semibold ${melhorAtual === 'PJ' ? 'text-emerald-700' : 'text-slate-800'}`}>{formatMoney(pj.imposto_total)}</td>
                <td className="py-2 px-3 text-right text-slate-800">{ehContribuinteIbsCbs ? formatMoney(pf.imposto_total + (refPf?.ibs_cbs_liquido ?? 0)) : '—'}</td>
                <td className="py-2 px-3 text-right font-semibold text-slate-800">{formatMoney(refPjImposto)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 px-3 text-slate-700">Alíquota efetiva</td>
                <td className="py-2 px-3 text-right text-slate-600">{pf.aliquota_efetiva_anual.toFixed(2)}%</td>
                <td className="py-2 px-3 text-right text-slate-600">{pj.aliquota_efetiva.toFixed(2)}%</td>
                <td className="py-2 px-3 text-right text-slate-600">
                  {ehContribuinteIbsCbs && pf.receita_bruta_total > 0
                    ? `${(((pf.imposto_total + (refPf?.ibs_cbs_liquido ?? 0)) / pf.receita_bruta_total) * 100).toFixed(2)}%`
                    : '—'}
                </td>
                <td className="py-2 px-3 text-right text-slate-600">{receitaProj > 0 ? ((refPjImposto / receitaProj) * 100).toFixed(2) : '0.00'}%</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 px-3 text-slate-700">Receita bruta</td>
                <td className="py-2 px-3 text-right text-slate-600" colSpan={4}>{formatMoney(pf.receita_bruta_total)}</td>
              </tr>
              <tr>
                <td className="py-2 px-3 text-slate-700">Diferença vs. melhor atual</td>
                <td className="py-2 px-3 text-right text-slate-500">{melhorAtual === 'PF' ? '—' : `+${formatMoney(pf.imposto_total - pj.imposto_total)}`}</td>
                <td className="py-2 px-3 text-right text-slate-500">{melhorAtual === 'PJ' ? '—' : `+${formatMoney(pj.imposto_total - pf.imposto_total)}`}</td>
                <td className="py-2 px-3 text-right text-slate-500">—</td>
                <td className="py-2 px-3 text-right text-slate-500">
                  {refPjImposto <= Math.min(pf.imposto_total, pj.imposto_total)
                    ? `−${formatMoney(Math.min(pf.imposto_total, pj.imposto_total) - refPjImposto)}`
                    : `+${formatMoney(refPjImposto - Math.min(pf.imposto_total, pj.imposto_total))}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <div className="flex items-center gap-1"><span className="text-emerald-600">✓</span> Melhor atual (sem reforma)</div>
          <div className="flex items-center gap-1"><span className="text-amber-500">★</span> Melhor absoluto</div>
          {!ehContribuinteIbsCbs && <div>Reforma PF: — = não se aplica</div>}
        </div>
      </Card>

      {result.projecao_reforma && result.projecao_reforma.length > 0 && (
        <Card className="p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-1">Projeção Reforma Tributária — 2026 a 2034</h3>
          <p className="text-xs text-slate-500 mb-4">Comparativo da carga tributária PJ (regime atual vs IBS/CBS) ao longo da transição LC 214/2025</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-2 font-semibold text-slate-500">Ano</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-500">IBS %</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-500">ICMS/ISS %</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-500">PJ Reforma</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-500">PJ Atual</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-500">PF</th>
                  <th className="text-right py-2 px-2 font-semibold text-slate-500">Alíq. efetiva</th>
                </tr>
              </thead>
              <tbody>
                {result.projecao_reforma.map((p) => (
                  <tr key={p.ano} className="border-b border-slate-100">
                    <td className="py-1.5 px-2 font-medium text-slate-700">{p.ano}</td>
                    <td className="py-1.5 px-2 text-right text-slate-600">{p.ibs_pct}%</td>
                    <td className="py-1.5 px-2 text-right text-slate-600">{p.icms_iss_pct}%</td>
                    <td className={`py-1.5 px-2 text-right font-medium ${p.imposto_pj_reforma < p.imposto_pj_atual ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatMoney(p.imposto_pj_reforma)}
                    </td>
                    <td className="py-1.5 px-2 text-right text-slate-600">{formatMoney(p.imposto_pj_atual)}</td>
                    <td className="py-1.5 px-2 text-right text-slate-600">{formatMoney(p.imposto_pf)}</td>
                    <td className="py-1.5 px-2 text-right text-slate-600">{p.aliquota_efetiva_reforma.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {result.embasamentos_legais && result.embasamentos_legais.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Embasamentos legais</h3>
          <div className="space-y-4">
            {(['pf', 'pj', 'reforma'] as const).map((cenario) => {
              const itens = result.embasamentos_legais!.filter((e) => e.cenario === cenario);
              if (itens.length === 0) return null;
              const labels = { pf: 'Pessoa Física', pj: 'Pessoa Jurídica', reforma: 'Reforma LC 214/2025 (IBS/CBS)' };
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

      {pf.trimestres && pj.trimestres && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Comparativo trimestral – Imposto por regime</h3>
          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pf.trimestres.map((t, i) => {
                  const pjTri = pj.trimestres?.[i];
                  const pjImposto = pjTri
                    ? (pjTri.irpj ?? 0) + (pjTri.irpj_adicional ?? 0) + (pjTri.irpj_postergado ?? 0) + (pjTri.csll ?? 0) + (pjTri.pis ?? 0) + (pjTri.cofins ?? 0)
                    : 0;
                  return { trimestre: `${t.trimestre}º Tri`, PF: round2(t.imposto), PJ: round2(pjImposto) };
                })}
                margin={{ top: 8, right: 12, left: 8, bottom: 52 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="trimestre" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatMoney(v)} />
                <Legend align="left" verticalAlign="bottom" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="PF" name="PF — Carnê-Leão (IR)" fill="var(--color-brand, #0ea5e9)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="PJ" name="PJ (IRPJ+CSLL+PIS+COFINS)" fill="#475569" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">Memória de cálculo</h3>
        {result.indices_lc214 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 text-xs text-slate-700 mb-4">
            <p className="font-semibold text-slate-800 mb-1">LC 214 / IPCA (valores usados nesta simulação)</p>
            <p>
              Origem dos parâmetros:{' '}
              <strong>
                {result.indices_lc214.parametros_origem === 'calculado'
                  ? 'automático (IPCA)'
                  : result.indices_lc214.parametros_origem === 'manual_completo'
                    ? 'entrada manual (completa)'
                    : 'misto (manual + automático)'}
              </strong>
            </p>
            <p>
              Referência IPCA: {result.indices_lc214.mes_referencia_fim} · Fator acumulado:{' '}
              {result.indices_lc214.fator_acumulado_desde_publicacao} · Fonte:{' '}
              {result.indices_lc214.ipca_fonte === 'bcb_online' ? 'BCB online' : result.indices_lc214.ipca_fonte === 'cache' ? 'cache API' : 'contingência'}
            </p>
            <p>
              Redutor social mensal efetivo: {formatMoney(result.indices_lc214.redutor_social_mensal_efetivo)} · Tetos PF:{' '}
              {formatMoney(result.indices_lc214.limite_receita_pf_contribuinte)} /{' '}
              {formatMoney(result.indices_lc214.limite_receita_pf_absoluto)}
            </p>
          </div>
        )}
        <div className="space-y-3 text-xs font-mono">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <p className="p-3 bg-slate-50 font-medium font-sans">Pessoa Física (Carnê-Leão)</p>
            <div className="p-3 pt-0 space-y-1">
              <p>Receita bruta: {formatMoney(pf.receita_bruta_total)} | Despesas dedutíveis: {formatMoney(pf.despesas_dedutiveis_total)} | Base de cálculo: {formatMoney(pf.base_calculo_total)}</p>
              <p>Imposto total: {formatMoney(pf.imposto_total)} | Alíquota efetiva anual: {pf.aliquota_efetiva_anual.toFixed(2)}%</p>
              {pf.trimestres?.length ? (
                <table className="w-full mt-2 text-slate-600">
                  <thead>
                    <tr>
                      <th className="text-left">Trim</th>
                      <th className="text-right">Receita</th>
                      <th className="text-right">Desp.ded.</th>
                      <th className="text-right">Base</th>
                      <th className="text-right">IR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pf.trimestres.map((t) => (
                      <tr key={t.trimestre}>
                        <td>{t.trimestre}º</td>
                        <td className="text-right">{formatMoney(t.receita)}</td>
                        <td className="text-right">{formatMoney(t.despesas_dedutiveis)}</td>
                        <td className="text-right">{formatMoney(t.base_calculo)}</td>
                        <td className="text-right">{formatMoney(t.imposto)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {result.fluxo_caixa?.[0] && (() => {
        const fc = result.fluxo_caixa[0];
        const impostoPF = pf.imposto_total;
        const impostoPJ = pj.imposto_total;
        const pjVence = impostoPJ < impostoPF;
        const economiaReais = Math.abs(impostoPF - impostoPJ);
        const acoes: string[] = [];
        if (pjVence && economiaReais > 0) {
          acoes.push(`Recomendação: considerar estruturação em PJ para esta atividade — economia estimada de ${formatMoney(economiaReais)}.`);
        } else if (!pjVence && economiaReais > 0) {
          acoes.push(`Manter como Pessoa Física é mais vantajoso neste nível de receita — você pagaria ${formatMoney(economiaReais)} a mais em impostos se optasse por PJ.`);
        }
        if (refPj?.aliquota_efetiva != null) {
          acoes.push(`Reforma LC 214/2025: IBS/CBS + IRPJ + CSLL (holding total ${((refPjImposto / (receitaProj || 1)) * 100).toFixed(2)}%). Planeje revisão na vigência da reforma.`);
        }
        acoes.push('Holding em 2027: além do imposto, faz sentido por planejamento sucessório (ITCMD progressivo), proteção patrimonial e tributação na venda (menor que ganho de capital na PF).');
        acoes.push('Contratos de locação firmados até 16/01/2025 podem optar por alíquota de transição 3,65% até o fim do contrato ou 31/12/2028.');
        if (pres16 === true) {
          acoes.push('Elegibilidade 16% (prestação de serviços): cenário considera presunção reduzida de IRPJ/CSLL enquanto receita acumulada respeitar os limites legais.');
        }
        return (
          <Card className="p-5 bg-slate-50 border-brand/20">
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
                      ? `Economia de ${formatMoney(economiaReais)} a menos de impostos em relação a PF.`
                      : `Diferença de ${formatMoney(economiaReais)} a menos de impostos em relação a PJ.`}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">Lucro líquido (o que sobra no bolso)</p>
                <p className="text-sm text-slate-700 mt-1">Como PF: <strong>{formatMoney(fc.lucro_liquido_pf)}</strong> no ano</p>
                <p className="text-sm text-slate-700 mt-0.5">Como PJ: <strong>{formatMoney(fc.lucro_liquido_pj)}</strong> no ano</p>
                <p className="text-xs text-slate-500 mt-1">Após receitas, despesas, custos e impostos.</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Plano de ação</p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-slate-700">
              {acoes.map((texto, i) => <li key={i}>{texto}</li>)}
            </ul>
          </Card>
        );
      })()}

      {result.analise_custos && (
        <Card className="p-4 bg-slate-50">
          <h3 className="text-base font-semibold text-slate-800 mb-2">Análise de custos e créditos</h3>
          <p className="text-sm text-slate-600">
            Créditos IBS/CBS: potencial {formatMoney(result.analise_custos.creditos_ibs_cbs.total_potencial)} | aproveitado {formatMoney(result.analise_custos.creditos_ibs_cbs.total_aproveitado)} | não aproveitado {formatMoney(result.analise_custos.creditos_ibs_cbs.nao_aproveitado)}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            Margem operacional: antes dos tributos {result.analise_custos.indicadores.margem_operacional_antes_tributos.toFixed(2)}% | após tributos (PJ) {result.analise_custos.indicadores.margem_operacional_apos_tributos_pj.toFixed(2)}%
          </p>
        </Card>
      )}
    </div>
  );
}
