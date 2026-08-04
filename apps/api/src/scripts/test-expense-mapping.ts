import assert from 'node:assert/strict';
import { runExpenseMapping } from '../modules/mapeamento-despesas-pj/classification-engine';
import { RULES_VERSION } from '../modules/mapeamento-despesas-pj/catalog';
import type { DiagnosisContext, ExpenseItemAnswer } from '@shared/core';

function ctx(partial: Partial<DiagnosisContext> = {}): DiagnosisContext {
  return {
    client_id: '00000000-0000-0000-0000-000000000000',
    title: null,
    reference_year: 2026,
    activity: null,
    tax_regime: 'lucro_presumido',
    ibs_cbs_treatment: 'regime_regular',
    objective: null,
    reviewer_user_id: null,
    ...partial,
  };
}

function item(partial: Partial<ExpenseItemAnswer>): ExpenseItemAnswer {
  return {
    category_key: 'outras',
    label: 'Item',
    monthly_amount: 100,
    current_payer: 'pf',
    vinculo_atividade: 'parcial',
    business_use_pct: 0,
    beneficiario: 'empresa',
    documento_pj: 'nao',
    possui_evidencia: false,
    is_tributo_ou_principal: false,
    notes: null,
    ...partial,
  };
}

function run(): void {
  // 1) Despesa clara e documentada → potencial + crédito potencial
  const r1 = runExpenseMapping({
    context: ctx(),
    items: [item({ category_key: 'tecnologia', label: 'Software de gestão', monthly_amount: 500, vinculo_atividade: 'sim', business_use_pct: 100, documento_pj: 'sim', possui_evidencia: true })],
  });
  assert.equal(r1.items[0].classification, 'potencial', '1: deve ser potencial');
  assert.equal(r1.items[0].credit_lens, 'potential', '1: crédito potencial');
  assert.equal(r1.items[0].annual_amount, 6000, '1: anualização = mensal*12');
  assert.equal(r1.totals.potencial_anual, 6000, '1: total potencial');

  // 2) IPVA (tributo/principal) → não recomendado, sem crédito automático
  const r2 = runExpenseMapping({
    context: ctx(),
    items: [item({ category_key: 'veiculos', label: 'IPVA', monthly_amount: 300, vinculo_atividade: 'sim', business_use_pct: 100, documento_pj: 'sim', is_tributo_ou_principal: true })],
  });
  assert.equal(r2.items[0].classification, 'nao_recomendado', '2: tributo não recomendado');
  assert.equal(r2.items[0].credit_lens, 'none', '2: sem crédito');

  // 3) Benefício a familiar → evitar / não recomendado
  const r3 = runExpenseMapping({
    context: ctx(),
    items: [item({ label: 'Plano familiar', monthly_amount: 400, vinculo_atividade: 'parcial', beneficiario: 'familiar', documento_pj: 'sim' })],
  });
  assert.equal(r3.items[0].pf_pj_lens, 'avoid', '3: lente PF->PJ evitar');
  assert.equal(r3.items[0].classification, 'nao_recomendado', '3: não recomendado');

  // 4) Regime que não avalia crédito → credit_lens 'na' e alerta
  const r4 = runExpenseMapping({
    context: ctx({ tax_regime: 'simples_nacional', ibs_cbs_treatment: 'simples_por_dentro' }),
    items: [item({ label: 'Internet', monthly_amount: 200, vinculo_atividade: 'sim', business_use_pct: 100, documento_pj: 'sim', possui_evidencia: true })],
  });
  assert.equal(r4.items[0].credit_lens, 'na', '4: crédito N/A no Simples por dentro');
  assert.ok(r4.alertas.some((a) => a.toLowerCase().includes('regime')), '4: alerta de regime');

  // 5) Uso misto relevante → rateio
  const r5 = runExpenseMapping({
    context: ctx(),
    items: [item({ category_key: 'veiculos', label: 'Combustível', monthly_amount: 950, vinculo_atividade: 'sim', business_use_pct: 40, documento_pj: 'sim' })],
  });
  assert.equal(r5.items[0].classification, 'rateio', '5: uso misto vira rateio');

  // 6) Sem vínculo → não recomendado
  const r6 = runExpenseMapping({
    context: ctx(),
    items: [item({ label: 'Assinatura pessoal', monthly_amount: 100, vinculo_atividade: 'nao' })],
  });
  assert.equal(r6.items[0].classification, 'nao_recomendado', '6: sem vínculo');

  // 7) Totais somam por classificação
  const r7 = runExpenseMapping({
    context: ctx(),
    items: [
      item({ label: 'A', monthly_amount: 100, vinculo_atividade: 'sim', business_use_pct: 100, documento_pj: 'sim' }),
      item({ label: 'B', monthly_amount: 100, vinculo_atividade: 'nao' }),
    ],
  });
  assert.equal(r7.totals.total_analisado_anual, 2400, '7: total analisado');
  assert.equal(r7.totals.itens, 2, '7: contagem de itens');
  assert.equal(r7.rules_version, RULES_VERSION, '7: versão de regras registrada');

  console.log('✅ test-expense-mapping: todas as asserções passaram');
}

run();
