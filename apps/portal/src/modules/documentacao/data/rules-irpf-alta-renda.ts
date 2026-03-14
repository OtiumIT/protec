import type { RuleDocumentation } from '@shared/types/documentation';

export const rulesIrpfAltaRenda: RuleDocumentation[] = [
  {
    id: 'irpf-bcc',
    modulo: 'irpf-alta-renda',
    nome: 'Base de Calculo Combinada (BCC)',
    descricao:
      'A Base de Calculo Combinada agrega rendimentos tributaveis, dividendos isentos (codigos 09/13) e outros isentos que entram na base, subtraindo as exclusoes previstas no Art. 16-A.',
    formula: 'BCC = RT + Dividendos + Outros\\_Isentos - Exclusoes\\_Art16A',
    formula_explicada:
      'Soma os rendimentos tributaveis com dividendos e outros isentos, deduzindo ganhos de capital, FIIs qualificados, lucros aprovados ate 31/12/2025 e ativos incentivados.',
    embasamento_legal: [
      {
        norma: 'Lei n. 15.270/2025',
        artigo: 'Art. 16-A',
        paragrafo: 'caput',
        descricao: 'Define a base de calculo combinada para tributacao minima.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
      },
      {
        norma: 'Lei n. 15.270/2025',
        artigo: 'Art. 16-A',
        paragrafo: '§ 1.',
        descricao: 'Lista as exclusoes permitidas da base.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
      },
      {
        norma: 'Lei n. 7.713/1988',
        artigo: 'Art. 6.',
        descricao: 'Define rendimentos isentos e nao tributaveis (base original).',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l7713.htm',
      },
    ],
    variaveis: [
      {
        nome: 'RT',
        descricao: 'Rendimentos Tributaveis (salarios, alugueis, etc.)',
        tipo: 'moeda',
      },
      {
        nome: 'Dividendos',
        descricao: 'Lucros e dividendos isentos (codigos 09 e 13 da DIRPF)',
        tipo: 'moeda',
      },
      {
        nome: 'Outros_Isentos',
        descricao: 'Outros rendimentos isentos que entram na base',
        tipo: 'moeda',
      },
      {
        nome: 'Exclusoes_Art16A',
        descricao: 'Ganho de capital, FIIs, lucros aprovados ate 31/12/2025, CRI/CRA/LCI/LCA/LIG',
        tipo: 'moeda',
      },
    ],
    exemplo_numerico: {
      titulo: 'Contribuinte com rendimentos mistos',
      dados_entrada: {
        rendimentos_tributaveis: 400000,
        dividendos: 500000,
        outros_isentos: 100000,
        exclusoes: 50000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Somar rendimentos que entram na base',
          calculo: '400.000 + 500.000 + 100.000',
          resultado: 'R$ 1.000.000,00',
        },
        {
          ordem: 2,
          descricao: 'Subtrair exclusoes Art. 16-A',
          calculo: '1.000.000 - 50.000',
          resultado: 'R$ 950.000,00',
        },
      ],
      resultado_final: {
        bcc: 950000,
        faixa: 'progressiva',
      },
    },
    observacoes: [
      'Codigos 09 e 13 da DIRPF representam lucros e dividendos distribuidos.',
      'FIIs qualificados sao excluidos conforme Art. 16-A § 1. V-j.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['bcc', 'base-calculo', 'dividendos'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Aplicavel a partir do exercicio fiscal 2026',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'Dividendos aprovados ate 31/12/2025 sao excluidos da BCC - documente a data de aprovacao.',
      },
    ],
    historico: [
      {
        data: '2026-03-14',
        versao: '1.0',
        descricao: 'Versao inicial da documentacao',
      },
    ],
  },
  {
    id: 'irpf-faixa-isenta',
    modulo: 'irpf-alta-renda',
    nome: 'Faixa Isenta (ate R$ 600.000)',
    descricao:
      'Contribuintes com Base de Calculo Combinada ate R$ 600.000 anuais estao isentos da tributacao minima. Nao ha imposto complementar a pagar.',
    formula: 'Se\\;BCC \\leq R\\$ 600.000 \\Rightarrow Aliquota = 0\\%',
    embasamento_legal: [
      {
        norma: 'Lei n. 15.270/2025',
        artigo: 'Art. 16-A',
        paragrafo: '§ 2.',
        inciso: 'I',
        descricao: 'Estabelece isencao para BCC ate R$ 600.000.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Limite_Isento',
        descricao: 'Valor fixo de R$ 600.000 anuais',
        tipo: 'moeda',
        exemplo: 'R$ 600.000,00',
      },
    ],
    exemplo_numerico: {
      titulo: 'Contribuinte com BCC de R$ 500.000',
      dados_entrada: {
        bcc: 500000,
        limite_isento: 600000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Verificar se BCC esta na faixa isenta',
          calculo: '500.000 <= 600.000',
          resultado: 'Sim, isento da tributacao minima',
        },
        {
          ordem: 2,
          descricao: 'Calcular imposto complementar',
          formula: 'Imposto = BCC x 0%',
          calculo: '500.000 x 0%',
          resultado: 'R$ 0,00',
        },
      ],
      resultado_final: {
        aliquota: 0,
        imposto_complementar: 0,
        status: 'Isento da tributacao minima',
      },
    },
    observacoes: [
      'A isencao e automatica - nao ha declaracao adicional necessaria.',
      'Mesmo isento da tributacao minima, o contribuinte segue com obrigacoes normais do IRPF.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['isencao', 'faixa', '600k'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Aplicavel a partir do exercicio fiscal 2026',
    },
    alertas: [
      {
        tipo: 'atencao',
        mensagem: 'O limite de R$ 600.000 e anual. Verifique a BCC total do ano, nao mensal.',
      },
    ],
  },
  {
    id: 'irpf-faixa-progressiva',
    modulo: 'irpf-alta-renda',
    nome: 'Faixa Progressiva (R$ 600.001 a R$ 1.200.000)',
    descricao:
      'Para BCC entre R$ 600.000,01 e R$ 1.200.000, a aliquota e calculada por interpolacao linear, variando de 0% a 10%.',
    formula: 'Aliquota\\% = \\frac{REND}{60.000} - 10',
    formula_explicada:
      'Divide a BCC por 60.000 e subtrai 10. Para BCC de R$ 600.000: (600.000/60.000)-10 = 0%. Para R$ 1.200.000: (1.200.000/60.000)-10 = 10%.',
    embasamento_legal: [
      {
        norma: 'Lei n. 15.270/2025',
        artigo: 'Art. 16-A',
        paragrafo: '§ 2.',
        inciso: 'II',
        descricao: 'Formula da aliquota progressiva.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
      },
    ],
    variaveis: [
      {
        nome: 'REND',
        descricao: 'Base de Calculo Combinada (BCC)',
        tipo: 'moeda',
      },
      {
        nome: 'Aliquota',
        descricao: 'Resultado da formula (entre 0% e 10%)',
        tipo: 'percentual',
      },
    ],
    exemplo_numerico: {
      titulo: 'BCC de R$ 900.000',
      dados_entrada: {
        bcc: 900000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Aplicar formula da aliquota',
          formula: 'Aliquota = (BCC / 60.000) - 10',
          calculo: '(900.000 / 60.000) - 10 = 15 - 10',
          resultado: '5%',
        },
        {
          ordem: 2,
          descricao: 'Calcular imposto minimo',
          formula: 'Imposto = BCC x Aliquota',
          calculo: '900.000 x 5%',
          resultado: 'R$ 45.000,00',
        },
      ],
      resultado_final: {
        aliquota_percentual: 5,
        imposto_minimo: 45000,
      },
    },
    observacoes: [
      'A formula resulta exatamente em 0% para R$ 600.000 e 10% para R$ 1.200.000.',
      'A interpolacao e linear: cada R$ 60.000 adicional aumenta 1% na aliquota.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['progressiva', 'formula', 'interpolacao'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Aplicavel a partir do exercicio fiscal 2026',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'A formula REND/60.000-10 e aplicada sobre a BCC total, nao sobre o excedente de R$ 600.000.',
      },
    ],
  },
  {
    id: 'irpf-faixa-fixa',
    modulo: 'irpf-alta-renda',
    nome: 'Faixa Fixa 10% (acima de R$ 1.200.000)',
    descricao:
      'Para BCC acima de R$ 1.200.000, a aliquota e fixa em 10%. O imposto minimo e calculado sobre toda a BCC.',
    formula: 'Se\\;BCC > R\\$ 1.200.000 \\Rightarrow Imposto = BCC \\times 10\\%',
    embasamento_legal: [
      {
        norma: 'Lei n. 15.270/2025',
        artigo: 'Art. 16-A',
        paragrafo: '§ 2.',
        inciso: 'III',
        descricao: 'Aliquota fixa de 10% para BCC acima de R$ 1.200.000.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Limite_Progressiva',
        descricao: 'Valor de R$ 1.200.000 - limite superior da faixa progressiva',
        tipo: 'moeda',
      },
      {
        nome: 'Aliquota_Fixa',
        descricao: 'Aliquota de 10%',
        tipo: 'percentual',
        exemplo: '10%',
      },
    ],
    exemplo_numerico: {
      titulo: 'BCC de R$ 2.000.000',
      dados_entrada: {
        bcc: 2000000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Verificar faixa',
          calculo: '2.000.000 > 1.200.000',
          resultado: 'Faixa fixa 10%',
        },
        {
          ordem: 2,
          descricao: 'Calcular imposto minimo',
          formula: 'Imposto = BCC x 10%',
          calculo: '2.000.000 x 10%',
          resultado: 'R$ 200.000,00',
        },
      ],
      resultado_final: {
        aliquota_percentual: 10,
        imposto_minimo: 200000,
      },
    },
    observacoes: [
      'A aliquota de 10% incide sobre TODA a BCC, nao apenas sobre o excedente.',
      'O imposto complementar e o que faltar apos deduzir IRRF, carne-leao, etc.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['fixa', '10-porcento', 'alta-renda'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Aplicavel a partir do exercicio fiscal 2026',
    },
    alertas: [
      {
        tipo: 'critico',
        mensagem: 'Contribuintes com BCC > R$ 1,2M devem pagar no minimo 10% de imposto sobre toda a base.',
      },
    ],
  },
  {
    id: 'irpf-exclusoes-art16a',
    modulo: 'irpf-alta-renda',
    nome: 'Exclusoes Art. 16-A',
    descricao:
      'A Lei 15.270/2025 exclui da BCC determinados rendimentos: ganho de capital, FIIs qualificados, lucros aprovados ate 31/12/2025, e ativos incentivados (CRI, CRA, LCI, LCA, LIG, poupanca, debentures de infraestrutura).',
    embasamento_legal: [
      {
        norma: 'Lei n. 15.270/2025',
        artigo: 'Art. 16-A',
        paragrafo: '§ 1.',
        inciso: 'I',
        descricao: 'Exclusao de ganho de capital de bens moveis e imoveis.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
      },
      {
        norma: 'Lei n. 15.270/2025',
        artigo: 'Art. 16-A',
        paragrafo: '§ 1.',
        inciso: 'V-j',
        descricao: 'Exclusao de rendimentos de FIIs qualificados.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
      },
      {
        norma: 'Lei n. 15.270/2025',
        artigo: 'Art. 16-A',
        paragrafo: '§ 1.',
        inciso: 'XII',
        descricao: 'Regra de transicao: lucros aprovados ate 31/12/2025.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
      },
      {
        norma: 'Lei n. 12.431/2011',
        artigo: 'Art. 2.',
        descricao: 'Debentures de infraestrutura - isencao PF.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12431.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Ganho_Capital',
        descricao: 'Ganhos de capital fora de bolsa/mercado organizado',
        tipo: 'moeda',
      },
      {
        nome: 'FIIs_Qualificados',
        descricao: 'Rendimentos de FIIs com requisitos legais',
        tipo: 'moeda',
      },
      {
        nome: 'Lucros_Transicao',
        descricao: 'Lucros/dividendos aprovados ate 31/12/2025',
        tipo: 'moeda',
      },
      {
        nome: 'Ativos_Incentivados',
        descricao: 'CRI, CRA, LCI, LCA, LIG, poupanca, debentures infra',
        tipo: 'moeda',
      },
    ],
    exemplo_numerico: {
      titulo: 'Contribuinte com diversos rendimentos excluidos',
      dados_entrada: {
        rendimentos_tributaveis: 300000,
        dividendos_2026: 400000,
        dividendos_aprovados_2025: 200000,
        fiis_qualificados: 80000,
        cri_cra: 50000,
        ganho_capital: 100000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular total de exclusoes Art. 16-A',
          calculo: '200.000 (lucros 2025) + 80.000 (FIIs) + 50.000 (CRI/CRA) + 100.000 (GC)',
          resultado: 'R$ 430.000,00',
        },
        {
          ordem: 2,
          descricao: 'Calcular BCC bruta',
          calculo: '300.000 + 400.000 + 200.000 + 80.000 + 50.000 + 100.000',
          resultado: 'R$ 1.130.000,00',
        },
        {
          ordem: 3,
          descricao: 'Calcular BCC liquida',
          formula: 'BCC = BCC_bruta - Exclusoes',
          calculo: '1.130.000 - 430.000',
          resultado: 'R$ 700.000,00',
        },
      ],
      resultado_final: {
        bcc_bruta: 1130000,
        total_exclusoes: 430000,
        bcc_liquida: 700000,
        economia_estimada: 43000,
      },
    },
    observacoes: [
      'A exclusao dos lucros aprovados ate 31/12/2025 e uma regra de transicao.',
      'Ativos incentivados devem atender aos requisitos especificos de cada instrumento.',
      'Doacoes e herancas tambem sao excluidas da BCC.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['exclusoes', 'isencao', 'ativos-incentivados'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Exclusoes aplicaveis a partir do exercicio fiscal 2026',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'Mantenha documentacao comprobatoria da data de aprovacao de lucros para usar a regra de transicao.',
      },
      {
        tipo: 'atencao',
        mensagem: 'FIIs so sao excluidos se atenderem aos requisitos de qualificacao (min. 50 cotistas, listagem, etc.).',
      },
    ],
  },
  {
    id: 'irpf-retencao-fonte',
    modulo: 'irpf-alta-renda',
    nome: 'Retencao na Fonte Art. 5.',
    descricao:
      'Quando o pagamento mensal de dividendos por uma fonte ultrapassar R$ 50.000, ha risco de retencao de 10% na fonte. A antecipacao e compensavel na declaracao anual.',
    formula: 'Se\\;Dividendos\\_Mes > R\\$ 50.000 \\Rightarrow Retencao = 10\\%',
    embasamento_legal: [
      {
        norma: 'Lei n. 15.270/2025',
        artigo: 'Art. 5.',
        paragrafo: 'caput',
        descricao: 'Antecipacao de 10% na fonte para dividendos mensais acima de R$ 50.000.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
      },
      {
        norma: 'Lei n. 15.270/2025',
        artigo: 'Art. 5.',
        paragrafo: '§ 1.',
        descricao: 'A retencao e por fonte pagadora.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Limite_Mensal',
        descricao: 'R$ 50.000 por fonte pagadora',
        tipo: 'moeda',
        exemplo: 'R$ 50.000,00',
      },
      {
        nome: 'Aliquota_Retencao',
        descricao: 'Aliquota de retencao de 10%',
        tipo: 'percentual',
        exemplo: '10%',
      },
    ],
    exemplo_numerico: {
      titulo: 'Dividendo mensal de R$ 80.000',
      dados_entrada: {
        dividendo_mensal: 80000,
        limite: 50000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Verificar se excede limite',
          calculo: '80.000 > 50.000',
          resultado: 'Sim, ha retencao',
        },
        {
          ordem: 2,
          descricao: 'Calcular retencao',
          formula: 'Retencao = Dividendo x 10%',
          calculo: '80.000 x 10%',
          resultado: 'R$ 8.000,00',
        },
      ],
      resultado_final: {
        retencao_fonte: 8000,
        liquido_recebido: 72000,
      },
    },
    observacoes: [
      'A retencao e POR FONTE PAGADORA - cada empresa conta separadamente.',
      'O valor retido e compensavel no imposto complementar anual.',
      'Considere holding ou fracionamento para otimizar retencoes.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['retencao', 'fonte', 'antecipacao'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Aplicavel a pagamentos a partir de janeiro/2026',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'O limite de R$ 50.000 e por fonte pagadora mensal. Multiplas empresas = multiplos limites.',
      },
      {
        tipo: 'atencao',
        mensagem: 'Planeje a distribuicao de dividendos ao longo do ano para minimizar retencoes antecipadas.',
      },
    ],
  },
];
