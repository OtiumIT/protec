/**
 * Tipos para documentação de regras tributárias
 * Sistema PROTEC - Área de Documentação para Especialista Tributário
 */

export interface Variable {
  nome: string;
  descricao: string;
  tipo: 'moeda' | 'percentual' | 'numero' | 'texto';
  exemplo?: string;
}

export interface NumericExample {
  titulo: string;
  dados_entrada: Record<string, unknown>;
  passos: ExampleStep[];
  resultado_final: Record<string, unknown>;
}

export interface ExampleStep {
  ordem: number;
  descricao: string;
  formula?: string;
  calculo?: string;
  resultado: string;
}

export interface LegalBasis {
  norma: string;
  artigo?: string;
  paragrafo?: string;
  inciso?: string;
  descricao?: string;
  url?: string;
}

export interface Vigencia {
  inicio: string;
  fim?: string;
  observacao?: string;
}

export interface Alerta {
  tipo: 'atencao' | 'importante' | 'critico';
  mensagem: string;
}

export interface HistoricoAlteracao {
  data: string;
  versao: string;
  descricao: string;
}

export interface GlossarioTermo {
  sigla: string;
  nome_completo: string;
  descricao: string;
  categoria: 'tributo' | 'indicador' | 'regime' | 'instrumento' | 'conceito';
}

export interface RuleDocumentation {
  id: string;
  modulo: RuleModule;
  nome: string;
  descricao: string;
  formula?: string;
  formula_explicada?: string;
  embasamento_legal: LegalBasis[];
  variaveis: Variable[];
  exemplo_numerico?: NumericExample;
  observacoes?: string[];
  ultima_atualizacao: string;
  tags?: string[];
  vigencia?: Vigencia;
  alertas?: Alerta[];
  historico?: HistoricoAlteracao[];
}

export type RuleModule = 
  | 'simulador-in-2306'
  | 'irpf-alta-renda'
  | 'rating-validator'
  | 'simulador-imoveis'
  | 'editais-pgfn'
  | 'itbi'
  | 'itcmd';

export interface ModuleInfo {
  key: RuleModule;
  nome: string;
  descricao: string;
  icone: string;
  cor: string;
}

export const MODULES_INFO: ModuleInfo[] = [
  {
    key: 'simulador-in-2306',
    nome: 'Simulador IN 2.306/2026',
    descricao: 'Lucro Presumido com acréscimo 10% sobre receita excedente',
    icone: 'calculator',
    cor: 'blue',
  },
  {
    key: 'irpf-alta-renda',
    nome: 'IRPF Alta Renda',
    descricao: 'Lei 15.270/2025 - Tributação mínima sobre alta renda',
    icone: 'user-dollar',
    cor: 'purple',
  },
  {
    key: 'rating-validator',
    nome: 'Rating Validator',
    descricao: 'Capacidade de pagamento PGFN - Portaria 6.757/2022',
    icone: 'chart-bar',
    cor: 'green',
  },
  {
    key: 'simulador-imoveis',
    nome: 'Simulador de Imóveis',
    descricao: 'Comparativo PF vs PJ vs Reforma Tributária 2027',
    icone: 'building',
    cor: 'orange',
  },
  {
    key: 'editais-pgfn',
    nome: 'Editais PGFN',
    descricao: 'Transação tributária e descontos por modalidade',
    icone: 'file-text',
    cor: 'red',
  },
  {
    key: 'itbi',
    nome: 'ITBI na integralização',
    descricao: 'Tema 796 — imunidade na holding patrimonial',
    icone: 'building',
    cor: 'teal',
  },
  {
    key: 'itcmd',
    nome: 'ITCMD na doação',
    descricao: 'Doação com ou sem reserva de usufruto',
    icone: 'file-text',
    cor: 'indigo',
  },
];
