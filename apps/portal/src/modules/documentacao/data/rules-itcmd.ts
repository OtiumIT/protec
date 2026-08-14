import type { RuleDocumentation } from '@shared/types/documentation';

export const rulesItcmd: RuleDocumentation[] = [
  {
    id: 'itcmd-tabelas-uf',
    modulo: 'itcmd',
    nome: 'Tabelas de ITCMD na doacao (simulacao)',
    descricao:
      'Oito UFs com tabela embutida: SP, RJ, MG, RS, PR, SC, GO e DF. Demais estados: o aluno informa a aliquota. Enquadramento pela faixa que contem a base (nao progressivo empilhado). Tabelas sao referenciais de simulacao e podem divergir da legislacao vigente.',
    formula: 'ITCMD = Base \\times Aliquota_{faixa}',
    formula_explicada:
      'Localiza a faixa cuja teto e >= base e aplica a aliquota da faixa. UFs sem tabela usam aliquota_manual_percent.',
    embasamento_legal: [
      {
        norma: 'CF/1988',
        artigo: 'Art. 155',
        inciso: 'I',
        descricao: 'Compete aos Estados e ao DF instituir ITCMD sobre transmissao causa mortis e doacao de quaisquer bens ou direitos.',
      },
    ],
    variaveis: [
      { nome: 'uf', descricao: 'Unidade da Federacao', tipo: 'texto', exemplo: 'SP' },
      { nome: 'valor', descricao: 'Valor do bem (imovel ou quotas)', tipo: 'moeda', exemplo: 'R$ 500.000,00' },
      { nome: 'aliquota_manual_percent', descricao: 'Obrigatoria se a UF nao tem tabela', tipo: 'percentual', exemplo: '4' },
    ],
    exemplo_numerico: {
      titulo: 'Doacao plena em SP',
      dados_entrada: { uf: 'SP', valor: 500000, reserva_usufruto: false },
      passos: [
        { ordem: 1, descricao: 'SP aliquota unica 4%', resultado: '4%' },
        { ordem: 2, descricao: 'ITCMD', calculo: '500.000 × 4%', resultado: 'R$ 20.000,00' },
      ],
      resultado_final: { itcmd: 20000 },
    },
    observacoes: [
      'SP 4%; MG 5%; PR 4%; SC 8% (doacao).',
      'RJ 4–8%, RS 3–6%, GO 2–8%, DF 4–6% por faixas simplificadas de simulacao.',
      'Nao cobre causa mortis, inventario nem otimizador de domicilio (v2.1).',
      'Simulacao: nao substitui guia estadual.',
    ],
    ultima_atualizacao: '2026-08-14',
    tags: ['itcmd', 'doacao', 'tabela'],
  },
  {
    id: 'itcmd-usufruto',
    modulo: 'itcmd',
    nome: 'Reserva de usufruto e nua propriedade',
    descricao:
      'Se houver reserva de usufruto, o ITCMD da doacao incide sobre a nua propriedade. A fracao do usufruto segue faixas etarias usuais de cartorio: ate 30 anos 70%, 31–40 60%, 41–50 50%, 51–60 40%, 61–70 30%, 71+ 20%.',
    formula: 'Base = Valor \\times (1 - FracaoUsufruto(idade))',
    formula_explicada:
      'Doacao plena: base = valor. Com reserva: base = valor × fracao da nua propriedade correspondente a idade do usufrutuario.',
    embasamento_legal: [
      {
        norma: 'Codigo Civil',
        artigo: 'Art. 1.390',
        descricao: 'O usufruto pode recair em um ou mais bens, moveis ou imoveis, em um patrimonio inteiro ou parte deste.',
      },
    ],
    variaveis: [
      { nome: 'reserva_usufruto', descricao: 'Se o doador reserva usufruto', tipo: 'texto', exemplo: 'sim' },
      { nome: 'idade_usufrutuario', descricao: 'Idade do usufrutuario', tipo: 'numero', exemplo: '65' },
    ],
    exemplo_numerico: {
      titulo: 'Doacao com usufruto — usufrutuario 65 anos',
      dados_entrada: { valor: 1000000, idade: 65, uf: 'SP' },
      passos: [
        { ordem: 1, descricao: 'Usufruto 61–70 = 30%', resultado: '30%' },
        { ordem: 2, descricao: 'Nua propriedade', calculo: '70%', resultado: 'R$ 700.000,00' },
        { ordem: 3, descricao: 'ITCMD SP 4%', calculo: '700.000 × 4%', resultado: 'R$ 28.000,00' },
      ],
      resultado_final: { base: 700000, itcmd: 28000 },
    },
    observacoes: [
      'Constituicao, extincao e IR dos frutos ficam para a v2.1.',
      'Parentesco e informado para memoria; a v1 nao altera aliquota por parentesco.',
    ],
    ultima_atualizacao: '2026-08-14',
    tags: ['itcmd', 'usufruto'],
    alertas: [
      {
        tipo: 'atencao',
        mensagem: 'As fracoes etarias sao referenciais de simulacao, nao tabela oficial de todos os estados.',
      },
    ],
  },
];
