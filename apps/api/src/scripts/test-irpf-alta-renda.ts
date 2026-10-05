import assert from 'node:assert/strict';
import { aplicarFaixas, avaliarRiscoRetencao, calcularBCC } from '../modules/irpf-alta-renda/calculations';

function run(): void {
  // 1) Limite de isenção: R$ 600.000 exatos ficam isentos
  const isento = aplicarFaixas(600_000);
  assert.equal(isento.faixa, 'isento', '1: 600k isento');
  assert.equal(isento.imposto_estimado, 0, '1: sem imposto');

  // 2) Um centavo acima entra na progressiva com alíquota ~0
  const inicioProgressiva = aplicarFaixas(600_000.01);
  assert.equal(inicioProgressiva.faixa, 'progressiva', '2: progressiva');
  assert.equal(inicioProgressiva.aliquota_percentual, 0, '2: alíquota arredondada 0%');

  // 3) Meio da faixa: 900k → (900.000 / 60.000) − 10 = 5%
  const meio = aplicarFaixas(900_000);
  assert.equal(meio.aliquota_percentual, 5, '3: 5%');
  assert.equal(meio.imposto_estimado, 45_000, '3: 900k × 5%');
  assert.equal(meio.excedente_sobre_600k, 300_000, '3: excedente');

  // 4) R$ 1.200.000 exatos: fim da progressiva, 10%
  const fimProgressiva = aplicarFaixas(1_200_000);
  assert.equal(fimProgressiva.faixa, 'progressiva', '4: ainda progressiva');
  assert.equal(fimProgressiva.aliquota_percentual, 10, '4: 10%');
  assert.equal(fimProgressiva.imposto_estimado, 120_000, '4: 1,2 mi × 10%');

  // 5) Acima de 1,2 mi: fixa 10%
  const fixa = aplicarFaixas(1_200_000.01);
  assert.equal(fixa.faixa, 'fixa_10', '5: fixa');
  assert.equal(fixa.aliquota_percentual, 10, '5: 10%');

  // 6) BCC: RT + dividendos − exclusões, nunca negativa
  assert.equal(calcularBCC(300_000, [{ valor: 500_000 }], 100_000), 700_000, '6: BCC');
  assert.equal(calcularBCC(0, [{ valor: 10_000 }], 50_000), 0, '6: BCC não negativa');

  // 7) Retenção pela média anual: 720k/12 = 60k > 50k → possível retenção (estimada)
  const media = avaliarRiscoRetencao([{ nome_fonte: 'Holding A', valor: 720_000 }]);
  assert.equal(media.risco_retencao_mensal, true, '7: risco pela média');
  assert.match(media.risco_retencao_detalhe ?? '', /Possível retenção/, '7: marcado como estimativa');
  assert.match(media.risco_retencao_detalhe ?? '', /média anual ÷ 12/, '7: explica a média');

  // 8) Média abaixo, mas mês informado acima: 480k no ano pagos em um mês
  const concentrado = avaliarRiscoRetencao([{ nome_fonte: 'Empresa B', valor: 480_000, maior_pagamento_mensal: 480_000 }]);
  assert.equal(concentrado.risco_retencao_mensal, true, '8: risco pelo mês informado');
  assert.match(concentrado.risco_retencao_detalhe ?? '', /pagamento informado acima de R\$ 50\.000/, '8: retenção confirmada');

  // 9) Média acima, mas mês informado abaixo: o mês real prevalece
  const distribuido = avaliarRiscoRetencao([{ nome_fonte: 'Empresa C', valor: 720_000, maior_pagamento_mensal: 50_000 }]);
  assert.equal(distribuido.risco_retencao_mensal, false, '9: sem risco com mês ≤ 50k');

  // 10) Sem nada acima
  assert.equal(avaliarRiscoRetencao([{ valor: 100_000 }]).risco_retencao_mensal, false, '10: sem risco');

  console.log('test-irpf-alta-renda: OK');
}

run();
