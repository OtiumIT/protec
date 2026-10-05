import assert from 'node:assert/strict';
import { EXEMPLOS_SIMPLES_REFORMA, simularSimplesIbsCbs, SimplesIbsCbsInputSchema } from '@shared/core';

function run(): void {
  // 1) Caso advocacia da aula: receita líquida 2,5 mi, CBS 9%, crédito linha a linha
  const advocacia = SimplesIbsCbsInputSchema.parse(EXEMPLOS_SIMPLES_REFORMA.advocacia.input);
  const r1 = simularSimplesIbsCbs(advocacia);
  assert.equal(r1.receita_liquida_anual, 2_500_000, '1: receita líquida');
  assert.equal(r1.regime_regular.debito, 225_000, '1: débito = 2,5 mi x 9%');
  const creditoPorLinha = Object.fromEntries(r1.despesas.map((d) => [d.descricao, d.credito]));
  assert.equal(creditoPorLinha['Aluguel de imóveis'], 2_074.06, '1: aluguel 2,7%');
  assert.equal(creditoPorLinha['Assinatura de IA'], 2_160, '1: IA 9%');
  assert.equal(creditoPorLinha['Publicidade e propaganda'], 1_341, '1: publicidade 9%');
  assert.equal(creditoPorLinha['Prêmios de seguros'], 541.2, '1: seguros 10,85%');
  assert.equal(creditoPorLinha['Energia, gás, água e esgoto'], 1_350, '1: energia 9%');
  assert.equal(creditoPorLinha['Serviços técnico-profissionais (PJ)'], 22_050, '1: serviço PJ');
  assert.equal(creditoPorLinha['Despesas com pessoal'], 0, '1: pessoal sem crédito');
  assert.equal(r1.regime_regular.credito, 29_516.26, '1: crédito total');
  assert.equal(r1.regime_regular.saldo_recolher, 195_483.74, '1: saldo a recolher');
  assert.equal(r1.parametros.anexo, 'Anexo IV', '1: anexo IV');
  assert.equal(r1.parametros.faixa, 5, '1: faixa 5 do Anexo IV');
  assert.ok(r1.simples_puro.ibs_cbs_anual > 0, '1: Simples puro com parcela de CBS no DAS');
  assert.equal(
    r1.diferenca_anual,
    Math.round((r1.simples_puro.ibs_cbs_anual - r1.regime_regular.saldo_recolher) * 100) / 100,
    '1: diferença = Simples puro - saldo regular',
  );

  // 2) Folha marcada com crédito é zerada no servidor
  const r2 = simularSimplesIbsCbs(
    SimplesIbsCbsInputSchema.parse({
      perfil: 'servico',
      receita_bruta_anual: 1_000_000,
      aliquota_cbs: 9,
      aliquota_ibs: 0,
      despesas: [{ descricao: 'Folha', categoria: 'pessoal', valor_anual: 300_000, gera_credito: true, aliquota_credito: 9 }],
    }),
  );
  assert.equal(r2.despesas[0]!.credito, 0, '2: folha sem crédito');
  assert.equal(r2.despesas[0]!.gera_credito, false, '2: gera_credito forçado a false');
  assert.ok(r2.despesas[0]!.motivo_sem_credito, '2: motivo informado');
  assert.ok(r2.alertas.some((a) => a.includes('zeradas')), '2: alerta de crédito zerado');

  // 3) Efeito no adquirente: 100% para empresas
  const r3 = simularSimplesIbsCbs(
    SimplesIbsCbsInputSchema.parse({
      perfil: 'comercio',
      receita_bruta_anual: 1_000_000,
      aliquota_efetiva_simples: 10,
      aliquota_cbs: 9,
      aliquota_ibs: 0,
      percentual_vendas_empresas: 100,
    }),
  );
  assert.equal(r3.efeito_adquirente.credito_adquirente_regime_regular, 90_000, '3: crédito cheio no regular');
  assert.equal(r3.efeito_adquirente.credito_adquirente_simples_puro, 15_500, '3: crédito = parcela CBS do DAS (10% x 15,5%)');
  assert.equal(r3.simples_puro.ibs_cbs_anual, 15_500, '3: Simples puro = 1 mi x 10% x 15,5%');

  // 4) Receita acima do limite gera alerta; deduções acima da receita são rejeitadas
  const r4 = simularSimplesIbsCbs(SimplesIbsCbsInputSchema.parse({ perfil: 'servico', receita_bruta_anual: 5_000_000 }));
  assert.ok(r4.alertas.some((a) => a.includes('4,8 milhões')), '4: alerta de limite');
  assert.equal(
    SimplesIbsCbsInputSchema.safeParse({ perfil: 'servico', receita_bruta_anual: 100, deducoes_anual: 200 }).success,
    false,
    '4: deduções > receita inválido',
  );

  // 5) Transição: em 2033 o IBS entra inteiro no DAS
  const r5 = simularSimplesIbsCbs(SimplesIbsCbsInputSchema.parse({ ano: 2033, perfil: 'servico', receita_bruta_anual: 100_000 }));
  assert.equal(r5.parametros.fracao_ibs_transicao, 1, '5: fração IBS 100%');
  assert.equal(r5.parametros.participacao_ibs_das, 33.5, '5: ISS vira IBS na faixa 1 do Anexo III');

  console.log('test-simples-reforma: OK');
}

run();
