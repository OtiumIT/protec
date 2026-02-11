/**
 * Tipos e estruturas para Editais PGFN
 * Baseado nos Editais 2025 e Portaria PGFN 6.757/2022
 */

export type Rating = 'A' | 'B' | 'C' | 'D';

export type TransactionModality =
  | 'CAPAG'
  | 'PEQUENO_VALOR'
  | 'CONTENCIOSO'
  | 'IRRECUPERAVEIS'
  | 'DESENROLA_RURAL'
  | 'PTI';

export type CompanyType = 'REGULAR' | 'MEI' | 'ME' | 'EPP' | 'RECUPERACAO_JUDICIAL' | 'SANTA_CASA';

export interface DiscountRules {
  /** Desconto sobre o valor principal da dívida (%) */
  principal?: number;
  /** Desconto sobre juros (%) */
  interest?: number;
  /** Desconto sobre multas (%) */
  fees?: number;
  /** Desconto sobre encargos (%) */
  charges?: number;
  /** Limite máximo de desconto total (% do valor da dívida) */
  maxTotalDiscount?: number;
  /** Descontos progressivos baseados em prazo de parcelamento */
  progressive?: Array<{
    maxMonths: number;
    discount: number;
  }>;
}

export interface EligibilityCriteria {
  /** Valor máximo elegível (em centavos) */
  maxAmount?: number;
  /** Valor mínimo elegível (em centavos) */
  minAmount?: number;
  /** Requer cálculo de rating */
  requiresRating?: boolean;
  /** Ratings elegíveis */
  allowedRatings?: Rating[];
  /** Tipos de empresa elegíveis */
  allowedCompanyTypes?: CompanyType[];
  /** Dívida deve estar inscrita há X anos */
  minYearsInscribed?: number;
  /** Requer processo judicial específico */
  requiresJudicialProcess?: boolean;
  /** Tese jurídica específica (para contencioso) */
  legalThesis?: string;
}

export interface PaymentTerms {
  /** Percentual de entrada (%) */
  entryPercent: number;
  /** Número máximo de parcelas para entrada */
  entryInstallments: number;
  /** Número máximo de parcelas para o saldo */
  maxInstallments: number;
  /** Valor mínimo da parcela (em centavos) */
  minInstallmentAmount?: number;
}

export interface Edital {
  /** Código do edital (ex: "PGDAU-11-2025") */
  code: string;
  /** Nome oficial do edital */
  name: string;
  /** Descrição */
  description: string;
  /** Data de início */
  startDate: string; // ISO date
  /** Data de término (prazo final) */
  endDate: string; // ISO date
  /** Se o prazo foi prorrogado */
  extended?: boolean;
  /** Modalidade de transação */
  modality: TransactionModality;
  /** Condições de pagamento */
  paymentTerms: PaymentTerms;
  /** Regras de desconto por rating */
  discountRules: Partial<Record<Rating, DiscountRules>>;
  /** Critérios de elegibilidade */
  eligibility: EligibilityCriteria;
  /** Observações adicionais */
  notes?: string;
  /** Link para o edital oficial */
  officialLink?: string;
}

/**
 * Configuração de salário mínimo (atualizar anualmente)
 */
export const SALARIO_MINIMO_2025 = 1412; // R$ 1.412,00

/**
 * Base de dados de Editais PGFN
 */
export const EDITAIS: Edital[] = [
  // Edital PGDAU 11/2025 - CAPAG
  {
    code: 'PGDAU-11-2025',
    name: 'Edital PGDAU nº 11/2025',
    description: 'Transação por Capacidade de Pagamento (CAPAG)',
    startDate: '2025-01-01',
    endDate: '2026-01-30',
    extended: true,
    modality: 'CAPAG',
    paymentTerms: {
      entryPercent: 6,
      entryInstallments: 12,
      maxInstallments: 114,
      minInstallmentAmount: 10000, // R$ 100,00
    },
    discountRules: {
      A: {
        // Rating A: apenas entrada facilitada, sem descontos
        principal: 0,
        interest: 0,
        fees: 0,
        maxTotalDiscount: 0,
      },
      B: {
        // Rating B: apenas entrada facilitada, sem descontos
        principal: 0,
        interest: 0,
        fees: 0,
        maxTotalDiscount: 0,
      },
      C: {
        // Rating C: descontos sobre juros e multas, limitado a 65% do valor total
        principal: 0,
        interest: 100, // 100% desconto sobre juros
        fees: 100, // 100% desconto sobre multas
        maxTotalDiscount: 65, // Limitado a 65% do valor total da dívida
      },
      D: {
        // Rating D: descontos sobre juros e multas, limitado a 65% do valor total
        principal: 0,
        interest: 100,
        fees: 100,
        maxTotalDiscount: 65,
      },
    },
    eligibility: {
      maxAmount: 4500000000, // R$ 45 milhões (em centavos)
      requiresRating: true,
      allowedRatings: ['A', 'B', 'C', 'D'],
    },
    notes:
      'Edital mais importante de 2025. Prazo prorrogado até 30/01/2026. Para ME/EPP/MEI/Recuperação Judicial, desconto pode chegar a 70%.',
    officialLink: 'https://www.gov.br/pgfn/pt-br/servicos/orientacoes-contribuintes/acordo-de-transacao/edital-pgdau-11-2025',
  },

  // Edital PGDAU 11/2025 - Pequeno Valor
  {
    code: 'PGDAU-11-2025-PEQUENO-VALOR',
    name: 'Edital PGDAU nº 11/2025 - Pequeno Valor',
    description: 'Transação de Pequeno Valor',
    startDate: '2025-01-01',
    endDate: '2026-01-30',
    extended: true,
    modality: 'PEQUENO_VALOR',
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 5,
      maxInstallments: 55,
      minInstallmentAmount: 2500, // R$ 25,00 para MEI
    },
    discountRules: {
      // Descontos progressivos independente de rating
      A: {
        progressive: [
          { maxMonths: 7, discount: 50 },
          { maxMonths: 12, discount: 45 },
          { maxMonths: 30, discount: 40 },
          { maxMonths: 55, discount: 30 },
        ],
      },
      B: {
        progressive: [
          { maxMonths: 7, discount: 50 },
          { maxMonths: 12, discount: 45 },
          { maxMonths: 30, discount: 40 },
          { maxMonths: 55, discount: 30 },
        ],
      },
      C: {
        progressive: [
          { maxMonths: 7, discount: 50 },
          { maxMonths: 12, discount: 45 },
          { maxMonths: 30, discount: 40 },
          { maxMonths: 55, discount: 30 },
        ],
      },
      D: {
        progressive: [
          { maxMonths: 7, discount: 50 },
          { maxMonths: 12, discount: 45 },
          { maxMonths: 30, discount: 40 },
          { maxMonths: 55, discount: 30 },
        ],
      },
    },
    eligibility: {
      maxAmount: 60 * SALARIO_MINIMO_2025 * 100, // 60 SM em centavos
      minAmount: 2500, // R$ 25,00 para MEI
      allowedCompanyTypes: ['MEI', 'ME', 'EPP'],
    },
    notes: 'Focado em pessoas físicas e microempresas. Descontos progressivos baseados no prazo escolhido.',
  },

  // Edital PGDAU 11/2025 - Débitos Irrecuperáveis
  {
    code: 'PGDAU-11-2025-IRRECUPERAVEIS',
    name: 'Edital PGDAU nº 11/2025 - Débitos Irrecuperáveis',
    description: 'Transação de Débitos Irrecuperáveis',
    startDate: '2025-01-01',
    endDate: '2026-01-30',
    extended: true,
    modality: 'IRRECUPERAVEIS',
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 12,
      maxInstallments: 114,
    },
    discountRules: {
      A: {
        principal: 70,
        interest: 100,
        fees: 100,
        maxTotalDiscount: 70,
      },
      B: {
        principal: 70,
        interest: 100,
        fees: 100,
        maxTotalDiscount: 70,
      },
      C: {
        principal: 70,
        interest: 100,
        fees: 100,
        maxTotalDiscount: 70,
      },
      D: {
        principal: 70,
        interest: 100,
        fees: 100,
        maxTotalDiscount: 70,
      },
    },
    eligibility: {
      minYearsInscribed: 15,
      // Requer comprovação: dívida há mais de 15 anos, devedor falido ou empresa com atividades encerradas
    },
    notes: 'Descontos máximos permitidos por lei. Requer comprovação de situação específica.',
  },

  // Editais de Contencioso - Tese IPI
  {
    code: 'PGFN-52-2025',
    name: 'Edital PGFN nº 52/2025',
    description: 'Transação no Contencioso - Conceito de "Praça" para cálculo do IPI',
    startDate: '2025-01-01',
    endDate: '2025-11-28',
    modality: 'CONTENCIOSO',
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 6,
      maxInstallments: 60,
    },
    discountRules: {
      A: { principal: 65, maxTotalDiscount: 65 },
      B: { principal: 65, maxTotalDiscount: 65 },
      C: { principal: 65, maxTotalDiscount: 65 },
      D: { principal: 65, maxTotalDiscount: 65 },
    },
    eligibility: {
      requiresJudicialProcess: true,
      legalThesis: 'IPI - Conceito de Praça entre empresas interdependentes',
    },
    notes: 'Desconto até 65% independente de rating. Contribuinte desiste da ação judicial.',
  },

  // Editais de Contencioso - Preço de Transferência
  {
    code: 'PGFN-53-2025',
    name: 'Edital PGFN nº 53/2025',
    description: 'Transação no Contencioso - Preço de Transferência (PRL)',
    startDate: '2025-01-01',
    endDate: '2025-11-28',
    modality: 'CONTENCIOSO',
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 6,
      maxInstallments: 60,
    },
    discountRules: {
      A: { principal: 65, maxTotalDiscount: 65 },
      B: { principal: 65, maxTotalDiscount: 65 },
      C: { principal: 65, maxTotalDiscount: 65 },
      D: { principal: 65, maxTotalDiscount: 65 },
    },
    eligibility: {
      requiresJudicialProcess: true,
      legalThesis: 'Preço de Transferência (PRL)',
    },
    notes: 'Desconto até 65% independente de rating. Contribuinte desiste da ação judicial.',
  },

  // Editais de Contencioso - IRPJ/CSLL Desmutualização
  {
    code: 'PGFN-54-2025',
    name: 'Edital PGFN nº 54/2025',
    description: 'Transação no Contencioso - IRPJ/CSLL sobre ganhos na desmutualização',
    startDate: '2025-01-01',
    endDate: '2025-12-29',
    modality: 'CONTENCIOSO',
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 6,
      maxInstallments: 60,
    },
    discountRules: {
      A: { principal: 65, maxTotalDiscount: 65 },
      B: { principal: 65, maxTotalDiscount: 65 },
      C: { principal: 65, maxTotalDiscount: 65 },
      D: { principal: 65, maxTotalDiscount: 65 },
    },
    eligibility: {
      requiresJudicialProcess: true,
      legalThesis: 'IRPJ/CSLL - Ganhos na desmutualização da Bovespa/BM&F',
    },
    notes: 'Desconto até 65% independente de rating. Contribuinte desiste da ação judicial.',
  },

  // Programa Desenrola Rural
  {
    code: 'PGFN-3-2025',
    name: 'Edital PGFN nº 3/2025 - Desenrola Rural',
    description: 'Programa Desenrola Rural',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    modality: 'DESENROLA_RURAL',
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 12,
      maxInstallments: 120,
    },
    discountRules: {
      A: { principal: 50, maxTotalDiscount: 50 },
      B: { principal: 50, maxTotalDiscount: 50 },
      C: { principal: 60, maxTotalDiscount: 60 },
      D: { principal: 60, maxTotalDiscount: 60 },
    },
    eligibility: {
      allowedCompanyTypes: ['REGULAR'],
      // Focado em produtores rurais e cooperativas
    },
    notes: 'Focado no setor do agronegócio. Dívidas inscritas na Dívida Ativa da União e do FGTS.',
  },

  // Programa de Transação Integral (PTI)
  {
    code: 'PTI-2025',
    name: 'Programa de Transação Integral (PTI)',
    description: 'Modalidade PRJ - Potencial Razoável de Recuperação do Crédito Judicializado',
    startDate: '2025-09-01',
    endDate: '2025-12-31',
    modality: 'PTI',
    paymentTerms: {
      entryPercent: 5,
      entryInstallments: 6,
      maxInstallments: 84,
    },
    discountRules: {
      A: { principal: 50, maxTotalDiscount: 50 },
      B: { principal: 50, maxTotalDiscount: 50 },
      C: { principal: 60, maxTotalDiscount: 60 },
      D: { principal: 60, maxTotalDiscount: 60 },
    },
    eligibility: {
      requiresJudicialProcess: true,
      // Créditos ainda não inscritos em dívida ativa (em discussão judicial)
    },
    notes: 'Lançado em setembro/2025. Permite transacionar créditos ainda não inscritos em dívida ativa.',
  },
];

/**
 * Funções utilitárias para trabalhar com editais
 */

/**
 * Buscar editais por modalidade
 */
export function getEditaisByModality(modality: TransactionModality): Edital[] {
  return EDITAIS.filter((edital) => edital.modality === modality);
}

/**
 * Buscar editais elegíveis para um cenário específico
 */
export function getEligibleEditais(params: {
  amount: number; // em centavos
  rating?: Rating;
  companyType?: CompanyType;
  hasJudicialProcess?: boolean;
  yearsInscribed?: number;
  date?: string; // ISO date, default: hoje
}): Edital[] {
  const today = params.date ? new Date(params.date) : new Date();

  return EDITAIS.filter((edital) => {
    // Verificar se está dentro do prazo
    const startDate = new Date(edital.startDate);
    const endDate = new Date(edital.endDate);
    if (today < startDate || today > endDate) {
      return false;
    }

    // Verificar critérios de elegibilidade
    const { eligibility } = edital;

    // Valor máximo
    if (eligibility.maxAmount && params.amount > eligibility.maxAmount) {
      return false;
    }

    // Valor mínimo
    if (eligibility.minAmount && params.amount < eligibility.minAmount) {
      return false;
    }

    // Requer rating
    if (eligibility.requiresRating && !params.rating) {
      return false;
    }

    // Ratings permitidos
    if (eligibility.allowedRatings && params.rating && !eligibility.allowedRatings.includes(params.rating)) {
      return false;
    }

    // Tipos de empresa
    if (eligibility.allowedCompanyTypes && params.companyType && !eligibility.allowedCompanyTypes.includes(params.companyType)) {
      return false;
    }

    // Anos inscrito
    if (eligibility.minYearsInscribed && (!params.yearsInscribed || params.yearsInscribed < eligibility.minYearsInscribed)) {
      return false;
    }

    // Processo judicial
    if (eligibility.requiresJudicialProcess && !params.hasJudicialProcess) {
      return false;
    }

    return true;
  });
}

/**
 * Obter regras de desconto para um edital e rating específicos
 */
export function getDiscountRules(edital: Edital, rating: Rating, companyType?: CompanyType): DiscountRules | null {
  const rules = edital.discountRules[rating];
  if (!rules) return null;

  // Ajustar limite máximo para tipos especiais (ME/EPP/MEI/Recuperação)
  if (edital.modality === 'CAPAG' && (rating === 'C' || rating === 'D')) {
    const specialTypes: CompanyType[] = ['MEI', 'ME', 'EPP', 'RECUPERACAO_JUDICIAL'];
    if (companyType && specialTypes.includes(companyType) && rules.maxTotalDiscount) {
      return {
        ...rules,
        maxTotalDiscount: 70, // Aumenta para 70% para tipos especiais
      };
    }
  }

  return rules;
}

/**
 * Obter condições de pagamento ajustadas por tipo de empresa
 */
export function getPaymentTerms(edital: Edital, companyType?: CompanyType): PaymentTerms {
  const terms = { ...edital.paymentTerms };

  // Ajustar prazo máximo para tipos especiais
  if (edital.modality === 'CAPAG' || edital.modality === 'IRRECUPERAVEIS') {
    const specialTypes: CompanyType[] = ['MEI', 'ME', 'EPP', 'SANTA_CASA'];
    if (companyType && specialTypes.includes(companyType)) {
      terms.maxInstallments = 133; // Aumenta para 133 parcelas
    }
  }

  return terms;
}

/**
 * Verificar se um edital está ativo (dentro do prazo)
 */
export function isEditalActive(edital: Edital, date?: string): boolean {
  const checkDate = date ? new Date(date) : new Date();
  const startDate = new Date(edital.startDate);
  const endDate = new Date(edital.endDate);
  return checkDate >= startDate && checkDate <= endDate;
}

/**
 * Obter editais ativos
 */
export function getActiveEditais(date?: string): Edital[] {
  return EDITAIS.filter((edital) => isEditalActive(edital, date));
}
