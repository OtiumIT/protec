import type {
  ExpenseItemAnswer,
  ClassifiedExpenseItem,
  ExpenseMappingResult,
  DiagnosisContext,
} from '@shared/core';
import { RULES_VERSION } from './catalog';

/**
 * Motor de classificação (SERVIDOR). Recebe as despesas respondidas + contexto
 * e produz a classificação, as duas lentes (PF->PJ e IBS/CBS) e os totais.
 *
 * Princípios (não negociáveis):
 * - Nunca promete crédito automático.
 * - Uso pessoal / benefício ao sócio é tratado como risco, não oportunidade.
 * - IBS/CBS só é avaliado quando o regime informado permite (segunda lente).
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

const DISCLAIMER =
  'Diagnóstico orientativo baseado nas informações fornecidas. Não constitui parecer jurídico, ' +
  'contábil ou fiscal, não confirma dedutibilidade e não autoriza automaticamente a apropriação de ' +
  'créditos de IBS/CBS. A aplicação depende do regime efetivo, da operação, dos documentos e da ' +
  'validação do profissional responsável.';

/** Fundamentos citados por categoria (apenas referências; não é parecer). */
const FOUNDATIONS: Record<string, string[]> = {
  veiculos: ['LC 214/2025, art. 57 (uso e consumo pessoal)', 'LC 214/2025, art. 47 (não cumulatividade)'],
  imovel: ['LC 214/2025, art. 57, §1º (imóvel residencial)', 'LC 214/2025, art. 47'],
  tecnologia: ['LC 214/2025, art. 47', 'Decreto 12.955/2026 (documento idôneo)'],
  viagens: ['LC 214/2025, art. 47', 'LC 214/2025, art. 57'],
  servicos: ['LC 214/2025, art. 47'],
  capacitacao: ['LC 214/2025, art. 47'],
  saude_beneficios: ['LC 214/2025, art. 57, §3º (benefícios de empregados)'],
  outras: ['LC 214/2025, art. 47'],
};

function creditEnabled(context: Pick<DiagnosisContext, 'tax_regime' | 'ibs_cbs_treatment'>): boolean {
  if (context.ibs_cbs_treatment === 'nao_avaliar' || context.ibs_cbs_treatment === 'simples_por_dentro') {
    return false;
  }
  // Simples só apropria crédito se optar por apurar IBS/CBS por fora (regime regular)
  if (context.tax_regime === 'simples_nacional' && context.ibs_cbs_treatment !== 'regime_regular' && context.ibs_cbs_treatment !== 'avaliar_por_fora') {
    return false;
  }
  if (context.tax_regime === 'mei') return false;
  return true;
}

function classifyItem(item: ExpenseItemAnswer, context: DiagnosisContext): ClassifiedExpenseItem {
  const usoPessoalRelevante =
    item.beneficiario === 'familiar' ||
    item.beneficiario === 'socio' && item.business_use_pct < 100 ||
    item.beneficiario === 'misto' ||
    item.business_use_pct < 50;

  const documentoAdequado = item.documento_pj === 'sim';
  const controleSuficiente = item.possui_evidencia;

  const criteria = {
    vinculo_atividade: item.vinculo_atividade,
    uso_pessoal_relevante: usoPessoalRelevante,
    documento_adequado: documentoAdequado,
    controle_suficiente: controleSuficiente,
  };

  // Lente 1: organização PF -> PJ
  let pfPjLens: ClassifiedExpenseItem['pf_pj_lens'];
  if (item.beneficiario === 'familiar' || (item.beneficiario === 'socio' && item.vinculo_atividade === 'nao')) {
    pfPjLens = 'avoid';
  } else if (item.vinculo_atividade === 'nao') {
    pfPjLens = 'defer';
  } else if (item.vinculo_atividade === 'sim' && !usoPessoalRelevante) {
    pfPjLens = 'migrate';
  } else {
    pfPjLens = 'organize';
  }

  // Lente 2: potencial de crédito IBS/CBS
  let creditLens: ClassifiedExpenseItem['credit_lens'];
  if (!creditEnabled(context)) {
    creditLens = 'na';
  } else if (item.is_tributo_ou_principal) {
    // IPVA, parcela de principal de financiamento etc. não são insumo creditável automaticamente
    creditLens = 'none';
  } else if (item.vinculo_atividade === 'nao' || pfPjLens === 'avoid') {
    creditLens = 'none';
  } else if (documentoAdequado && item.vinculo_atividade === 'sim' && !usoPessoalRelevante) {
    creditLens = 'potential';
  } else {
    creditLens = 'conditioned';
  }

  // Classificação consolidada
  let classification: ClassifiedExpenseItem['classification'];
  if (pfPjLens === 'avoid' || item.vinculo_atividade === 'nao') {
    classification = 'nao_recomendado';
  } else if (item.is_tributo_ou_principal) {
    classification = 'nao_recomendado';
  } else if (pfPjLens === 'migrate' && documentoAdequado && !usoPessoalRelevante) {
    classification = 'potencial';
  } else if (usoPessoalRelevante) {
    classification = 'rateio';
  } else {
    classification = 'condicionado';
  }

  // Pendências
  const pendencias: string[] = [];
  if (!documentoAdequado) pendencias.push('Solicitar documento fiscal eletrônico em nome da PJ');
  if (usoPessoalRelevante) pendencias.push('Definir critério de rateio e política de uso');
  if (!controleSuficiente) pendencias.push('Implantar controle/evidência (contrato, agenda, rota)');
  if (item.vinculo_atividade === 'parcial') pendencias.push('Comprovar percentual de uso empresarial');

  // Motivo textual
  let motivo: string;
  if (classification === 'potencial') motivo = 'Vínculo com a atividade e documentação adequados; priorizar organização na PJ.';
  else if (classification === 'rateio') motivo = 'Uso misto/pessoal relevante; requer rateio e controle antes de migrar.';
  else if (classification === 'nao_recomendado') motivo = item.is_tributo_ou_principal
    ? 'Tributo/parcela de principal: não tratar como crédito IBS/CBS automático.'
    : 'Sem vínculo suficiente com a atividade ou benefício pessoal; evitar migração.';
  else motivo = 'Vínculo existe, mas faltam documentos ou controles para sustentar a migração/crédito.';

  const annual = round2(item.monthly_amount * 12);

  return {
    label: item.label,
    category_key: item.category_key,
    monthly_amount: round2(item.monthly_amount),
    annual_amount: annual,
    business_use_pct: item.business_use_pct,
    current_payer: item.current_payer,
    pf_pj_lens: pfPjLens,
    credit_lens: creditLens,
    classification,
    criteria,
    foundation_refs: FOUNDATIONS[item.category_key] ?? FOUNDATIONS.outras,
    motivo,
    pendencias,
    notes: item.notes ?? null,
  };
}

export function runExpenseMapping(input: {
  context: DiagnosisContext;
  items: ExpenseItemAnswer[];
}): ExpenseMappingResult {
  const items = input.items.map((i) => classifyItem(i, input.context));

  const totals = {
    total_analisado_anual: 0,
    potencial_anual: 0,
    condicionado_anual: 0,
    rateio_anual: 0,
    nao_recomendado_anual: 0,
    itens: items.length,
  };
  const matriz = { priorizar: [] as string[], organizar: [] as string[], corrigir_antes: [] as string[], evitar: [] as string[] };

  for (const it of items) {
    totals.total_analisado_anual += it.annual_amount;
    if (it.classification === 'potencial') totals.potencial_anual += it.annual_amount;
    else if (it.classification === 'condicionado') totals.condicionado_anual += it.annual_amount;
    else if (it.classification === 'rateio') totals.rateio_anual += it.annual_amount;
    else if (it.classification === 'nao_recomendado') totals.nao_recomendado_anual += it.annual_amount;

    // Matriz migrar x crédito
    if (it.pf_pj_lens === 'avoid') matriz.evitar.push(it.label);
    else if (it.pf_pj_lens === 'migrate' && it.credit_lens === 'potential') matriz.priorizar.push(it.label);
    else if (it.pf_pj_lens === 'migrate') matriz.organizar.push(it.label);
    else matriz.corrigir_antes.push(it.label);
  }

  totals.total_analisado_anual = round2(totals.total_analisado_anual);
  totals.potencial_anual = round2(totals.potencial_anual);
  totals.condicionado_anual = round2(totals.condicionado_anual);
  totals.rateio_anual = round2(totals.rateio_anual);
  totals.nao_recomendado_anual = round2(totals.nao_recomendado_anual);

  const alertas: string[] = [];
  if (!creditEnabled(input.context)) {
    alertas.push('Regime informado não gera potencial de crédito IBS/CBS neste cenário. A lente de crédito fica como "N/A — revisar regime".');
  }
  if (items.some((i) => i.criteria.uso_pessoal_relevante)) {
    alertas.push('Há despesas com uso pessoal/benefício ao sócio: tratadas como risco de confusão patrimonial.');
  }
  if (items.some((i) => !i.criteria.documento_adequado)) {
    alertas.push('Há despesas sem documento fiscal em nome da PJ. Regularize a documentação antes de migrar.');
  }

  return {
    reference_year: input.context.reference_year,
    rules_version: RULES_VERSION,
    tax_regime: input.context.tax_regime,
    ibs_cbs_treatment: input.context.ibs_cbs_treatment,
    totals,
    matriz,
    items,
    alertas,
    disclaimer: DISCLAIMER,
  };
}
