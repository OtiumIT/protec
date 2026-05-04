import assert from 'node:assert/strict';
import {
  calcularBreakEven,
  calcularPJ,
  calcularReforma2027,
  verificarContribuinteIbsCbsPF,
  type AggregatedYear,
} from '../modules/properties/calculations';

function makeAggregated(receitaMensal: number, custoMensal = 1000, despMensal = 500): AggregatedYear {
  const meses = Array.from({ length: 12 }, (_, i) => ({
    mes: `2027-${String(i + 1).padStart(2, '0')}`,
    receita: receitaMensal,
    despesas_dedutiveis: despMensal,
    custos_operacionais: custoMensal,
  }));
  return {
    ano: 2027,
    receita_total: receitaMensal * 12,
    despesas_dedutiveis_total: despMensal * 12,
    custos_operacionais_total: custoMensal * 12,
    meses,
  };
}

function run(): void {
  const agg = makeAggregated(30_000, 5_000, 2_000);
  const pjPadrao = calcularPJ(agg);
  const pjEquip = calcularPJ(agg, undefined, { aplicar_equiparacao_hospitalar: true });
  assert.ok(pjEquip.imposto_total < pjPadrao.imposto_total, 'Equiparação hospitalar deve reduzir carga PJ.');

  const reformaCreditoTotal = calcularReforma2027(agg, undefined, 70, {
    ano: 2027,
    fator_credito_custos_operacionais: 1,
  });
  const reformaSemCredito = calcularReforma2027(agg, undefined, 70, {
    ano: 2027,
    fator_credito_custos_operacionais: 0,
  });
  assert.ok(
    reformaCreditoTotal.ibs_cbs_liquido <= reformaSemCredito.ibs_cbs_liquido,
    'Com maior fator de crédito, IBS/CBS líquido não pode aumentar.'
  );

  const breakEven = calcularBreakEven(22, 15);
  assert.ok(
    breakEven != null && breakEven > 0 && breakEven < 100000,
    'Break-even dinâmico deve retornar valor mensal plausível quando PJ é mais vantajoso.'
  );
  assert.equal(calcularBreakEven(12, 18), null, 'Sem vantagem de PJ não há break-even.');

  // Regulamento LC 214/2025: PF só é contribuinte de IBS/CBS com mais de 3 imóveis E receita > 240k.
  const pfNaoContribuinteAtePoucos = verificarContribuinteIbsCbsPF(2, 280_000);
  assert.equal(pfNaoContribuinteAtePoucos.contribuinte, false, 'PF com até 3 imóveis NÃO é contribuinte IBS/CBS, qualquer que seja a receita.');
  const pfNaoContribuinteReceitaAlta = verificarContribuinteIbsCbsPF(2, 320_000);
  assert.equal(pfNaoContribuinteReceitaAlta.contribuinte, false, 'PF com 2 imóveis e receita > 288k AINDA NÃO é contribuinte (regulamento exige >3 imóveis).');
  const pfNaoContribuintePoucaReceita = verificarContribuinteIbsCbsPF(5, 200_000);
  assert.equal(pfNaoContribuintePoucaReceita.contribuinte, false, 'PF com >3 imóveis mas receita ≤ 240k NÃO é contribuinte.');
  const pfContribuinte = verificarContribuinteIbsCbsPF(4, 260_000);
  assert.equal(pfContribuinte.contribuinte, true, 'PF com >3 imóveis e receita > 240k É contribuinte IBS/CBS.');

  // Reforma: receita_longa_total + receita_short_total + usar_ambos_redutores (alinhado a simulate por property_ids)
  const aggReformaMix = makeAggregated(10_000, 5_000, 500);
  const reformaSemLongShort = calcularReforma2027(aggReformaMix, undefined, 70, {
    ano: 2033,
    fator_credito_custos_operacionais: 1,
    redutor_social_residencial_anual: 0,
  });
  const reformaComAmbos = calcularReforma2027(aggReformaMix, undefined, 70, {
    ano: 2033,
    fator_credito_custos_operacionais: 1,
    redutor_social_residencial_anual: 0,
    receita_longa_total: 60_000,
    receita_short_total: 60_000,
    usar_ambos_redutores: true,
    usar_redutor_diferenciado_short: false,
  });
  assert.equal(reformaComAmbos.redutor_diferenciado_short, true, 'Perfil ambos deve ativar decomposição long/short.');
  assert.notEqual(
    reformaComAmbos.ibs_cbs_liquido,
    reformaSemLongShort.ibs_cbs_liquido,
    'Com long/short explícitos e ambos redutores, IBS/CBS líquido difere do modelo unificado.'
  );

  console.log('OK: test-properties-calculations');
}

run();
