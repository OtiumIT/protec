/**
 * Catálogo versionado do Mapeamento de Despesas PF -> PJ.
 * É a fonte da verdade das categorias/perguntas exibidas no portal e usadas
 * como metadados do diagnóstico. A versão é gravada em cada diagnóstico para
 * garantir reprodutibilidade (o resultado é recalculado no servidor).
 */

export const RULES_VERSION = 'v1.0.0';

export interface CatalogQuestion {
  key: string;
  label: string;
  hint?: string;
  type: 'sim_nao_parcial' | 'percentual' | 'moeda' | 'enum' | 'boolean' | 'texto';
  options?: string[];
}

export interface CatalogCategory {
  key: string;
  nome: string;
  descricao: string;
  atencao: 'alta' | 'media' | 'baixa';
  questions: CatalogQuestion[];
}

export const EXPENSE_CATALOG: CatalogCategory[] = [
  {
    key: 'veiculos',
    nome: 'Veículos e mobilidade',
    descricao: 'Aquisição, financiamento, aluguel, combustível, manutenção, seguro, estacionamento, pedágio e tributos do veículo.',
    atencao: 'alta',
    questions: [
      { key: 'utiliza_atividade', label: 'A empresa utiliza veículo nas atividades?', type: 'sim_nao_parcial' },
      { key: 'titularidade', label: 'Como o veículo é mantido atualmente?', type: 'enum', options: ['proprio_cpf', 'financiado_cpf', 'alugado_cpf', 'ja_na_pj'] },
      { key: 'uso_empresarial_pct', label: 'Qual percentual é comprovadamente empresarial?', type: 'percentual' },
      { key: 'documento_pj', label: 'Há documento fiscal em nome da PJ?', type: 'sim_nao_parcial' },
    ],
  },
  {
    key: 'imovel',
    nome: 'Imóvel e home office',
    descricao: 'Aluguel, condomínio, energia, internet, manutenção, mobiliário e estrutura usada para trabalhar.',
    atencao: 'alta',
    questions: [
      { key: 'endereco', label: 'O endereço é residencial ou comercial?', type: 'enum', options: ['residencial', 'comercial', 'misto'] },
      { key: 'ambiente_exclusivo', label: 'Há ambiente exclusivo para a atividade?', type: 'boolean' },
      { key: 'contrato_formal', label: 'Existe contrato ou cessão formal?', type: 'boolean' },
      { key: 'criterio_rateio', label: 'Como água, energia e internet serão rateadas?', type: 'texto' },
    ],
  },
  {
    key: 'tecnologia',
    nome: 'Tecnologia e telecom',
    descricao: 'Celular, notebook, software, armazenamento, assinatura, internet, equipamentos e serviços de comunicação.',
    atencao: 'baixa',
    questions: [
      { key: 'titular', label: 'A assinatura está no CPF ou no CNPJ?', type: 'enum', options: ['cpf', 'cnpj'] },
      { key: 'compativel_funcao', label: 'O equipamento é compatível com a função?', type: 'boolean' },
      { key: 'uso_particular', label: 'Existe uso por familiar ou uso particular relevante?', type: 'boolean' },
      { key: 'inventario', label: 'Há inventário ou termo de responsabilidade?', type: 'boolean' },
    ],
  },
  {
    key: 'viagens',
    nome: 'Viagens e representação',
    descricao: 'Passagens, hospedagem, transporte, alimentação, congressos e deslocamentos vinculados a clientes ou eventos.',
    atencao: 'media',
    questions: [
      { key: 'objetivo', label: 'Qual foi o objetivo empresarial?', type: 'texto' },
      { key: 'beneficiario', label: 'Quem viajou e quem foi beneficiado?', type: 'enum', options: ['equipe', 'socio', 'acompanhante', 'misto'] },
      { key: 'evidencia', label: 'Há agenda, convite ou relatório?', type: 'boolean' },
      { key: 'faturado_pj', label: 'A compra foi faturada para a PJ?', type: 'sim_nao_parcial' },
    ],
  },
  {
    key: 'servicos',
    nome: 'Serviços e estrutura',
    descricao: 'Contabilidade, jurídico, marketing, consultoria, limpeza, segurança e outros prestadores.',
    atencao: 'baixa',
    questions: [
      { key: 'contratante', label: 'Quem contratou e recebeu o serviço?', type: 'enum', options: ['empresa', 'socio', 'misto'] },
      { key: 'entregavel', label: 'Qual entregável atende à atividade?', type: 'texto' },
      { key: 'contrato_nf', label: 'Há contrato e documento fiscal?', type: 'sim_nao_parcial' },
      { key: 'recorrencia', label: 'É recorrente ou pontual?', type: 'enum', options: ['recorrente', 'pontual'] },
    ],
  },
  {
    key: 'capacitacao',
    nome: 'Capacitação',
    descricao: 'Cursos, congressos, livros e associações profissionais.',
    atencao: 'baixa',
    questions: [
      { key: 'vinculo_atividade', label: 'A capacitação tem relação direta com a atividade?', type: 'sim_nao_parcial' },
      { key: 'beneficiario', label: 'Quem se capacitou?', type: 'enum', options: ['socio', 'empregado', 'familiar'] },
      { key: 'documento_pj', label: 'Documento fiscal em nome da PJ?', type: 'sim_nao_parcial' },
    ],
  },
  {
    key: 'saude_beneficios',
    nome: 'Saúde e benefícios',
    descricao: 'Plano, alimentação, transporte e benefícios de equipe.',
    atencao: 'media',
    questions: [
      { key: 'beneficio_coletivo', label: 'É benefício coletivo (acordo/convenção) ou individual do sócio?', type: 'enum', options: ['coletivo', 'individual_socio'] },
      { key: 'documento_pj', label: 'Documento fiscal em nome da PJ?', type: 'sim_nao_parcial' },
    ],
  },
  {
    key: 'outras',
    nome: 'Outras despesas',
    descricao: 'Itens não contemplados nas categorias anteriores.',
    atencao: 'media',
    questions: [
      { key: 'vinculo_atividade', label: 'Tem vínculo com a atividade?', type: 'sim_nao_parcial' },
      { key: 'documento_pj', label: 'Documento fiscal em nome da PJ?', type: 'sim_nao_parcial' },
    ],
  },
];

export function getActiveCatalog() {
  return { version: RULES_VERSION, categories: EXPENSE_CATALOG };
}
