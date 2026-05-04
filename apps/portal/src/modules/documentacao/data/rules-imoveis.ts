import type { RuleDocumentation } from '@shared/types/documentation';

export const rulesImoveis: RuleDocumentation[] = [
  {
    id: 'imoveis-carne-leao',
    modulo: 'simulador-imoveis',
    nome: 'Carne-Leao PF (Tabela Progressiva 2026)',
    descricao:
      'Pessoa Fisica que recebe alugueis deve calcular o IR mensal pelo carne-leao, aplicando a tabela progressiva sobre o rendimento liquido (receita menos despesas dedutiveis).',
    formula: 'IR = (Base \\times Aliquota) - Deducao',
    formula_explicada:
      'Subtrai as despesas dedutiveis da receita para obter a base. Aplica a aliquota da faixa correspondente e subtrai a deducao fixa.',
    embasamento_legal: [
      {
        norma: 'Lei n. 7.713/1988',
        artigo: 'Art. 3.',
        descricao: 'Tributacao de rendimentos de alugueis na Pessoa Fisica.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l7713.htm',
      },
      {
        norma: 'IN RFB n. 1.500/2014',
        artigo: 'Art. 53',
        descricao: 'Regulamenta a apuracao do carne-leao.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/carne-leao',
      },
      {
        norma: 'Lei n. 14.663/2023',
        artigo: 'Art. 1.',
        descricao: 'Atualiza a tabela progressiva do IRPF (faixa de isencao ampliada).',
        url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14663.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Receita_Mensal',
        descricao: 'Valor bruto recebido de alugueis no mes',
        tipo: 'moeda',
      },
      {
        nome: 'Despesas_Dedutiveis',
        descricao:
          'Despesas dedutiveis anuais: IPTU (valor total anual, inserido em Janeiro no simulador), ' +
          'Seguro do imovel (premio anual, inserido em Janeiro no simulador), ' +
          'Condominio — somente quando pago pelo locador/proprietario; se assumido pelo locatario, nao e dedutivel (art. 47, Lei n. 7.739/1989). ' +
          'Tambem sao dedutiveis: juros de financiamento, manutencao e conservacao.',
        tipo: 'moeda',
      },
      {
        nome: 'Base_Calculo',
        descricao: 'Receita menos despesas dedutiveis',
        tipo: 'moeda',
      },
    ],
    exemplo_numerico: {
      titulo: 'Aluguel mensal de R$ 5.000 com despesas de R$ 800',
      dados_entrada: {
        receita: 5000,
        despesas: 800,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular base de calculo',
          formula: 'Base = Receita - Despesas',
          calculo: '5.000 - 800',
          resultado: 'R$ 4.200,00',
        },
        {
          ordem: 2,
          descricao: 'Identificar faixa (R$ 3.751,06 a R$ 4.664,68)',
          resultado: 'Aliquota 22,5%, Deducao R$ 675,49',
        },
        {
          ordem: 3,
          descricao: 'Calcular IR',
          formula: 'IR = (4.200 x 22,5%) - 675,49',
          calculo: '945 - 675,49',
          resultado: 'R$ 269,51',
        },
      ],
      resultado_final: {
        ir_mensal: 269.51,
        aliquota_efetiva: 6.42,
      },
    },
    observacoes: [
      'Tabela 2026: Ate R$ 2.428,80 = isento; Ate R$ 2.826,65 = 7,5%; Ate R$ 3.751,05 = 15%; Ate R$ 4.664,68 = 22,5%; Acima = 27,5%',
      'O IR e pago mensalmente via DARF codigo 0190.',
      'Na declaracao anual, o carne-leao pago e compensado.',
      'IPTU e Seguro do imovel sao despesas anuais — no simulador, o valor total anual e inserido uma unica vez (concentrado em Janeiro). O total dedutivel ao longo do ano e o mesmo.',
      'Condominio e dedutivel apenas quando pago pelo locador (proprietario). Se assumido pelo locatario, nao reduz a base de calculo do carne-leao.',
    ],
    ultima_atualizacao: '2026-04-07',
    tags: ['pf', 'carne-leao', 'aluguel'],
    vigencia: {
      inicio: '2024-05-01',
      observacao: 'Tabela atualizada pela Lei 14.663/2023',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'O carne-leao deve ser pago ate o ultimo dia util do mes seguinte ao recebimento.',
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
    id: 'imoveis-lucro-presumido',
    modulo: 'simulador-imoveis',
    nome: 'Lucro Presumido PJ (Locacao de Imoveis)',
    descricao:
      'Pessoa Juridica no Lucro Presumido aplica presuncao de 32% para IRPJ e CSLL sobre receitas de locacao. Quando a receita total anual ja e conhecida e superior a R$ 120.000, aplica-se 32% em todos os trimestres desde o 1. Se a receita anual for ate R$ 120.000, aplica-se presuncao reduzida de 16% para IRPJ (ate o acumulado ultrapassar 120k, quando passa a 32% e recolhe a diferenca).',
    formula: 'Base\\_IRPJ = Receita \\times 32\\%\\;(ou\\;16\\%\\;se\\;receita\\;anual\\;\\leq 120k)',
    formula_explicada:
      'Se receita anual conhecida > R$ 120.000: 32% em todos os trimestres. Se receita anual <= R$ 120.000: 16% IRPJ nos trimestres em que o acumulado nao ultrapassou 120k; acima disso, 32% e imposto postergado.',
    embasamento_legal: [
      {
        norma: 'Lei nº 9.249/1995',
        artigo: 'Art. 15',
        paragrafo: '§ 1º, III, a',
        descricao: 'Presunção de 32% para prestação de serviços em geral (inclui locação).',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l9249.htm',
      },
      {
        norma: 'Lei nº 9.249/1995',
        artigo: 'Art. 15',
        paragrafo: '§ 7º',
        descricao: 'Presunção de 16% para receita até R$ 120.000 anuais (locação de imóveis).',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l9249.htm',
      },
      {
        norma: 'Lei nº 9.249/1995',
        artigo: 'Art. 15',
        paragrafo: '§ 8º',
        descricao: 'Imposto postergado se ultrapassar R$ 120.000 durante o ano.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l9249.htm',
      },
      {
        norma: 'Lei nº 9.249/1995',
        artigo: 'Art. 20',
        descricao: 'Presunção CSLL para locação de imóveis (32%).',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l9249.htm',
      },
      {
        norma: 'IN RFB nº 1.700/2017',
        artigo: 'Art. 33',
        paragrafo: '§ 7º',
        descricao: 'Regulamenta a aplicação da presunção de 16% para receita até R$ 120.000 anuais.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/lucro-presumido',
      },
    ],
    variaveis: [
      {
        nome: 'Presuncao_Normal',
        descricao: 'Percentual de 32% (IRPJ e CSLL)',
        tipo: 'percentual',
      },
      {
        nome: 'Presuncao_Reduzida',
        descricao: 'Percentual de 16% (IRPJ) para receita ate R$ 120k/ano',
        tipo: 'percentual',
      },
      {
        nome: 'Limite_Anual',
        descricao: 'R$ 120.000 para presuncao reduzida',
        tipo: 'moeda',
      },
    ],
    exemplo_numerico: {
      titulo: 'PJ com receita de R$ 100.000 anuais',
      dados_entrada: {
        receita_anual: 100000,
        regime: 'lucro_presumido',
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Verificar se cabe presuncao reduzida',
          calculo: '100.000 <= 120.000',
          resultado: 'Sim, aplica 16% IRPJ',
        },
        {
          ordem: 2,
          descricao: 'Calcular base IRPJ',
          formula: 'Base = Receita x 16%',
          calculo: '100.000 x 16%',
          resultado: 'R$ 16.000,00',
        },
        {
          ordem: 3,
          descricao: 'Calcular tributos',
          calculo: 'IRPJ: 16k x 15% = 2,4k; CSLL: 32k x 9% = 2,88k; PIS/COFINS: 3,65%',
          resultado: 'Carga total estimada: ~11,33%',
        },
      ],
      resultado_final: {
        base_irpj: 16000,
        irpj: 2400,
        csll: 2880,
        pis_cofins: 3650,
        total_tributos: 8930,
      },
    },
    observacoes: [
      'Quando a receita total anual ja e conhecida e superior a R$ 120.000, o sistema aplica 32% em todos os trimestres (sem 16% e sem imposto postergado).',
      'Se ultrapassar R$ 120k no ano, recolhe diferenca retroativa (§ 8.).',
      'CSLL sempre usa 32% de presuncao para locacao.',
      'PIS (0,65%) e COFINS (3%) incidem sobre a receita bruta.',
    ],
    ultima_atualizacao: '2026-03-15',
    tags: ['pj', 'lucro-presumido', 'locacao'],
    vigencia: {
      inicio: '1996-01-01',
      observacao: 'Vigente desde a Lei 9.249/95',
    },
    alertas: [
      {
        tipo: 'atencao',
        mensagem: 'Se ultrapassar R$ 120k durante o ano, deve recolher a diferenca de IRPJ retroativamente.',
      },
    ],
  },
  {
    id: 'imoveis-equiparacao-hospitalar',
    modulo: 'simulador-imoveis',
    nome: 'Equiparacao Hospitalar (LC 224/2025)',
    descricao:
      'A LC 224/2025 permite que servicos de saude e atividades hospitalares utilizem presuncao reduzida: 8% para IRPJ e 12% para CSLL, em vez dos 32% padrao.',
    formula: 'Base\\_IRPJ = Receita \\times 8\\%;\\;Base\\_CSLL = Receita \\times 12\\%',
    embasamento_legal: [
      {
        norma: 'LC n. 224/2025',
        artigo: 'Art. 1.',
        descricao: 'Altera a Lei 9.249/95 para incluir equiparacao hospitalar.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp224.htm',
      },
      {
        norma: 'Lei n. 9.249/1995',
        artigo: 'Art. 15',
        paragrafo: '§ 1., III, a',
        descricao: 'Presuncao de 8% para servicos hospitalares.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l9249.htm',
      },
      {
        norma: 'IN RFB n. 2.306/2026',
        artigo: 'Art. 4.',
        descricao: 'Regulamenta a aplicacao da equiparacao hospitalar.',
        url: 'https://www.gov.br/receitafederal/pt-br/assuntos/legislacao/legislacao-por-assunto/lucro-presumido',
      },
      {
        norma: 'RDC Anvisa n. 50/2002',
        descricao: 'Requisitos tecnicos para estabelecimentos de saude.',
        url: 'https://www.gov.br/anvisa/pt-br',
      },
    ],
    variaveis: [
      {
        nome: 'Presuncao_IRPJ',
        descricao: 'Percentual de 8% (vs. 32% padrao)',
        tipo: 'percentual',
      },
      {
        nome: 'Presuncao_CSLL',
        descricao: 'Percentual de 12% (vs. 32% padrao)',
        tipo: 'percentual',
      },
    ],
    exemplo_numerico: {
      titulo: 'Clinica medica com receita de R$ 1.000.000',
      dados_entrada: {
        receita_anual: 1000000,
        tipo: 'clinica_equiparada',
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular base IRPJ com equiparacao',
          formula: 'Base_IRPJ = Receita x 8%',
          calculo: '1.000.000 x 8%',
          resultado: 'R$ 80.000,00',
        },
        {
          ordem: 2,
          descricao: 'Calcular base CSLL com equiparacao',
          formula: 'Base_CSLL = Receita x 12%',
          calculo: '1.000.000 x 12%',
          resultado: 'R$ 120.000,00',
        },
        {
          ordem: 3,
          descricao: 'Comparar com regime padrao (32%)',
          calculo: 'Padrao: Base 320k; Equiparada: Base 80k/120k',
          resultado: 'Economia de ~75% na base de IRPJ',
        },
        {
          ordem: 4,
          descricao: 'Calcular tributos totais',
          calculo: 'IRPJ: 12k + 2k adic; CSLL: 10,8k; PIS/COFINS: 36,5k',
          resultado: 'Carga total: ~6,13% (vs ~14% sem equiparacao)',
        },
      ],
      resultado_final: {
        base_irpj: 80000,
        base_csll: 120000,
        irpj_total: 14000,
        csll: 10800,
        pis_cofins: 36500,
        total_tributos: 61300,
        economia_vs_padrao: 78700,
      },
    },
    observacoes: [
      'Aplicavel a servicos hospitalares, laboratorios, clinicas com internacao.',
      'Reduz significativamente a carga tributaria comparado ao padrao de 32%.',
      'Deve atender aos requisitos da Anvisa e legislacao sanitaria.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['equiparacao', 'hospitalar', 'saude'],
    vigencia: {
      inicio: '2025-01-01',
      observacao: 'Vigente a partir da publicacao da LC 224/2025',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'A equiparacao hospitalar exige cumprimento de requisitos da Anvisa e registro no CNES.',
      },
      {
        tipo: 'atencao',
        mensagem: 'Clinicas sem internacao podem nao se qualificar - verifique os requisitos especificos.',
      },
    ],
  },
  {
    id: 'imoveis-reforma-ibs-cbs',
    modulo: 'simulador-imoveis',
    nome: 'Reforma Tributaria 2027 (IBS/CBS)',
    descricao:
      'A partir de 2027, locação de imóveis passa a pagar IBS e CBS com redutor setorial da alíquota. Locação residencial de longa duração (> 90 dias) e locação não residencial: redutor 70% (Art. 261 LC 214/2025). Curta temporada (≤ 90 dias, equiparada a hotelaria — Arts. 253/278 LC 214/2025): redutor 40% (Art. 281 LC 214/2025). Redutor social Art. 260: R$ 600/mês por imóvel residencial de LONGA duração, corrigido IPCA — curta temporada NÃO recebe redutor social (é hotelaria, não "locação para uso residencial"). Não residencial também não recebe redutor social.',
    formula: 'Aliquota\\_Efetiva = Aliquota\\_Nominal \\times (1 - Redutor)',
    formula_explicada:
      'Se a aliquota nominal for 26,5% e o redutor for 70%, a efetiva e 26,5% x 30% = 7,95%.',
    embasamento_legal: [
      {
        norma: 'EC n. 132/2023',
        artigo: 'Art. 156-A',
        descricao: 'Institui o IBS - Imposto sobre Bens e Servicos.',
        url: 'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm',
      },
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 253',
        descricao: 'Locação de curta temporada (< 90 dias, imóvel residencial mobiliado) equiparada a serviço de hotelaria.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 260',
        descricao: 'Redutor social de R$ 600/mês por imóvel para locação residencial (longa duração). Curta temporada (hotelaria) não se enquadra.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 261',
        descricao: 'Redutor de alíquota 70% para locação de longa duração (parágrafo único).',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 278',
        descricao: 'Definição de hospedagem e equiparação para locação de curta temporada.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 281',
        descricao: 'Redutor de alíquota 40% para serviços de hotelaria (aplicável à curta temporada).',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 255 a 260',
        descricao: 'Cronograma de transição do IBS e redutor social.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Aliquota_Nominal',
        descricao: 'Aliquota padrao estimada (26,5%)',
        tipo: 'percentual',
      },
      {
        nome: 'Redutor_Residencial',
        descricao: '70% para locacao residencial comum',
        tipo: 'percentual',
      },
      {
        nome: 'Redutor_Hospedagem',
        descricao: '40% para hospedagem/curta temporada — Art. 281 LC 214/2025',
        tipo: 'percentual',
      },
    ],
    exemplo_numerico: {
      titulo: 'Locacao residencial com aliquota nominal de 26,5%',
      dados_entrada: {
        aliquota_nominal: 26.5,
        redutor: 70,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Calcular fator de reducao',
          formula: 'Fator = 1 - Redutor',
          calculo: '1 - 0,70',
          resultado: '30%',
        },
        {
          ordem: 2,
          descricao: 'Calcular aliquota efetiva',
          formula: 'Efetiva = Nominal x Fator',
          calculo: '26,5% x 30%',
          resultado: '7,95%',
        },
      ],
      resultado_final: {
        aliquota_efetiva: 7.95,
      },
    },
    observacoes: [
      '2027/2028: CBS plena (~9%) + IBS fixo de 0,1% - ambos com redutor de 70% (longa duração) ou 40% (curta temporada — Art. 281) para locação.',
      'A partir de 2029: CBS plena + IBS progressivo (10% em 2029, 20% em 2030, 30% em 2031, 40% em 2032, 100% em 2033).',
      'O redutor de 70% resulta em carga efetiva próxima a 8% sobre receita após 2033; o de 40% (hotelaria) resulta em ~16,8%.',
      'Perfil "ambos": quando há receita de longa duração e de curta temporada, o simulador aplica 70% na parte longa e 40% na curta (Art. 281), proporcionalmente.',
      'Carteira mista (residencial + não residencial): imóveis não residenciais sempre utilizam redutor 70% (longa duração), sem redutor social.',
      'Auto-detecção: se receita de longa E curta duração existem (campos receita_aluguel_tradicional e receita_aluguel_curto) e perfil_locacao não foi definido, o simulador assume perfil "ambos" automaticamente.',
      'Redutor social (Art. 260 LC 214/2025, redação dada pela LC 227/2026): valor nominal R$ 600/mês por imóvel residencial, atualizado mensalmente pelo IPCA a partir da publicação da LC 214 (16/01/2025) via BCB SGS 433; deduzido da BASE apenas na parcela de longa duração (acima de 90 dias). Curta temporada (até 90 dias) e locação não residencial não recebem redutor social.',
      'Para ajuste dos parâmetros legais (redutor e tetos), o índice de cálculo é o fator acumulado composto da série mensal do IPCA (SGS 433), de fev/2025 até o mês de referência do ano-calendário.',
      'Para PF: só é contribuinte se cumular mais de 3 imóveis (4 ou mais) E receita acima do limite indexado (nominal R$ 240k). Receita acima do limite absoluto (nominal R$ 288k = 240k + 20%) sozinha não torna a PF contribuinte — o regulamento esclareceu que > 3 imóveis é sempre necessário. O nominal R$ 288k é mantido como referência indexada pelo mesmo fator IPCA do redutor social, aplicável à regra de antecipação no mesmo ano-calendário.',
      'Projeção 2027-2033: a tabela ano-a-ano no portal deriva o fator de redução diretamente do resultado do backend (débito / receita / alíquota nominal), garantindo consistência com o card de resultado.',
    ],
    ultima_atualizacao: '2026-04-06',
    tags: ['reforma', 'ibs', 'cbs', 'redutor'],
    vigencia: {
      inicio: '2027-01-01',
      fim: '2032-12-31',
      observacao: 'Periodo de transicao (2027-2032), consolidacao em 2033',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'A aliquota nominal de 26,5% e uma estimativa - o valor final sera definido em regulamentacao.',
      },
      {
        tipo: 'atencao',
        mensagem: 'Locação residencial: redutor 70% (longa duração, Art. 261) ou 40% (curta temporada/hotelaria, Art. 281). Não residencial: sempre redutor 70%. Redutor social Art. 260: apenas longa duração residencial.',
      },
    ],
  },
  {
    id: 'imoveis-transicao-art487',
    modulo: 'simulador-imoveis',
    nome: 'Transicao Art. 487 (Contratos ate 16/01/2025)',
    descricao:
      'Contratos de locacao firmados ate 16/01/2025 podem optar pelo regime de transicao: tributacao de 3,65% sobre a receita bruta ate 31/12/2028.',
    formula: 'Tributo = Receita \\times 3,65\\%',
    embasamento_legal: [
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 487',
        paragrafo: 'caput',
        descricao: 'Regime de transicao para contratos anteriores a reforma.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 487',
        paragrafo: '§ 1.',
        descricao: 'Define a data limite de 16/01/2025 para contratos elegiveis.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 487',
        paragrafo: '§ 2.',
        descricao: 'Estabelece o prazo de vigencia ate 31/12/2028.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Aliquota_Transicao',
        descricao: 'Aliquota fixa de 3,65%',
        tipo: 'percentual',
      },
      {
        nome: 'Data_Limite_Contrato',
        descricao: 'Contratos firmados ate 16/01/2025',
        tipo: 'texto',
      },
      {
        nome: 'Vigencia',
        descricao: 'Ate 31/12/2028',
        tipo: 'texto',
      },
    ],
    exemplo_numerico: {
      titulo: 'Contrato de locacao firmado em 2024 - receita R$ 10.000/mes',
      dados_entrada: {
        receita_mensal: 10000,
        data_contrato: '2024-06-15',
        aliquota_transicao: 3.65,
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Verificar elegibilidade',
          calculo: 'Contrato de 15/06/2024 <= 16/01/2025',
          resultado: 'Elegivel para Art. 487',
        },
        {
          ordem: 2,
          descricao: 'Calcular tributo mensal',
          formula: 'Tributo = Receita x 3,65%',
          calculo: '10.000 x 3,65%',
          resultado: 'R$ 365,00/mes',
        },
        {
          ordem: 3,
          descricao: 'Comparar com novo regime (IBS/CBS ~7,95%)',
          calculo: '10.000 x 7,95% = R$ 795,00',
          resultado: 'Economia de R$ 430/mes com Art. 487',
        },
      ],
      resultado_final: {
        tributo_art487: 365,
        tributo_novo_regime: 795,
        economia_mensal: 430,
        economia_ate_2028: 15480,
      },
    },
    observacoes: [
      'Opcao vantajosa para quem tem contratos antigos de longo prazo.',
      'Apos 2028, passa automaticamente para o novo regime IBS/CBS.',
      'Deve-se avaliar se o redutor de 70% e mais ou menos vantajoso.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['transicao', 'art487', 'contratos-antigos'],
    vigencia: {
      inicio: '2027-01-01',
      fim: '2028-12-31',
      observacao: 'Aplicavel somente a contratos firmados ate 16/01/2025',
    },
    alertas: [
      {
        tipo: 'critico',
        mensagem: 'Somente contratos firmados ATE 16/01/2025 podem optar pelo Art. 487. Verifique a data de assinatura.',
      },
      {
        tipo: 'importante',
        mensagem: 'A opcao pelo Art. 487 e irrevogavel ate 31/12/2028.',
      },
    ],
  },
  {
    id: 'imoveis-contribuinte-pf-ibs-cbs',
    modulo: 'simulador-imoveis',
    nome: 'Contribuinte IBS/CBS - Pessoa Física (LC 214/2025)',
    descricao:
      'Conforme regulamento da LC 214/2025, a Pessoa Física que recebe aluguéis só é contribuinte de IBS/CBS quando atende CUMULATIVAMENTE a duas condições: (a) possui mais de 3 imóveis (4 ou mais), e (b) receita anual de locação > R$ 240.000 (limite indexado por IPCA). Caso falhe em qualquer uma das duas condições, a PF paga apenas o IR via Carnê-Leão. O patamar de R$ 288.000 (240k + 20%) NÃO transforma a PF em contribuinte por si só — ele permanece apenas como gatilho de antecipação para o mesmo ano-calendário, sempre exigindo > 3 imóveis.',
    formula: 'Contribuinte \\Leftrightarrow Imoveis > 3 \\land Receita > 240k',
    formula_explicada:
      'A PF é contribuinte de IBS/CBS apenas quando possui mais de 3 imóveis (i.e., 4 ou mais) E a receita anual de locação ultrapassa R$ 240.000. Não basta a receita ultrapassar R$ 288.000: se houver até 3 imóveis, a PF NÃO é contribuinte mesmo com receita acima desse patamar.',
    embasamento_legal: [
      {
        norma: 'LC nº 214/2025',
        artigo: 'Art. 261',
        paragrafo: '§ 4º',
        descricao: 'Define os critérios para enquadramento da PF como contribuinte de IBS/CBS na locação. O regulamento esclareceu que > 3 imóveis é condição necessária em qualquer cenário.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Quantidade_Imoveis',
        descricao: 'Número total de imóveis do locador (residenciais + não residenciais)',
        tipo: 'numero',
      },
      {
        nome: 'Receita_Anual',
        descricao: 'Receita anual de locação (soma de todos os imóveis)',
        tipo: 'moeda',
      },
      {
        nome: 'Limite_Receita',
        descricao: 'R$ 240.000 (limite anual, indexado por IPCA)',
        tipo: 'moeda',
      },
      {
        nome: 'Limite_Imoveis',
        descricao: 'Mais de 3 imóveis (i.e., 4 ou mais) — condição necessária',
        tipo: 'numero',
      },
    ],
    exemplo_numerico: {
      titulo: 'Análise de contribuinte IBS/CBS para diferentes cenários',
      dados_entrada: {
        cenarios: [
          { imoveis: 2, receita: 200000, resultado: 'Não contribuinte' },
          { imoveis: 4, receita: 250000, resultado: 'Contribuinte (>3 imóveis E >240k)' },
          { imoveis: 1, receita: 300000, resultado: 'Não contribuinte (apenas 1 imóvel — regulamento exige >3)' },
          { imoveis: 5, receita: 200000, resultado: 'Não contribuinte (receita ≤ 240k)' },
        ],
      },
      passos: [
        {
          ordem: 1,
          descricao: 'Cenário 1: 2 imóveis, R$ 200k/ano',
          calculo: '2 <= 3 → falha condição de imóveis',
          resultado: 'Não contribuinte — paga apenas IR Carnê-Leão',
        },
        {
          ordem: 2,
          descricao: 'Cenário 2: 4 imóveis, R$ 250k/ano',
          calculo: '4 > 3 E 250k > 240k → atende as duas condições',
          resultado: 'Contribuinte IBS/CBS — IR + IBS/CBS',
        },
        {
          ordem: 3,
          descricao: 'Cenário 3: 1 imóvel, R$ 300k/ano (passa de 288k)',
          calculo: '1 <= 3 → falha condição de imóveis (regulamento esclareceu que >288k NÃO basta sozinho)',
          resultado: 'Não contribuinte — paga apenas IR Carnê-Leão',
        },
        {
          ordem: 4,
          descricao: 'Cenário 4: 5 imóveis, R$ 200k/ano',
          calculo: '5 > 3 mas 200k ≤ 240k → falha condição de receita',
          resultado: 'Não contribuinte — paga apenas IR Carnê-Leão',
        },
      ],
      resultado_final: {
        criterio_unico: 'Mais de 3 imóveis E receita anual > R$ 240.000 (cumulativo)',
      },
    },
    observacoes: [
      'O regulamento esclareceu que mais de 3 imóveis é condição NECESSÁRIA em qualquer cenário — mesmo com receita acima de R$ 288k, a PF com até 3 imóveis NÃO é contribuinte de IBS/CBS.',
      'Se a PF não for contribuinte de IBS/CBS, paga apenas o IR via Carnê-Leão.',
      'No comparativo de cenários do simulador, a coluna "Reforma LC 214/2025 PF" exibe "—" (não se aplica) para imposto total, alíquota efetiva e diferença quando a PF não é contribuinte.',
      'O patamar nominal de R$ 288.000 (240k + 20%) e seu override `limite_receita_absoluto_contribuinte_pf_manual` permanecem disponíveis como referência para a regra de antecipação dentro do mesmo ano-calendário, mas não alteram a decisão binária do simulador.',
    ],
    ultima_atualizacao: '2026-05-03',
    tags: ['pf', 'contribuinte', 'ibs', 'cbs', 'criterios', 'comparativo', 'regulamento-lc214'],
    vigencia: {
      inicio: '2027-01-01',
      observacao: 'Vigente a partir da entrada em vigor da reforma tributária',
    },
    alertas: [
      {
        tipo: 'atencao',
        mensagem: 'Os critérios para PF ser contribuinte ainda dependem de regulamentação específica. Acompanhe as atualizações.',
      },
    ],
  },
  {
    id: 'imoveis-cronograma-ibs',
    modulo: 'simulador-imoveis',
    nome: 'Cronograma IBS vs ICMS/ISS (2029-2033)',
    descricao:
      'A substituicao do ICMS e ISS pelo IBS ocorre gradualmente de 2029 a 2033. A cada ano, a participacao do IBS aumenta enquanto ICMS/ISS diminui.',
    embasamento_legal: [
      {
        norma: 'EC n. 132/2023',
        artigo: 'Art. 124 a 129',
        descricao: 'Estabelece o cronograma de transicao.',
        url: 'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm',
      },
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 255',
        descricao: 'Transicao CBS: 2027 = 0,9%; 2028 em diante = compensavel.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
      {
        norma: 'LC n. 214/2025',
        artigo: 'Art. 256 a 260',
        descricao: 'Transicao IBS: reducao gradual de ICMS/ISS de 2029 a 2032.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
      },
    ],
    variaveis: [
      {
        nome: 'Ano_2027',
        descricao: 'CBS teste 0,9%, IBS 0,1%',
        tipo: 'texto',
      },
      {
        nome: 'Ano_2029',
        descricao: 'IBS 10%, ICMS/ISS 90%',
        tipo: 'texto',
      },
      {
        nome: 'Ano_2030',
        descricao: 'IBS 20%, ICMS/ISS 80%',
        tipo: 'texto',
      },
      {
        nome: 'Ano_2031',
        descricao: 'IBS 30%, ICMS/ISS 70%',
        tipo: 'texto',
      },
      {
        nome: 'Ano_2032',
        descricao: 'IBS 40%, ICMS/ISS 60%',
        tipo: 'texto',
      },
      {
        nome: 'Ano_2033',
        descricao: 'IBS 100%, ICMS/ISS 0% (extintos)',
        tipo: 'texto',
      },
    ],
    exemplo_numerico: {
      titulo: 'Comparativo de carga tributaria ano a ano',
      dados_entrada: {
        receita_mensal: 10000,
        aliquota_ibs_nominal: 26.5,
        redutor: 70,
      },
      passos: [
        {
          ordem: 1,
          descricao: '2027-2028 (teste)',
          calculo: 'CBS 0,9% + IBS 0,1% + ICMS/ISS integral',
          resultado: 'Carga adicional de ~1% (teste)',
        },
        {
          ordem: 2,
          descricao: '2029 (10% IBS)',
          calculo: 'IBS 10% x 7,95% = 0,795% + ICMS/ISS 90%',
          resultado: 'Inicio da transicao',
        },
        {
          ordem: 3,
          descricao: '2033 (100% IBS)',
          calculo: 'IBS 100% x 7,95% = 7,95%',
          resultado: 'Regime definitivo',
        },
      ],
      resultado_final: {
        carga_2027: '~5% (PIS/COFINS + teste)',
        carga_2033: '~7,95% (IBS+CBS com redutor)',
      },
    },
    observacoes: [
      '2027-2028: Periodo de teste com IBS 0,1% + ICMS/ISS integral.',
      'A partir de 2033, ICMS e ISS sao extintos, substituidos pelo IBS.',
      'O cronograma pode sofrer ajustes conforme regulamentacao.',
    ],
    ultima_atualizacao: '2026-03-14',
    tags: ['cronograma', 'transicao', 'icms', 'iss'],
    vigencia: {
      inicio: '2027-01-01',
      fim: '2032-12-31',
      observacao: 'Periodo de transicao. Consolidacao em 2033.',
    },
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'O cronograma de transicao e constitucional (EC 132/2023) e nao pode ser alterado por lei ordinaria.',
      },
      {
        tipo: 'atencao',
        mensagem: 'Empresas devem se preparar para operar com dois sistemas tributarios simultaneamente ate 2032.',
      },
    ],
  },
];
