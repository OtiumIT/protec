import type { GlossarioTermo } from '@shared/types/documentation';

export const glossarioTermos: GlossarioTermo[] = [
  {
    sigla: 'BCC',
    nome_completo: 'Base de Calculo Combinada',
    descricao:
      'Soma dos rendimentos tributaveis, dividendos e outros isentos, menos as exclusoes do Art. 16-A da Lei 15.270/2025. Utilizada para calcular o imposto minimo sobre alta renda.',
    categoria: 'conceito',
  },
  {
    sigla: 'CAPAG',
    nome_completo: 'Capacidade de Pagamento',
    descricao:
      'Sistema de classificacao da PGFN que avalia a saude financeira de empresas atraves de indicadores de liquidez e solvencia. Determina os descontos aplicaveis em transacoes tributarias.',
    categoria: 'indicador',
  },
  {
    sigla: 'IBS',
    nome_completo: 'Imposto sobre Bens e Servicos',
    descricao:
      'Novo tributo criado pela Reforma Tributaria (EC 132/2023) que substituira o ICMS estadual e o ISS municipal. Vigencia plena a partir de 2033, com transicao iniciando em 2027.',
    categoria: 'tributo',
  },
  {
    sigla: 'CBS',
    nome_completo: 'Contribuicao sobre Bens e Servicos',
    descricao:
      'Novo tributo federal criado pela Reforma Tributaria que substituira o PIS e a COFINS. Tera aliquota unica e nao-cumulatividade plena.',
    categoria: 'tributo',
  },
  {
    sigla: 'IRPJ',
    nome_completo: 'Imposto de Renda da Pessoa Juridica',
    descricao:
      'Imposto federal sobre o lucro das empresas. Aliquota de 15% + adicional de 10% sobre lucro trimestral excedente a R$ 60.000.',
    categoria: 'tributo',
  },
  {
    sigla: 'CSLL',
    nome_completo: 'Contribuicao Social sobre o Lucro Liquido',
    descricao:
      'Contribuicao federal que incide sobre o lucro das empresas para financiar a seguridade social. Aliquota de 9% para empresas em geral.',
    categoria: 'tributo',
  },
  {
    sigla: 'IRRF',
    nome_completo: 'Imposto de Renda Retido na Fonte',
    descricao:
      'Modalidade de recolhimento do IR onde o imposto e retido pela fonte pagadora no momento do pagamento do rendimento. Pode ser antecipacao ou tributacao definitiva.',
    categoria: 'tributo',
  },
  {
    sigla: 'FII',
    nome_completo: 'Fundo de Investimento Imobiliario',
    descricao:
      'Fundo que investe em imoveis ou titulos imobiliarios. Rendimentos sao isentos de IR para pessoa fisica se o fundo atender aos requisitos de qualificacao.',
    categoria: 'instrumento',
  },
  {
    sigla: 'CRI',
    nome_completo: 'Certificado de Recebiveis Imobiliarios',
    descricao:
      'Titulo de renda fixa lastreado em creditos imobiliarios. Isento de IR para pessoa fisica quando emitido por companhia securitizadora.',
    categoria: 'instrumento',
  },
  {
    sigla: 'CRA',
    nome_completo: 'Certificado de Recebiveis do Agronegocio',
    descricao:
      'Titulo de renda fixa lastreado em creditos do setor agroindustrial. Isento de IR para pessoa fisica.',
    categoria: 'instrumento',
  },
  {
    sigla: 'LCI',
    nome_completo: 'Letra de Credito Imobiliario',
    descricao:
      'Titulo de renda fixa emitido por bancos e lastreado em creditos imobiliarios. Isento de IR para pessoa fisica.',
    categoria: 'instrumento',
  },
  {
    sigla: 'LCA',
    nome_completo: 'Letra de Credito do Agronegocio',
    descricao:
      'Titulo de renda fixa emitido por bancos e lastreado em creditos do agronegocio. Isento de IR para pessoa fisica.',
    categoria: 'instrumento',
  },
  {
    sigla: 'LIG',
    nome_completo: 'Letra Imobiliaria Garantida',
    descricao:
      'Titulo de renda fixa com dupla garantia (banco emissor + carteira de creditos imobiliarios). Isento de IR para pessoa fisica.',
    categoria: 'instrumento',
  },
  {
    sigla: 'JCP',
    nome_completo: 'Juros sobre Capital Proprio',
    descricao:
      'Forma de distribuicao de lucros que permite deducao do IRPJ/CSLL. Tributado em 15% na fonte. Pode ser vantajoso vs. dividendos dependendo da situacao.',
    categoria: 'conceito',
  },
  {
    sigla: 'Lucro Presumido',
    nome_completo: 'Regime de Lucro Presumido',
    descricao:
      'Regime de tributacao onde a base de calculo do IRPJ e CSLL e determinada por percentuais de presuncao sobre a receita bruta, conforme o tipo de atividade.',
    categoria: 'regime',
  },
  {
    sigla: 'Carne-Leao',
    nome_completo: 'Recolhimento Mensal Obrigatorio',
    descricao:
      'Pagamento mensal obrigatorio de IR por pessoas fisicas que recebem rendimentos de outras pessoas fisicas ou do exterior. Inclui alugueis de imoveis.',
    categoria: 'conceito',
  },
  {
    sigla: 'PGFN',
    nome_completo: 'Procuradoria-Geral da Fazenda Nacional',
    descricao:
      'Orgao do Ministerio da Fazenda responsavel pela cobranca da divida ativa da Uniao e representacao judicial da Fazenda Nacional.',
    categoria: 'conceito',
  },
  {
    sigla: 'Transacao Tributaria',
    nome_completo: 'Transacao em Materia Tributaria',
    descricao:
      'Acordo entre contribuinte e Fisco para resolucao de litigios fiscais, podendo incluir descontos em juros, multas e ate principal, conforme a Lei 13.988/2020.',
    categoria: 'conceito',
  },
  {
    sigla: 'Equiparacao Hospitalar',
    nome_completo: 'Equiparacao a Estabelecimento Hospitalar',
    descricao:
      'Beneficio fiscal que permite a servicos de saude utilizarem presuncao reduzida de IRPJ (8%) e CSLL (12%) ao inves do padrao de 32%. Regulamentada pela LC 224/2025.',
    categoria: 'conceito',
  },
  {
    sigla: 'LC',
    nome_completo: 'Liquidez Corrente',
    descricao:
      'Indicador financeiro que mede a capacidade de pagamento de obrigacoes de curto prazo. Calculado como Ativo Circulante / Passivo Circulante.',
    categoria: 'indicador',
  },
  {
    sigla: 'LG',
    nome_completo: 'Liquidez Geral',
    descricao:
      'Indicador financeiro que mede a capacidade de pagamento de todas as obrigacoes. Calculado como (AC + RLP) / (PC + PNC).',
    categoria: 'indicador',
  },
  {
    sigla: 'IN',
    nome_completo: 'Instrucao Normativa',
    descricao:
      'Ato normativo da Receita Federal que regulamenta e interpreta a legislacao tributaria, detalhando procedimentos e obrigacoes acessorias.',
    categoria: 'conceito',
  },
  {
    sigla: 'DIRPF',
    nome_completo: 'Declaracao do Imposto de Renda da Pessoa Fisica',
    descricao:
      'Declaracao anual obrigatoria para contribuintes que se enquadram nos criterios de obrigatoriedade, onde sao informados rendimentos, bens e calculo do IR devido.',
    categoria: 'conceito',
  },
  {
    sigla: 'ECF',
    nome_completo: 'Escrituracao Contabil Fiscal',
    descricao:
      'Obrigacao acessoria que substitui a DIPJ, contendo informacoes contabeis e fiscais das empresas para apuracao do IRPJ e CSLL.',
    categoria: 'conceito',
  },
];

export const categorias = [
  { key: 'tributo', nome: 'Tributos', cor: 'blue' },
  { key: 'indicador', nome: 'Indicadores', cor: 'green' },
  { key: 'regime', nome: 'Regimes', cor: 'purple' },
  { key: 'instrumento', nome: 'Instrumentos Financeiros', cor: 'orange' },
  { key: 'conceito', nome: 'Conceitos', cor: 'slate' },
] as const;
