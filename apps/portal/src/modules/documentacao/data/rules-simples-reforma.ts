import type { RuleDocumentation } from '@shared/types/documentation';

export const rulesSimplesReforma: RuleDocumentation[] = [
  {
    id: 'simples-reforma-simples-puro',
    modulo: 'simples-reforma',
    nome: 'IBS/CBS dentro do DAS (Simples puro)',
    descricao:
      'No Simples puro a empresa recolhe IBS/CBS dentro do DAS e não apropria crédito. O motor estima essa parcela pela repartição do DAS da faixa: PIS + COFINS viram CBS e ICMS/ISS vira IBS na fração de transição do ano.',
    formula: 'SP = RL \\times A_{DAS} \\times \\frac{P_{CBS} + P_{IBS} \\times F_{ano}}{100}',
    formula_explicada:
      'RL = receita bruta − deduções. A_DAS = alíquota efetiva do Simples (informada ou calculada pela faixa do anexo). P_CBS = participação de PIS + COFINS na faixa. P_IBS = participação de ICMS/ISS. F_ano = fração do ICMS/ISS já substituída por IBS (0 até 2028; 10% a 40% de 2029 a 2032; 100% em 2033).',
    embasamento_legal: [
      {
        norma: 'LC 123/2006',
        artigo: 'Anexos I, III, IV e V',
        descricao: 'Faixas, alíquotas nominais, parcela a deduzir e repartição dos tributos no DAS.',
      },
      {
        norma: 'LC 214/2025',
        descricao: 'Substituição de PIS/COFINS por CBS e de ICMS/ISS por IBS, com transição entre 2027 e 2033.',
      },
    ],
    variaveis: [
      { nome: 'receita_bruta_anual', descricao: 'Receita bruta anual', tipo: 'moeda', exemplo: 'R$ 2.750.000,00' },
      { nome: 'deducoes_anual', descricao: 'Cancelamentos e descontos incondicionais', tipo: 'moeda', exemplo: 'R$ 250.000,00' },
      { nome: 'anexo', descricao: 'Anexo do Simples (I, III, IV ou V)', tipo: 'texto', exemplo: 'IV' },
      { nome: 'aliquota_efetiva_simples', descricao: 'Alíquota efetiva do DAS; vazio = calculada pela faixa', tipo: 'percentual', exemplo: '15,32' },
    ],
    exemplo_numerico: {
      titulo: 'Comércio, DAS efetivo informado',
      dados_entrada: { receita_bruta_anual: 1000000, aliquota_efetiva_simples: 10, anexo: 'I', ano: 2027 },
      passos: [
        { ordem: 1, descricao: 'Participação de PIS + COFINS no Anexo I (faixas 1 a 5)', resultado: '15,5%' },
        { ordem: 2, descricao: 'Fração de IBS no DAS em 2027', resultado: '0%' },
        { ordem: 3, descricao: 'IBS/CBS no DAS', calculo: '1.000.000 × 10% × 15,5%', resultado: 'R$ 15.500,00' },
      ],
      resultado_final: { simples_puro: 15500 },
    },
    observacoes: [
      'Na 6ª faixa o ICMS/ISS é recolhido fora do DAS; a participação de IBS é zero.',
      'A repartição é a da LC 123/2006 vigente; a regulamentação do Simples na reforma pode alterar esses percentuais.',
      'ISS/ICMS remanescentes, IRPJ, CSLL e CPP ficam no DAS nos dois cenários e não entram na comparação.',
    ],
    alertas: [{ tipo: 'atencao', mensagem: 'Valores de transição são estimativas editáveis, não alíquotas oficiais.' }],
    ultima_atualizacao: '2026-09-29',
    tags: ['simples', 'ibs', 'cbs', 'das', 'reforma'],
  },
  {
    id: 'simples-reforma-regime-regular',
    modulo: 'simples-reforma',
    nome: 'Regime regular de IBS/CBS (Simples híbrido)',
    descricao:
      'Ao optar pelo regime regular, a empresa do Simples recolhe IBS/CBS por fora, com débito sobre a receita e crédito sobre as aquisições com direito a crédito. Folha, tributos e uso pessoal nunca geram crédito; o servidor zera esses itens mesmo que marcados.',
    formula: 'RR = \\max(0,\\; RL \\times (CBS + IBS) - \\sum_i V_i \\times a_i)',
    formula_explicada:
      'Débito = RL × (CBS + IBS do ano). Crédito = soma de valor anual × alíquota de crédito de cada despesa elegível. Saldo negativo aparece como saldo credor. Diferença anual = Simples puro − saldo a recolher; positiva indica que o regime regular é mais barato.',
    embasamento_legal: [
      { norma: 'LC 214/2025', artigo: 'Art. 47', descricao: 'Não cumulatividade: crédito do IBS/CBS pago nas aquisições.' },
      { norma: 'LC 214/2025', artigo: 'Art. 57', descricao: 'Vedação de crédito em bens e serviços de uso e consumo pessoal.' },
    ],
    variaveis: [
      { nome: 'aliquota_cbs', descricao: 'CBS do ano (padrão 9% em 2027)', tipo: 'percentual', exemplo: '9' },
      { nome: 'aliquota_ibs', descricao: 'IBS do ano (0,1% em 2027–2028, transição até 2033)', tipo: 'percentual', exemplo: '0' },
      { nome: 'valor_anual', descricao: 'Valor anual de cada despesa', tipo: 'moeda', exemplo: 'R$ 350.000,00' },
      { nome: 'aliquota_credito', descricao: 'Alíquota do crédito conforme o fornecedor', tipo: 'percentual', exemplo: '6,3' },
    ],
    exemplo_numerico: {
      titulo: 'Advocacia (DRE da aula Simples puro vs híbrido)',
      dados_entrada: { receita_bruta_anual: 2750000, deducoes_anual: 250000, aliquota_cbs: 9, aliquota_ibs: 0 },
      passos: [
        { ordem: 1, descricao: 'Receita líquida', calculo: '2.750.000 − 250.000', resultado: 'R$ 2.500.000,00' },
        { ordem: 2, descricao: 'Débito', calculo: '2.500.000 × 9%', resultado: 'R$ 225.000,00' },
        { ordem: 3, descricao: 'Aluguel', calculo: '76.817 × 2,7%', resultado: 'R$ 2.074,06' },
        { ordem: 4, descricao: 'Assinatura de IA, publicidade e energia', calculo: '(24.000 + 14.900 + 15.000) × 9%', resultado: 'R$ 4.851,00' },
        { ordem: 5, descricao: 'Seguros', calculo: '4.988 × 10,85%', resultado: 'R$ 541,20' },
        { ordem: 6, descricao: 'Serviços de PJ', calculo: '350.000 × 6,3%', resultado: 'R$ 22.050,00' },
        { ordem: 7, descricao: 'Pessoal', calculo: '333.750 × 0', resultado: 'R$ 0,00' },
        { ordem: 8, descricao: 'Saldo a recolher', calculo: '225.000 − 29.516,26', resultado: 'R$ 195.483,74' },
      ],
      resultado_final: { debito: 225000, credito: 29516.26, saldo_recolher: 195483.74 },
    },
    observacoes: [
      'A alíquota de crédito de cada linha depende do regime do fornecedor; o contador ajusta.',
      'A opção pode ser revista nas janelas semestrais do Simples; vale refazer a simulação a cada janela.',
    ],
    ultima_atualizacao: '2026-09-29',
    tags: ['simples', 'hibrido', 'credito', 'ibs', 'cbs'],
  },
  {
    id: 'simples-reforma-adquirente',
    modulo: 'simples-reforma',
    nome: 'Efeito no crédito do cliente empresa',
    descricao:
      'Quem vende para empresas precisa olhar o crédito que o cliente toma. No regime regular o cliente credita o IBS/CBS destacado; no Simples puro, só o valor recolhido dentro do DAS.',
    formula: '\\Delta = RL \\times \\%E \\times \\left(\\frac{CBS + IBS}{100} - \\frac{A_{DAS} \\times (P_{CBS} + P_{IBS} F_{ano})}{10^4}\\right)',
    formula_explicada:
      '%E = parcela da receita vendida para empresas. Consumidor final não usa crédito (%E = 0). A diferença é o crédito que o cliente deixa de tomar se o fornecedor ficar no Simples puro.',
    embasamento_legal: [
      { norma: 'LC 214/2025', artigo: 'Art. 47', descricao: 'Crédito do adquirente limitado ao valor recolhido pelo optante do Simples.' },
    ],
    variaveis: [
      { nome: 'percentual_vendas_empresas', descricao: 'Vendas para empresas sobre a receita', tipo: 'percentual', exemplo: '100' },
    ],
    exemplo_numerico: {
      titulo: 'Venda 100% para empresas',
      dados_entrada: { receita_liquida: 1000000, aliquota_cbs: 9, aliquota_ibs: 0, aliquota_efetiva_simples: 10, participacao_cbs: 15.5 },
      passos: [
        { ordem: 1, descricao: 'Crédito do cliente no regime regular', calculo: '1.000.000 × 9%', resultado: 'R$ 90.000,00' },
        { ordem: 2, descricao: 'Crédito do cliente no Simples puro', calculo: '1.000.000 × 10% × 15,5%', resultado: 'R$ 15.500,00' },
        { ordem: 3, descricao: 'Crédito perdido', calculo: '90.000 − 15.500', resultado: 'R$ 74.500,00' },
      ],
      resultado_final: { diferenca: 74500 },
    },
    observacoes: ['Quando mais da metade das vendas vai para empresas e o Simples puro sai mais barato, o sistema emite alerta comercial.'],
    ultima_atualizacao: '2026-09-29',
    tags: ['simples', 'adquirente', 'credito', 'b2b'],
  },
];
