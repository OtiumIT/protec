import type { RuleDocumentation } from '@shared/types/documentation';

export const rulesIN2306: RuleDocumentation[] = [
  {
    id: 'in2306-limite-trimestral',
    modulo: 'simulador-in-2306',
    nome: 'Limite Trimestral para Acrescimo',
    descricao:
      'A IN RFB 2.306/2026 estabelece que o acrescimo de 10% na presuncao incide apenas sobre a parcela da receita bruta trimestral que exceder R$ 1.250.000,00. Este limite e aplicado proporcionalmente por tipo de atividade.',
    formula: 'Excedente = Receita\\_Trimestre - R\\$ 1.250.000',
    formula_explicada:
      'Se a receita bruta do trimestre for maior que R$ 1.250.000, o excedente sera tributado com presuncao acrescida de 10%.',
    embasamento_legal: [
      {
        norma: 'IN RFB n. 2.306/2026',
        artigo: 'Art. 14',
        paragrafo: '§ 2.',
        descricao: 'Define o limite trimestral de R$ 1.250.000 para aplicacao do acrescimo.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/lucro-presumido',
      },
      {
        norma: 'IN RFB n. 2.306/2026',
        artigo: 'Art. 15',
        paragrafo: '§ 3.',
        descricao: 'Estabelece limite anual de R$ 5.000.000 para IRPJ.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/lucro-presumido',
      },
    ],
    variaveis: [
      {
        nome: 'Receita_Trimestre',
        descricao: 'Soma de todas as receitas brutas do trimestre (produtos, servicos, etc.)',
        tipo: 'moeda',
        exemplo: 'R$ 2.000.000,00',
      },
      {
        nome: 'Limite_Trimestral',
        descricao: 'Valor fixo de R$ 1.250.000,00 definido pela IN',
        tipo: 'moeda',
        exemplo: 'R$ 1.250.000,00',
      },
      {
        nome: 'Excedente',
        descricao: 'Parcela da receita acima do limite que sofre acrescimo',
        tipo: 'moeda',
        exemplo: 'R$ 750.000,00',
      },
    ],
    exemplo_numerico: {
      titulo: 'Empresa com receita de R$ 2.000.000 no trimestre',
      dados_entrada: {
        receita_servicos: 2000000,
        limite_trimestral: 1250000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular o excedente sobre o limite',
          formula: 'Excedente = Receita - Limite',
          calculo: '2.000.000 - 1.250.000',
          resultado: 'R$ 750.000,00',
        },
        {
          ordem: 2,
          descricao: 'Aplicar presuncao normal (32%) sobre o limite',
          formula: 'Base_Normal = Limite x 32%',
          calculo: '1.250.000 x 0,32',
          resultado: 'R$ 400.000,00',
        },
        {
          ordem: 3,
          descricao: 'Aplicar presuncao com acrescimo (32% x 1,1 = 35,2%) sobre excedente',
          formula: 'Base_Acrescida = Excedente x 35,2%',
          calculo: '750.000 x 0,352',
          resultado: 'R$ 264.000,00',
        },
      ],
      resultado_final: {
        base_calculo_irpj: 664000,
        descricao: 'Base de calculo IRPJ = R$ 400.000 + R$ 264.000 = R$ 664.000',
      },
    },
    observacoes: [
      'O limite e calculado proporcionalmente quando ha multiplos tipos de atividade (Pergunta 14 RF).',
      'O acrescimo de 10% e aplicado sobre o percentual de presuncao, nao sobre a receita.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['lucro-presumido', 'acrescimo', 'limite'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Aplicavel a partir do exercicio fiscal 2026',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'O limite de R$ 1.250.000 e trimestral, nao mensal. Verifique a receita acumulada do trimestre.',
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
    id: 'in2306-acrescimo-irpj',
    modulo: 'simulador-in-2306',
    nome: 'Acrescimo 10% IRPJ',
    descricao:
      'O acrescimo de 10% sobre a presuncao do IRPJ e aplicado a partir do 1. trimestre de 2026. Incide sobre a parcela da receita que excede o limite trimestral de R$ 1.250.000.',
    formula: 'Presuncao\\_Acrescida = Presuncao\\_Normal \\times 1,10',
    formula_explicada:
      'A presuncao normal (ex: 32% para servicos) e multiplicada por 1,10, resultando em 35,2%.',
    embasamento_legal: [
      {
        norma: 'IN RFB n. 2.306/2026',
        artigo: 'Art. 14',
        paragrafo: 'caput',
        descricao: 'Estabelece o acrescimo de 10% na presuncao para receitas excedentes.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/lucro-presumido',
      },
      {
        norma: 'IN RFB n. 2.306/2026',
        artigo: 'Art. 14',
        paragrafo: '§ 1.',
        descricao: 'Detalha a forma de calculo do acrescimo sobre a presuncao.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/lucro-presumido',
      },
      {
        norma: 'Receita Federal - Perguntas e Respostas',
        artigo: 'Pergunta 12',
        descricao: 'IRPJ: acrescimo a partir do 1. trimestre/2026.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/ecf/perguntas-e-respostas',
      },
    ],
    variaveis: [
      {
        nome: 'Presuncao_Normal',
        descricao: 'Percentual de presuncao da atividade (8%, 16%, 32%)',
        tipo: 'percentual',
        exemplo: '32%',
      },
      {
        nome: 'Fator_Acrescimo',
        descricao: 'Multiplicador de 1,10 (10% de acrescimo)',
        tipo: 'numero',
        exemplo: '1,10',
      },
    ],
    exemplo_numerico: {
      titulo: 'Servicos com presuncao de 32%',
      dados_entrada: {
        presuncao_normal: 32,
        excedente: 500000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular presuncao acrescida',
          formula: '32% x 1,10 = 35,2%',
          calculo: '0,32 x 1,10',
          resultado: '35,2%',
        },
        {
          ordem: 2,
          descricao: 'Aplicar sobre o excedente',
          formula: 'Base = Excedente x 35,2%',
          calculo: '500.000 x 0,352',
          resultado: 'R$ 176.000,00',
        },
      ],
      resultado_final: {
        base_irpj_excedente: 176000,
        diferenca_vs_normal: 16000,
      },
    },
    observacoes: [
      'O acrescimo incide sobre a presuncao, nao diretamente sobre a aliquota do IRPJ (15%).',
      'O adicional de IRPJ (10% sobre lucro > R$ 60k/trim) e calculado sobre a base ja com acrescimo.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['irpj', 'acrescimo', '2026'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Aplicavel a partir do 1. trimestre de 2026',
    },
    alertas: [
      {
        tipo: 'atencao',
        mensagem: 'Diferente da CSLL, o IRPJ aplica acrescimo ja no 1. trimestre/2026.',
      },
    ],
  },
  {
    id: 'in2306-acrescimo-csll',
    modulo: 'simulador-in-2306',
    nome: 'Acrescimo 10% CSLL',
    descricao:
      'O acrescimo de 10% sobre a presuncao da CSLL e aplicado a partir do 2. trimestre de 2026, conforme Pergunta 12 da Receita Federal. O limite anual para 2026 e de R$ 3.750.000 (3/4 do limite pleno).',
    formula: 'Limite\\_Anual\\_CSLL\\_2026 = R\\$ 5.000.000 \\times \\frac{3}{4} = R\\$ 3.750.000',
    formula_explicada:
      'Como a CSLL so comeca a aplicar acrescimo no 2. trimestre, o limite anual e proporcional: 3/4 de R$ 5M.',
    embasamento_legal: [
      {
        norma: 'IN RFB n. 2.306/2026',
        artigo: 'Art. 15',
        paragrafo: 'caput',
        descricao: 'Estabelece o acrescimo de 10% na presuncao para CSLL.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/lucro-presumido',
      },
      {
        norma: 'Receita Federal - Perguntas e Respostas',
        artigo: 'Pergunta 12',
        descricao: 'CSLL: acrescimo a partir do 2. trimestre/2026.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/ecf/perguntas-e-respostas',
      },
      {
        norma: 'Receita Federal - Perguntas e Respostas',
        artigo: 'Pergunta 13',
        descricao: 'Limite anual CSLL 2026 = R$ 3.750.000 (3/4 do limite pleno).',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/ecf/perguntas-e-respostas',
      },
    ],
    variaveis: [
      {
        nome: 'Limite_Anual_CSLL_2026',
        descricao: 'Limite anual reduzido para CSLL em 2026',
        tipo: 'moeda',
        exemplo: 'R$ 3.750.000,00',
      },
      {
        nome: 'Trimestre_Inicio',
        descricao: 'Trimestre a partir do qual o acrescimo CSLL e aplicado',
        tipo: 'numero',
        exemplo: '2',
      },
    ],
    exemplo_numerico: {
      titulo: 'CSLL com receita de R$ 2.000.000 no T2/2026',
      dados_entrada: {
        receita_t2: 2000000,
        limite_trimestral: 1250000,
        presuncao_csll: 32,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular excedente sobre limite trimestral',
          formula: 'Excedente = Receita - Limite',
          calculo: '2.000.000 - 1.250.000',
          resultado: 'R$ 750.000,00',
        },
        {
          ordem: 2,
          descricao: 'Base CSLL sobre limite (sem acrescimo)',
          formula: 'Base_Normal = Limite x 32%',
          calculo: '1.250.000 x 0,32',
          resultado: 'R$ 400.000,00',
        },
        {
          ordem: 3,
          descricao: 'Base CSLL sobre excedente (com acrescimo 10%)',
          formula: 'Base_Acrescida = Excedente x 35,2%',
          calculo: '750.000 x 0,352',
          resultado: 'R$ 264.000,00',
        },
        {
          ordem: 4,
          descricao: 'Calcular CSLL devida',
          formula: 'CSLL = Base_Total x 9%',
          calculo: '664.000 x 0,09',
          resultado: 'R$ 59.760,00',
        },
      ],
      resultado_final: {
        base_csll_total: 664000,
        csll_devida: 59760,
        acrescimo_csll: 2376,
      },
    },
    observacoes: [
      'No 1. trimestre/2026, a CSLL NAO sofre acrescimo, mesmo que a receita exceda o limite.',
      'O ajuste anual (§ 5.) considera o limite de R$ 3.750.000 para CSLL em 2026.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['csll', 'acrescimo', '2026'],
    vigencia: {
      inicio: '2026-04-01',
      observacao: 'Aplicavel a partir do 2. trimestre de 2026 (abril)',
    },
    alertas: [
      {
        tipo: 'critico',
        mensagem: 'CSLL so aplica acrescimo a partir do 2. trimestre/2026. O 1. trimestre e isento do acrescimo.',
      },
      {
        tipo: 'importante',
        mensagem: 'O limite anual de CSLL em 2026 e R$ 3.750.000 (3/4 do limite pleno de R$ 5M).',
      },
    ],
  },
  {
    id: 'in2306-proporcao-atividade',
    modulo: 'simulador-in-2306',
    nome: 'Calculo Proporcional por Atividade',
    descricao:
      'Quando a empresa possui multiplos tipos de atividade, o limite trimestral e distribuido proporcionalmente entre elas. Cada atividade tem seu proprio limite proporcional e excedente.',
    formula: 'Limite\\_Atividade = R\\$ 1.250.000 \\times \\frac{Receita\\_Atividade}{Receita\\_Total}',
    formula_explicada:
      'O limite de R$ 1.250.000 e rateado pela participacao de cada atividade na receita total do trimestre.',
    embasamento_legal: [
      {
        norma: 'IN RFB n. 2.306/2026',
        artigo: 'Art. 15',
        paragrafo: '§ 6.',
        descricao: 'Estabelece o calculo proporcional por tipo de atividade.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/lucro-presumido',
      },
      {
        norma: 'Receita Federal - Perguntas e Respostas',
        artigo: 'Pergunta 14',
        descricao: 'Confirma a aplicacao proporcional do limite por atividade.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/orientacao-tributaria/declaracoes-e-demonstrativos/ecf/perguntas-e-respostas',
      },
    ],
    variaveis: [
      {
        nome: 'Receita_Atividade',
        descricao: 'Receita da atividade especifica (produtos, servicos, etc.)',
        tipo: 'moeda',
      },
      {
        nome: 'Receita_Total',
        descricao: 'Soma de todas as receitas do trimestre',
        tipo: 'moeda',
      },
      {
        nome: 'Participacao_Pct',
        descricao: 'Percentual de participacao da atividade na receita total',
        tipo: 'percentual',
      },
    ],
    exemplo_numerico: {
      titulo: 'Empresa com receita mista: produtos + servicos',
      dados_entrada: {
        receita_produtos: 800000,
        receita_servicos: 1200000,
        receita_total: 2000000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular participacao de cada atividade',
          calculo: 'Produtos: 800k/2M = 40%; Servicos: 1,2M/2M = 60%',
          resultado: 'Produtos 40%, Servicos 60%',
        },
        {
          ordem: 2,
          descricao: 'Calcular limite proporcional de cada atividade',
          formula: 'Limite_Prop = 1.250.000 x Participacao',
          calculo: 'Produtos: 1,25M x 40% = 500k; Servicos: 1,25M x 60% = 750k',
          resultado: 'Limite Produtos: R$ 500k; Limite Servicos: R$ 750k',
        },
        {
          ordem: 3,
          descricao: 'Calcular excedente de cada atividade',
          calculo: 'Produtos: 800k - 500k = 300k; Servicos: 1,2M - 750k = 450k',
          resultado: 'Excedente Produtos: R$ 300k; Excedente Servicos: R$ 450k',
        },
      ],
      resultado_final: {
        excedente_produtos: 300000,
        excedente_servicos: 450000,
        excedente_total: 750000,
      },
    },
    observacoes: [
      'Cada atividade aplica seu proprio percentual de presuncao sobre o limite e excedente.',
      'O acrescimo de 10% incide apenas sobre os excedentes proporcionais.',
      'IRPJ: acrescimo de 10% a partir do 1o trimestre de 2026 (Pergunta 12 RF).',
      'CSLL: acrescimo de 10% a partir do 2o trimestre de 2026 (Pergunta 12 RF).',
      'A tabela de proporcao mostra os percentuais no formato "normal% / acrescimo%".',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['proporcao', 'atividade', 'rateio'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Aplicavel a partir do exercicio fiscal 2026',
    },
    alertas: [
      {
        tipo: 'atencao',
        mensagem: 'Empresas com receitas mistas devem calcular o limite proporcional para cada tipo de atividade.',
      },
      {
        tipo: 'importante',
        mensagem: 'O timing do acrescimo difere: IRPJ desde o 1o trim/2026, CSLL desde o 2o trim/2026 (Pergunta 12 RF).',
      },
    ],
  },
  {
    id: 'in2306-adicional-irpj',
    modulo: 'simulador-in-2306',
    nome: 'Adicional de IRPJ 10%',
    descricao:
      'O adicional de IRPJ de 10% incide sobre a parcela do lucro presumido trimestral que exceder R$ 60.000. Este calculo e independente do acrescimo IN 2.306.',
    formula: 'Adicional = (Base\\_IRPJ - R\\$ 60.000) \\times 10\\%',
    formula_explicada:
      'Se a base de calculo do IRPJ no trimestre for maior que R$ 60.000, o excedente e tributado a 10% adicional.',
    embasamento_legal: [
      {
        norma: 'Lei n. 9.249/1995',
        artigo: 'Art. 3.',
        inciso: 'II',
        descricao: 'Estabelece o adicional de IRPJ de 10% sobre lucro trimestral excedente.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l9249.htm',
      },
      {
        norma: 'Decreto n. 9.580/2018 (RIR)',
        artigo: 'Art. 225',
        descricao: 'Regulamenta o adicional de IRPJ no Lucro Presumido.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Base_IRPJ',
        descricao: 'Base de calculo do IRPJ no trimestre (receita x presuncao)',
        tipo: 'moeda',
      },
      {
        nome: 'Limite_Adicional',
        descricao: 'Limite trimestral de R$ 60.000 para adicional',
        tipo: 'moeda',
        exemplo: 'R$ 60.000,00',
      },
      {
        nome: 'Aliquota_Adicional',
        descricao: 'Aliquota fixa de 10%',
        tipo: 'percentual',
        exemplo: '10%',
      },
    ],
    exemplo_numerico: {
      titulo: 'Base IRPJ de R$ 160.000 no trimestre',
      dados_entrada: {
        base_irpj: 160000,
        limite_adicional: 60000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular excedente sobre R$ 60.000',
          formula: 'Excedente = Base - 60.000',
          calculo: '160.000 - 60.000',
          resultado: 'R$ 100.000,00',
        },
        {
          ordem: 2,
          descricao: 'Aplicar adicional de 10%',
          formula: 'Adicional = Excedente x 10%',
          calculo: '100.000 x 0,10',
          resultado: 'R$ 10.000,00',
        },
      ],
      resultado_final: {
        irpj_normal: 24000,
        adicional_irpj: 10000,
        irpj_total: 34000,
      },
    },
    observacoes: [
      'O limite mensal equivalente e R$ 20.000 (R$ 60.000 / 3 meses).',
      'O adicional e calculado sobre a base ja com acrescimo IN 2.306, se aplicavel.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['adicional', 'irpj', '10-porcento'],
    vigencia: {
      inicio: '1996-01-01',
      observacao: 'Regra vigente desde a Lei 9.249/95, independente da IN 2.306',
    },
  },
  {
    id: 'in2306-ajuste-anual-5-i',
    modulo: 'simulador-in-2306',
    nome: 'Ajuste Anual § 5. I - Isencao',
    descricao:
      'Se a receita bruta anual for igual ou inferior a R$ 5.000.000 (IRPJ) ou R$ 3.750.000 (CSLL 2026), o acrescimo de 10% nao incide. A diferenca paga a maior nos trimestres anteriores e compensada no 4. trimestre.',
    formula: 'Se\\;Receita\\_Anual \\leq R\\$ 5.000.000 \\Rightarrow Acrescimo = 0',
    formula_explicada:
      'Ao fechar o ano, se a receita anual ficar abaixo do limite, o contribuinte tem direito a compensacao do que pagou a mais.',
    embasamento_legal: [
      {
        norma: 'IN RFB n. 2.306/2026',
        artigo: 'Art. 15',
        paragrafo: '§ 5.',
        inciso: 'I',
        descricao: 'Nao incidencia do acrescimo se receita anual <= limite.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/lucro-presumido',
      },
    ],
    variaveis: [
      {
        nome: 'Receita_Anual',
        descricao: 'Soma das receitas brutas dos 4 trimestres',
        tipo: 'moeda',
      },
      {
        nome: 'Limite_Anual_IRPJ',
        descricao: 'R$ 5.000.000 para IRPJ',
        tipo: 'moeda',
      },
      {
        nome: 'Limite_Anual_CSLL_2026',
        descricao: 'R$ 3.750.000 para CSLL em 2026',
        tipo: 'moeda',
      },
    ],
    exemplo_numerico: {
      titulo: 'Empresa com receita anual de R$ 4.800.000',
      dados_entrada: {
        receita_t1: 1500000,
        receita_t2: 1400000,
        receita_t3: 1300000,
        receita_t4: 600000,
        receita_anual: 4800000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Verificar se receita anual excede limite',
          calculo: '4.800.000 <= 5.000.000?',
          resultado: 'Sim, nao excede',
        },
        {
          ordem: 2,
          descricao: 'Calcular valor pago a maior (T1, T2, T3 tiveram acrescimo)',
          calculo: 'Soma das diferencas entre valor com e sem acrescimo',
          resultado: 'Compensacao no T4',
        },
      ],
      resultado_final: {
        incide_acrescimo: 'Nao',
        compensacao_t4: 'Deduzir diferenca do IRPJ/CSLL a pagar',
      },
    },
    observacoes: [
      'A compensacao ocorre automaticamente no calculo do 4. trimestre.',
      'Se o T4 nao comportar toda a compensacao, gera credito tributario.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['ajuste-anual', 'compensacao', 'isencao'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Verificacao realizada no 4. trimestre de cada exercicio',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'A isencao do acrescimo so e confirmada ao final do ano. Pague normalmente nos trimestres anteriores.',
      },
    ],
  },
  {
    id: 'in2306-ajuste-anual-5-ii',
    modulo: 'simulador-in-2306',
    nome: 'Ajuste Anual § 5. II - Rateio Proporcional',
    descricao:
      'Se a receita anual exceder o limite, mas o excedente anual for menor que a soma dos excedentes trimestrais, recalcula-se proporcionalmente o acrescimo de cada trimestre.',
    formula: 'Novo\\_Excedente_i = \\frac{Excedente_i}{\\sum Excedentes_{T1-T3}} \\times Excedente\\_Anual',
    formula_explicada:
      'Cada trimestre tem seu excedente recalculado pela razao entre seu excedente original e o excedente anual efetivo.',
    embasamento_legal: [
      {
        norma: 'IN RFB n. 2.306/2026',
        artigo: 'Art. 15',
        paragrafo: '§ 5.',
        inciso: 'II',
        descricao: 'Recalculo proporcional quando excedente anual < soma excedentes trimestrais.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/lucro-presumido',
      },
    ],
    variaveis: [
      {
        nome: 'Excedente_i',
        descricao: 'Excedente original do trimestre i',
        tipo: 'moeda',
      },
      {
        nome: 'Soma_Excedentes_T1_T3',
        descricao: 'Soma dos excedentes dos trimestres 1, 2 e 3',
        tipo: 'moeda',
      },
      {
        nome: 'Excedente_Anual',
        descricao: 'Receita anual menos limite anual',
        tipo: 'moeda',
      },
      {
        nome: 'Razao_i',
        descricao: 'Participacao do trimestre i no total de excedentes',
        tipo: 'percentual',
      },
    ],
    exemplo_numerico: {
      titulo: 'Empresa com receita anual de R$ 5.500.000',
      dados_entrada: {
        receita_t1: 1600000,
        receita_t2: 1500000,
        receita_t3: 1400000,
        receita_t4: 1000000,
        receita_anual: 5500000,
        limite_anual: 5000000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular excedentes trimestrais originais',
          calculo: 'T1: 1,6M-1,25M=350k; T2: 1,5M-1,25M=250k; T3: 1,4M-1,25M=150k',
          resultado: 'Soma T1-T3: R$ 750.000',
        },
        {
          ordem: 2,
          descricao: 'Calcular excedente anual efetivo',
          formula: 'Excedente_Anual = Receita_Anual - Limite_Anual',
          calculo: '5.500.000 - 5.000.000',
          resultado: 'R$ 500.000',
        },
        {
          ordem: 3,
          descricao: 'Recalcular excedentes proporcionalmente',
          formula: 'Novo_Exc_i = (Exc_i / Soma_T1T3) x Exc_Anual',
          calculo: 'T1: (350k/750k) x 500k = 233k; T2: (250k/750k) x 500k = 167k; T3: (150k/750k) x 500k = 100k',
          resultado: 'Novos excedentes: T1=233k, T2=167k, T3=100k',
        },
        {
          ordem: 4,
          descricao: 'Calcular compensacao',
          calculo: 'Diferenca entre acrescimo original e recalculado',
          resultado: 'Compensar diferenca no T4',
        },
      ],
      resultado_final: {
        excedente_anual_efetivo: 500000,
        compensacao_estimada: 'Proporcional a diferenca',
      },
    },
    observacoes: [
      'Este ajuste so se aplica quando ha excedente anual, mas menor que a soma dos trimestrais.',
      'A diferenca entre o valor pago e o recalculado e compensada no 4. trimestre.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['ajuste-anual', 'rateio', 'proporcional'],
    vigencia: {
      inicio: '2026-01-01',
      observacao: 'Verificacao realizada no 4. trimestre de cada exercicio',
    },
    alertas: [
      {
        tipo: 'atencao',
        mensagem: 'O rateio proporcional evita que o contribuinte pague mais acrescimo do que o devido pelo excedente anual.',
      },
    ],
  },
  {
    id: 'in2306-presuncoes-atividade',
    modulo: 'simulador-in-2306',
    nome: 'Percentuais de Presuncao por Atividade',
    descricao:
      'O Lucro Presumido utiliza diferentes percentuais de presuncao conforme o tipo de atividade. O acrescimo IN 2.306 incide sobre estes percentuais.',
    embasamento_legal: [
      {
        norma: 'Lei n. 9.249/1995',
        artigo: 'Art. 15',
        descricao: 'Percentuais de presuncao IRPJ.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l9249.htm',
      },
      {
        norma: 'Lei n. 9.249/1995',
        artigo: 'Art. 20',
        descricao: 'Percentuais de presuncao CSLL.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l9249.htm',
      },
      {
        norma: 'LC n. 224/2025',
        artigo: 'Art. 1.',
        descricao: 'Equiparacao hospitalar (IRPJ 8%, CSLL 12% para servicos hospitalares).',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Produtos_Mercadorias',
        descricao: 'IRPJ 8%, CSLL 12%',
        tipo: 'texto',
      },
      {
        nome: 'Servicos_Gerais',
        descricao: 'IRPJ 32%, CSLL 32%',
        tipo: 'texto',
      },
      {
        nome: 'Servicos_Favorecida',
        descricao: 'IRPJ 16%, CSLL 32% (lista favorecida)',
        tipo: 'texto',
      },
      {
        nome: 'Servicos_Hospitalares',
        descricao: 'IRPJ 8%, CSLL 12% (equiparacao hospitalar)',
        tipo: 'texto',
      },
      {
        nome: 'Demais_Receitas',
        descricao: 'IRPJ 100%, CSLL 100%',
        tipo: 'texto',
      },
    ],
    exemplo_numerico: {
      titulo: 'Comparativo de presuncao por atividade - Receita R$ 1.000.000',
      dados_entrada: {
        receita: 1000000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Produtos/Mercadorias',
          calculo: 'IRPJ: 1M x 8% = 80k; CSLL: 1M x 12% = 120k',
          resultado: 'Base IRPJ: R$ 80.000 | Base CSLL: R$ 120.000',
        },
        {
          ordem: 2,
          descricao: 'Servicos Gerais',
          calculo: 'IRPJ: 1M x 32% = 320k; CSLL: 1M x 32% = 320k',
          resultado: 'Base IRPJ: R$ 320.000 | Base CSLL: R$ 320.000',
        },
        {
          ordem: 3,
          descricao: 'Servicos Hospitalares (LC 224)',
          calculo: 'IRPJ: 1M x 8% = 80k; CSLL: 1M x 12% = 120k',
          resultado: 'Base IRPJ: R$ 80.000 | Base CSLL: R$ 120.000',
        },
        {
          ordem: 4,
          descricao: 'Servicos Lista Favorecida',
          calculo: 'IRPJ: 1M x 16% = 160k; CSLL: 1M x 32% = 320k',
          resultado: 'Base IRPJ: R$ 160.000 | Base CSLL: R$ 320.000',
        },
      ],
      resultado_final: {
        menor_carga: 'Produtos/Mercadorias ou Hospitalares',
        maior_carga: 'Servicos Gerais',
      },
    },
    observacoes: [
      'Com acrescimo IN 2.306: multiplicar presuncao por 1,10 (ex: 32% -> 35,2%).',
      'Equiparacao hospitalar (LC 224/2025): servicos de saude com 8% IRPJ e 12% CSLL.',
      'Lista favorecida: atividades especificas com IRPJ 16% (transporte, imobiliarias, etc.).',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['presuncao', 'atividade', 'percentual'],
    vigencia: {
      inicio: '1996-01-01',
      observacao: 'Percentuais base vigentes desde Lei 9.249/95. LC 224/2025 incluiu equiparacao hospitalar.',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'Servicos hospitalares com equiparacao LC 224/2025 tem presuncao reduzida (8%/12%), igual a produtos.',
      },
    ],
  },
  {
    id: 'in2306-retencoes',
    modulo: 'simulador-in-2306',
    nome: 'Deducao de Retencoes no Imposto a Recolher',
    descricao:
      'As retencoes na fonte (IRRF e demais retencoes) sao deduzidas do valor do imposto calculado para determinar o imposto efetivamente a recolher. Isso evita bitributacao sobre valores ja retidos.',
    formula: 'IRPJ\\_a\\_Rec = IRPJ + Adicional - IRRF - Demais\\_Retencoes',
    formula_explicada:
      'O IRPJ a recolher e calculado subtraindo do imposto bruto (IRPJ + adicional) as retencoes ja sofridas (IRRF e outras retencoes como PIS/COFINS/CSLL retidos).',
    embasamento_legal: [
      {
        norma: 'Decreto n. 9.580/2018 (RIR)',
        artigo: 'Art. 229',
        descricao: 'Compensacao do IRRF com o IRPJ devido.',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/decreto/d9580.htm',
      },
      {
        norma: 'Lei n. 10.833/2003',
        artigo: 'Art. 30',
        descricao: 'Retencoes de PIS, COFINS e CSLL por orgaos publicos e grandes empresas.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/2003/l10.833.htm',
      },
      {
        norma: 'IN RFB n. 1.234/2012',
        artigo: 'Art. 1.',
        descricao: 'Disciplina as retencoes de tributos federais por orgaos publicos.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/retencoes-na-fonte',
      },
    ],
    variaveis: [
      {
        nome: 'IRPJ',
        descricao: 'Imposto de Renda calculado (Base x 15%)',
        tipo: 'moeda',
        exemplo: 'R$ 24.000,00',
      },
      {
        nome: 'Adicional',
        descricao: 'Adicional de IRPJ 10% sobre base > R$ 60k/trim',
        tipo: 'moeda',
        exemplo: 'R$ 10.000,00',
      },
      {
        nome: 'IRRF',
        descricao: 'Imposto de Renda Retido na Fonte sobre receitas',
        tipo: 'moeda',
        exemplo: 'R$ 5.000,00',
      },
      {
        nome: 'Demais_Retencoes',
        descricao: 'Outras retencoes (PIS, COFINS, CSLL retidos por orgaos publicos ou grandes empresas)',
        tipo: 'moeda',
        exemplo: 'R$ 3.000,00',
      },
    ],
    exemplo_numerico: {
      titulo: 'Calculo do IRPJ a recolher com retencoes',
      dados_entrada: {
        irpj_bruto: 24000,
        adicional_irpj: 10000,
        irrf: 5000,
        demais_retencoes: 3000,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Somar IRPJ e adicional',
          formula: 'IRPJ_Total = IRPJ + Adicional',
          calculo: '24.000 + 10.000',
          resultado: 'R$ 34.000,00',
        },
        {
          ordem: 2,
          descricao: 'Somar todas as retencoes',
          formula: 'Retencoes_Total = IRRF + Demais',
          calculo: '5.000 + 3.000',
          resultado: 'R$ 8.000,00',
        },
        {
          ordem: 3,
          descricao: 'Calcular IRPJ a recolher',
          formula: 'IRPJ_a_Rec = IRPJ_Total - Retencoes_Total',
          calculo: '34.000 - 8.000',
          resultado: 'R$ 26.000,00',
        },
      ],
      resultado_final: {
        irpj_a_recolher: 26000,
        descricao: 'O contribuinte recolhe R$ 26.000, pois ja teve R$ 8.000 retidos na fonte.',
      },
    },
    observacoes: [
      'As retencoes devem ser informadas por trimestre para calculo correto.',
      'Se nao informadas, o imposto a recolher sera igual ao imposto calculado.',
      'O IRRF e deduzido do IRPJ; demais retencoes tambem podem ser compensadas.',
      'Retencoes superiores ao imposto devido geram credito a compensar ou restituir.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['retencoes', 'irrf', 'compensacao', 'imposto-a-recolher'],
    vigencia: {
      inicio: '2003-01-01',
      observacao: 'Regime de retencoes por orgaos publicos vigente desde Lei 10.833/2003.',
    },
    alertas: [
      {
        tipo: 'atencao',
        mensagem: 'Informe as retencoes por trimestre para que o simulador calcule corretamente o imposto a recolher.',
      },
      {
        tipo: 'importante',
        mensagem: 'Se as retencoes nao forem informadas, os valores "a recolher" podem ser superiores ao efetivamente devido.',
      },
    ],
  },
];
