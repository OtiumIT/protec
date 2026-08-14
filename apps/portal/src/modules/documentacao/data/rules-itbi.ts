import type { RuleDocumentation } from '@shared/types/documentation';

export const rulesItbi: RuleDocumentation[] = [
  {
    id: 'itbi-fato-gerador',
    modulo: 'itbi',
    nome: 'Fato gerador do ITBI no motor',
    descricao:
      'O motor aceita integralizacao, permuta ou onerosa desde a v1. A tela da v1 expoe so integralizacao de capital. Permuta e onerosa reusam o mesmo calculo na v2.2, sem Tema 796.',
    formula: 'Fato \\in \\{integralizacao, permuta, onerosa\\}',
    formula_explicada:
      'Integralizacao aplica Tema 796. A referencia e o criterio declarado (mercado, planta de ITBI ou IPTU). Sims antigas sem criterio: mercado, senao venal, senao valor da operacao.',
    embasamento_legal: [
      {
        norma: 'CTN',
        artigo: 'Art. 35',
        descricao: 'ITBI tem como fato gerador a transmissao inter vivos, a qualquer titulo, por ato oneroso, de bens imoveis.',
        url: 'https://www.planalto.gov.br/ccivil_03/leis/l5172compilado.htm',
      },
      {
        norma: 'CF/1988',
        artigo: 'Art. 156',
        inciso: 'II',
        descricao: 'Compete aos Municipios instituir ITBI sobre transmissao inter vivos, a qualquer titulo, por ato oneroso, de bens imoveis.',
      },
    ],
    variaveis: [
      {
        nome: 'fato_gerador',
        descricao: 'integralizacao | permuta | onerosa',
        tipo: 'texto',
        exemplo: 'integralizacao',
      },
    ],
    observacoes: [
      'A UI da v1 nao expoe compra e venda nem permuta.',
      'Nao ha consulta de aliquota na prefeitura; o aluno informa a aliquota (default 2%).',
    ],
    ultima_atualizacao: '2026-08-14',
    tags: ['itbi', 'fato-gerador'],
  },
  {
    id: 'itbi-tema-796',
    modulo: 'itbi',
    nome: 'Tema 796 — imunidade na integralizacao',
    descricao:
      'Na integralizacao de imovel ao capital de PJ holding patrimonial, o ITBI nao incide ate o valor de referencia declarado (mercado, planta de ITBI ou IPTU/venal). O excesso e tributado (imunidade parcial). PJ operacional: incidencia integral, sem imunidade.',
    formula: 'Base = max(0, Referencia \\times \\%imovel - Capital \\times \\%imovel)',
    formula_explicada:
      'Referencia = o valor do criterio_referencia. Sem criterio (v1): mercado se > 0, senao venal, senao integralizacao. Se capital >= referencia, imunidade total. Se 0 < capital < referencia, imunidade parcial. Operacional: Base = referencia × % do imovel.',
    embasamento_legal: [
      {
        norma: 'CF/1988',
        artigo: 'Art. 156',
        paragrafo: '§ 2º',
        inciso: 'I',
        descricao:
          'O ITBI nao incide sobre a transmissao de bens ou direitos incorporados ao patrimonio de pessoa juridica em realizacao de capital.',
      },
      {
        norma: 'STF — Tema 796',
        descricao:
          'A imunidade do ITBI na integralizacao nao alcança o valor que exceder o limite do capital social subscrito. Holding patrimonial × atividade operacional.',
      },
    ],
    variaveis: [
      { nome: 'criterio_referencia', descricao: 'mercado | referencia_itbi | iptu', tipo: 'texto', exemplo: 'mercado' },
      { nome: 'valor_venal', descricao: 'Valor de IPTU (venal), quando o criterio e iptu', tipo: 'moeda', exemplo: 'R$ 800.000,00' },
      { nome: 'valor_mercado', descricao: 'Valor de mercado, quando o criterio e mercado', tipo: 'moeda', exemplo: 'R$ 1.000.000,00' },
      { nome: 'valor_referencia_itbi', descricao: 'Planta/referencia de ITBI da prefeitura', tipo: 'moeda', exemplo: 'R$ 900.000,00' },
      { nome: 'valor_integralizacao', descricao: 'Valor lancado a titulo de capital', tipo: 'moeda', exemplo: 'R$ 700.000,00' },
      { nome: 'percentual_imovel', descricao: 'Percentual do imovel integralizado', tipo: 'percentual', exemplo: '100' },
      { nome: 'atividade_pj', descricao: 'holding_patrimonial ou operacional', tipo: 'texto', exemplo: 'holding_patrimonial' },
      { nome: 'aliquota_percent', descricao: 'Aliquota municipal informada pelo aluno', tipo: 'percentual', exemplo: '2' },
    ],
    exemplo_numerico: {
      titulo: 'Holding patrimonial — imunidade parcial',
      dados_entrada: {
        valor_mercado: 1000000,
        valor_integralizacao: 700000,
        percentual_imovel: 100,
        aliquota_percent: 2,
        atividade_pj: 'holding_patrimonial',
      },
      passos: [
        { ordem: 1, descricao: 'Referencia = mercado', calculo: '1.000.000', resultado: 'R$ 1.000.000,00' },
        { ordem: 2, descricao: 'Capital imune', calculo: '700.000', resultado: 'R$ 700.000,00' },
        { ordem: 3, descricao: 'Base tributavel', calculo: '1.000.000 - 700.000', resultado: 'R$ 300.000,00' },
        { ordem: 4, descricao: 'ITBI', formula: 'Base \\times 2\\%', calculo: '300.000 × 2%', resultado: 'R$ 6.000,00' },
      ],
      resultado_final: { enquadramento: 'imunidade_parcial', itbi: 6000 },
    },
    observacoes: [
      'Simulacao: nao substitui guia municipal, DAA nem parecer.',
      'Terreno de marinha: apenas alerta de laudemio; o motor nao calcula laudemio.',
    ],
    ultima_atualizacao: '2026-08-14',
    tags: ['itbi', 'tema-796', 'holding', 'criterio-base'],
    alertas: [
      {
        tipo: 'importante',
        mensagem: 'Aliquota e informada pelo aluno. Nao ha consulta automatica a prefeitura.',
      },
    ],
  },
];
