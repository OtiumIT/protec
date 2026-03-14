import type { RuleDocumentation } from '@shared/types/documentation';

export const rulesRatingValidator: RuleDocumentation[] = [
  {
    id: 'rating-liquidez-corrente',
    modulo: 'rating-validator',
    nome: 'Liquidez Corrente',
    descricao:
      'Mede a capacidade da empresa de pagar suas obrigacoes de curto prazo com os ativos circulantes disponiveis. Quanto maior, melhor a capacidade de pagamento imediato.',
    formula: 'LC = \\frac{Ativo\\;Circulante}{Passivo\\;Circulante}',
    formula_explicada:
      'Divide o total de ativos que podem ser convertidos em dinheiro em ate 12 meses pelo total de obrigacoes a vencer no mesmo periodo.',
    embasamento_legal: [
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Art. 3.',
        inciso: 'I',
        descricao: 'Define a Liquidez Corrente como um dos indicadores de capacidade de pagamento.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Anexo I',
        descricao: 'Estabelece as faixas de classificacao (A, B, C, D) para Liquidez Corrente.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Lei n. 6.404/1976',
        artigo: 'Art. 178',
        paragrafo: '§ 1.',
        descricao: 'Define a estrutura do Ativo Circulante.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l6404consol.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Ativo_Circulante',
        descricao: 'Caixa, bancos, aplicacoes financeiras, estoques, contas a receber (curto prazo)',
        tipo: 'moeda',
      },
      {
        nome: 'Passivo_Circulante',
        descricao: 'Fornecedores, emprestimos, tributos a pagar, salarios (curto prazo)',
        tipo: 'moeda',
      },
    ],
    exemplo_numerico: {
      titulo: 'Empresa com AC de R$ 500.000 e PC de R$ 300.000',
      dados_entrada: {
        ativo_circulante: 500000,
        passivo_circulante: 300000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Aplicar formula',
          formula: 'LC = AC / PC',
          calculo: '500.000 / 300.000',
          resultado: '1,67',
        },
        {
          ordem: 2,
          descricao: 'Classificar conforme faixas do Anexo I',
          calculo: '1,67 esta entre 1,50 e 2,00',
          resultado: 'Rating B (2 pontos)',
        },
      ],
      resultado_final: {
        liquidez_corrente: 1.67,
        pontuacao: 2,
        nivel: 'B',
      },
    },
    observacoes: [
      'LC >= 2,00: Rating A (3 pontos)',
      'LC >= 1,50 e < 2,00: Rating B (2 pontos)',
      'LC >= 1,00 e < 1,50: Rating C (1 ponto)',
      'LC < 1,00: Rating D (0 pontos)',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['liquidez', 'corrente', 'curto-prazo'],
    vigencia: {
      inicio: '2022-08-01',
      observacao: 'Vigente desde a publicacao da Portaria PGFN 6.757/2022',
    },
    alertas: [
      {
        tipo: 'atencao',
        mensagem: 'Utilize os dados do ultimo balanco patrimonial disponivel (no maximo 2 anos).',
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
    id: 'rating-liquidez-geral',
    modulo: 'rating-validator',
    nome: 'Liquidez Geral',
    descricao:
      'Mede a capacidade da empresa de pagar todas as suas obrigacoes (curto e longo prazo) com os ativos realizaveis totais.',
    formula: 'LG = \\frac{AC + RLP}{PC + PNC}',
    formula_explicada:
      'Soma Ativo Circulante com Realizavel a Longo Prazo e divide pela soma de Passivo Circulante e Passivo Nao Circulante.',
    embasamento_legal: [
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Art. 3.',
        inciso: 'II',
        descricao: 'Define a Liquidez Geral como um dos indicadores de capacidade de pagamento.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Anexo I',
        descricao: 'Estabelece as faixas de classificacao (A, B, C, D) para Liquidez Geral.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Lei n. 6.404/1976',
        artigo: 'Art. 179',
        descricao: 'Define o Realizavel a Longo Prazo e demais grupos patrimoniais.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l6404consol.htm',
      },
    ],
    variaveis: [
      {
        nome: 'AC',
        descricao: 'Ativo Circulante',
        tipo: 'moeda',
      },
      {
        nome: 'RLP',
        descricao: 'Realizavel a Longo Prazo (direitos a receber apos 12 meses)',
        tipo: 'moeda',
      },
      {
        nome: 'PC',
        descricao: 'Passivo Circulante',
        tipo: 'moeda',
      },
      {
        nome: 'PNC',
        descricao: 'Passivo Nao Circulante (obrigacoes de longo prazo)',
        tipo: 'moeda',
      },
    ],
    exemplo_numerico: {
      titulo: 'Empresa com ativos e passivos de curto e longo prazo',
      dados_entrada: {
        ativo_circulante: 500000,
        realizavel_lp: 200000,
        passivo_circulante: 300000,
        passivo_nao_circulante: 250000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Somar ativos realizaveis',
          calculo: '500.000 + 200.000',
          resultado: 'R$ 700.000,00',
        },
        {
          ordem: 2,
          descricao: 'Somar passivos totais',
          calculo: '300.000 + 250.000',
          resultado: 'R$ 550.000,00',
        },
        {
          ordem: 3,
          descricao: 'Calcular indice',
          formula: 'LG = 700.000 / 550.000',
          resultado: '1,27',
        },
      ],
      resultado_final: {
        liquidez_geral: 1.27,
        pontuacao: 2,
        nivel: 'B',
      },
    },
    observacoes: [
      'LG >= 1,50: Rating A (3 pontos)',
      'LG >= 1,20 e < 1,50: Rating B (2 pontos)',
      'LG >= 1,00 e < 1,20: Rating C (1 ponto)',
      'LG < 1,00: Rating D (0 pontos)',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['liquidez', 'geral', 'longo-prazo'],
    vigencia: {
      inicio: '2022-08-01',
      observacao: 'Vigente desde a publicacao da Portaria PGFN 6.757/2022',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'O Realizavel a Longo Prazo inclui aplicacoes financeiras de LP, dividendos a receber, etc.',
      },
    ],
  },
  {
    id: 'rating-solvencia',
    modulo: 'rating-validator',
    nome: 'Solvencia (Indice de Solvencia)',
    descricao:
      'Mede a proporcao do patrimonio liquido em relacao ao ativo total. Indica quanto do ativo e financiado por capital proprio vs. capital de terceiros.',
    formula: 'S = \\frac{Patrimonio\\;Liquido}{Ativo\\;Total}',
    formula_explicada:
      'Divide o Patrimonio Liquido pelo Ativo Total. Quanto maior, menor a dependencia de capital de terceiros.',
    embasamento_legal: [
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Art. 3.',
        inciso: 'III',
        descricao: 'Define a Solvencia como um dos indicadores de capacidade de pagamento.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Anexo I',
        descricao: 'Estabelece as faixas de classificacao (A, B, C, D) para Solvencia.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Lei n. 6.404/1976',
        artigo: 'Art. 178',
        paragrafo: '§ 2., d',
        descricao: 'Define a estrutura do Patrimonio Liquido.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l6404consol.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Patrimonio_Liquido',
        descricao: 'Capital social + Reservas + Lucros acumulados',
        tipo: 'moeda',
      },
      {
        nome: 'Ativo_Total',
        descricao: 'Soma de todos os ativos (circulante + nao circulante)',
        tipo: 'moeda',
      },
    ],
    exemplo_numerico: {
      titulo: 'Empresa com PL de R$ 400.000 e AT de R$ 1.000.000',
      dados_entrada: {
        patrimonio_liquido: 400000,
        ativo_total: 1000000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular indice de solvencia',
          formula: 'S = PL / AT',
          calculo: '400.000 / 1.000.000',
          resultado: '0,40 (40%)',
        },
        {
          ordem: 2,
          descricao: 'Classificar conforme faixas do Anexo I',
          calculo: '40% esta entre 30% e 50%',
          resultado: 'Rating B (2 pontos)',
        },
      ],
      resultado_final: {
        solvencia: 0.4,
        solvencia_percentual: 40,
        pontuacao: 2,
        nivel: 'B',
      },
    },
    observacoes: [
      'S >= 50%: Rating A (3 pontos)',
      'S >= 30% e < 50%: Rating B (2 pontos)',
      'S >= 10% e < 30%: Rating C (1 ponto)',
      'S < 10%: Rating D (0 pontos)',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['solvencia', 'patrimonio', 'endividamento'],
    vigencia: {
      inicio: '2022-08-01',
      observacao: 'Vigente desde a publicacao da Portaria PGFN 6.757/2022',
    },
    alertas: [
      {
        tipo: 'critico',
        mensagem: 'Patrimonio Liquido negativo resulta automaticamente em Rating D para este indicador.',
      },
    ],
  },
  {
    id: 'rating-pontuacao',
    modulo: 'rating-validator',
    nome: 'Sistema de Pontuacao e Rating CAPAG',
    descricao:
      'O Rating final (CAPAG) e calculado pela soma dos pontos de cada indicador (Liquidez Corrente, Liquidez Geral e Solvencia). O score total varia de 0 a 9 pontos e determina os descontos disponiveis em transacoes tributarias.',
    formula: 'Score = Pontos_{LC} + Pontos_{LG} + Pontos_{S}',
    formula_explicada:
      'Cada indicador contribui de 0 a 3 pontos. O score total determina o Rating: A (>=7), B (5-6), C (3-4), D (<3).',
    embasamento_legal: [
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Art. 4.',
        descricao: 'Define o sistema de pontuacao e classificacao CAPAG.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Anexo I',
        descricao: 'Tabela completa de faixas e pontuacoes por indicador.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Art. 5.',
        descricao: 'Define os descontos aplicaveis por faixa de Rating.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Lei n. 13.988/2020',
        artigo: 'Art. 3.',
        descricao: 'Institui a transacao tributaria na esfera federal.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l13988.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Pontos_LC',
        descricao: 'Pontuacao da Liquidez Corrente (0-3)',
        tipo: 'numero',
      },
      {
        nome: 'Pontos_LG',
        descricao: 'Pontuacao da Liquidez Geral (0-3)',
        tipo: 'numero',
      },
      {
        nome: 'Pontos_S',
        descricao: 'Pontuacao da Solvencia (0-3)',
        tipo: 'numero',
      },
      {
        nome: 'Score',
        descricao: 'Soma total dos pontos (0-9)',
        tipo: 'numero',
      },
    ],
    exemplo_numerico: {
      titulo: 'Classificacao de empresa com indicadores medios',
      dados_entrada: {
        liquidez_corrente: 1.67,
        liquidez_geral: 1.27,
        solvencia_pct: 40,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Pontuar Liquidez Corrente',
          calculo: 'LC = 1,67 -> Faixa B (1,50 a 2,00)',
          resultado: '2 pontos',
        },
        {
          ordem: 2,
          descricao: 'Pontuar Liquidez Geral',
          calculo: 'LG = 1,27 -> Faixa B (1,20 a 1,50)',
          resultado: '2 pontos',
        },
        {
          ordem: 3,
          descricao: 'Pontuar Solvencia',
          calculo: 'S = 40% -> Faixa B (30% a 50%)',
          resultado: '2 pontos',
        },
        {
          ordem: 4,
          descricao: 'Calcular Score Total',
          formula: 'Score = 2 + 2 + 2',
          resultado: '6 pontos -> Rating B',
        },
      ],
      resultado_final: {
        score: 6,
        rating: 'B',
        descricao: 'Boa capacidade de pagamento',
        desconto_maximo: 'Ate 50% em juros e multas',
      },
    },
    observacoes: [
      'Rating A (Score >= 7): Excelente capacidade - descontos limitados',
      'Rating B (Score 5-6): Boa capacidade - desconto ate 50% juros/multas',
      'Rating C (Score 3-4): Regular capacidade - desconto ate 65% juros/multas',
      'Rating D (Score < 3): Insuficiente - desconto ate 70% + principal em casos especificos',
      'O Rating afeta os descontos disponiveis em transacoes tributarias PGFN.',
      'Empresas em recuperacao judicial podem ter tratamento diferenciado.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['rating', 'score', 'capag', 'transacao'],
    vigencia: {
      inicio: '2022-08-01',
      observacao: 'Vigente desde a publicacao da Portaria PGFN 6.757/2022',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'O Rating CAPAG e recalculado a cada novo balanco patrimonial apresentado.',
      },
      {
        tipo: 'atencao',
        mensagem: 'Empresas sem balanco disponivel podem ser classificadas automaticamente como Rating D.',
      },
    ],
  },
  {
    id: 'rating-beneficios',
    modulo: 'rating-validator',
    nome: 'Beneficios por Rating em Transacoes Tributarias',
    descricao:
      'Cada faixa de Rating (A, B, C, D) determina os beneficios disponiveis em transacoes tributarias com a PGFN, incluindo percentual maximo de desconto sobre multa e juros, prazo maximo de parcelamento e entrada minima.',
    formula: 'Beneficio = f(Rating)',
    formula_explicada:
      'Os beneficios sao escalonados conforme a capacidade de pagamento. Quanto menor o rating (pior situacao financeira), maiores os descontos e prazos concedidos.',
    embasamento_legal: [
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Arts. 30 a 35',
        descricao: 'Regula a Capag Efetiva e os beneficios por faixa de classificacao.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Lei n. 13.988/2020',
        artigo: 'Art. 11',
        descricao: 'Estabelece limites de desconto conforme capacidade de pagamento.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l13988.htm',
      },
    ],
    variaveis: [
      { nome: 'Rating', descricao: 'Classificacao CAPAG (A, B, C ou D)', tipo: 'texto' },
      { nome: 'Desconto_Max', descricao: 'Percentual maximo de desconto sobre multa e juros', tipo: 'percentual' },
      { nome: 'Prazo_Max', descricao: 'Numero maximo de parcelas mensais', tipo: 'numero' },
      { nome: 'Entrada_Min', descricao: 'Percentual minimo de entrada sobre o valor consolidado', tipo: 'percentual' },
    ],
    exemplo_numerico: {
      titulo: 'Tabela de Beneficios por Rating',
      dados_entrada: { rating: 'Todos' },
      passos: [
        {
          ordem: 1,
          descricao: 'Rating A (Excelente)',
          calculo: 'Sem desconto | Ate 60 parcelas | Entrada 6%',
          resultado: 'Beneficios limitados',
        },
        {
          ordem: 2,
          descricao: 'Rating B (Boa)',
          calculo: 'Desconto ate 50% | Ate 84 parcelas | Entrada 5%',
          resultado: 'Beneficios moderados',
        },
        {
          ordem: 3,
          descricao: 'Rating C (Regular)',
          calculo: 'Desconto ate 65% | Ate 108 parcelas | Entrada 4%',
          resultado: 'Beneficios ampliados',
        },
        {
          ordem: 4,
          descricao: 'Rating D (Insuficiente)',
          calculo: 'Desconto ate 70% + reducao principal | Ate 120 parcelas | Entrada 3%',
          resultado: 'Beneficios maximos',
        },
      ],
      resultado_final: {
        descricao: 'Quanto pior a situacao financeira, maiores os beneficios para viabilizar a regularizacao',
      },
    },
    observacoes: [
      'Rating A: Sem desconto, ate 60 parcelas, entrada minima de 6%',
      'Rating B: Desconto ate 50% em juros/multa, ate 84 parcelas, entrada minima de 5%',
      'Rating C: Desconto ate 65% em juros/multa, ate 108 parcelas, entrada minima de 4%',
      'Rating D: Desconto ate 70% + possivel reducao do principal, ate 120 parcelas, entrada minima de 3%',
      'Valores podem variar conforme edital especifico de transacao.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['beneficios', 'desconto', 'parcelamento', 'transacao'],
    vigencia: {
      inicio: '2022-08-01',
      observacao: 'Vigente desde a publicacao da Portaria PGFN 6.757/2022',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'Os percentuais de desconto podem ser limitados pelo edital de transacao vigente.',
      },
    ],
  },
  {
    id: 'rating-comparativo-pgfn',
    modulo: 'rating-validator',
    nome: 'Comparativo Rating Calculado vs Parcelamento PGFN',
    descricao:
      'Permite comparar o rating calculado pelo sistema (baseado no balanco patrimonial) com o rating efetivamente aplicado no parcelamento concedido pela PGFN. Divergencias podem indicar oportunidade de revisao do enquadramento.',
    formula: 'Divergencia = Rating_{calculado} \\neq Rating_{PGFN}',
    formula_explicada:
      'O sistema compara os indicadores financeiros recalculados com o enquadramento do parcelamento PGFN para identificar possiveis inconsistencias.',
    embasamento_legal: [
      {
        norma: 'Portaria PGFN n. 6.757/2022',
        artigo: 'Art. 32',
        descricao: 'Preve a possibilidade de revisao da capacidade de pagamento.',
        url: 'https://www.gov.br/pgfn/pt-br/assuntos/transacao-tributaria/portarias',
      },
      {
        norma: 'Lei n. 13.988/2020',
        artigo: 'Art. 3.',
        paragrafo: '§ 1.',
        descricao: 'A transacao deve considerar a capacidade de pagamento do contribuinte.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l13988.htm',
      },
    ],
    variaveis: [
      { nome: 'Rating_Calculado', descricao: 'Rating obtido pela analise do balanco patrimonial', tipo: 'texto' },
      { nome: 'Rating_PGFN', descricao: 'Rating aplicado no parcelamento concedido pela PGFN', tipo: 'texto' },
      { nome: 'Economia_Potencial', descricao: 'Diferenca financeira entre os cenarios', tipo: 'moeda' },
    ],
    exemplo_numerico: {
      titulo: 'Empresa com divergencia de enquadramento',
      dados_entrada: {
        rating_calculado: 'D',
        rating_pgfn: 'A',
        valor_divida: 244857.85,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Identificar ratings',
          calculo: 'Calculado: D (Score 0) | PGFN: A (60 parcelas sem desconto)',
          resultado: 'Divergencia detectada',
        },
        {
          ordem: 2,
          descricao: 'Comparar beneficios',
          calculo: 'Rating D: 70% desconto | Rating A: 0% desconto',
          resultado: 'Diferenca de 70% em desconto',
        },
        {
          ordem: 3,
          descricao: 'Calcular economia potencial',
          formula: 'Multa + Juros = R$ 167.884 | Desconto 70% = R$ 117.519',
          resultado: 'Economia potencial de R$ 117.519',
        },
      ],
      resultado_final: {
        divergencia: true,
        economia_potencial: 117519,
        recomendacao: 'Avaliar pedido de revisao do enquadramento junto a PGFN',
      },
    },
    observacoes: [
      'A divergencia ocorre quando o rating calculado difere do rating do parcelamento PGFN.',
      'Rating calculado PIOR indica que o contribuinte pode ter direito a mais beneficios.',
      'O pedido de revisao deve ser fundamentado com o balanco patrimonial.',
      'A analise considera os tres indicadores: Liquidez Corrente, Liquidez Geral e Solvencia.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['comparativo', 'divergencia', 'revisao', 'parcelamento'],
    vigencia: {
      inicio: '2022-08-01',
      observacao: 'Vigente desde a publicacao da Portaria PGFN 6.757/2022',
    },
    alertas: [
      {
        tipo: 'critico',
        mensagem: 'Se o rating calculado for PIOR que o concedido, avalie a possibilidade de revisao.',
      },
      {
        tipo: 'atencao',
        mensagem: 'O recibo de adesao PGFN pode ser importado para comparativo automatico.',
      },
    ],
  },
];
