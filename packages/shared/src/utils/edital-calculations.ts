/**
 * Funções utilitárias para cálculos baseados em editais
 */

import type {
  Edital,
  Rating,
  CompanyType,
} from '../types/edital.js';
import { getPaymentTerms } from '../types/edital.js';

export interface SimulationResult {
  edital: Edital;
  rating: Rating;
  companyType?: CompanyType;
  /** Valor da dívida (em centavos) */
  debtAmount: number;
  /** Valor da entrada (em centavos) */
  entryAmount: number;
  /** Número de parcelas da entrada */
  entryInstallments: number;
  /** Valor a ser parcelado (em centavos) */
  amountToInstall: number;
  /** Valor da parcela mensal (em centavos) */
  monthlyPayment: number;
  /** Número máximo de parcelas */
  maxInstallments: number;
  /** Valor total com juros e multas (em centavos) */
  totalWithInterest: number;
  /** Valor total após descontos (em centavos) */
  totalWithDiscount: number;
  /** Economia total (em centavos) */
  savings: number;
  /** Desconto sobre principal (em centavos) */
  discountOnPrincipal: number;
  /** Desconto sobre juros (em centavos) */
  discountOnInterest: number;
  /** Desconto sobre multas (em centavos) */
  discountOnFees: number;
  /** Juros estimados (em centavos) */
  estimatedInterest: number;
  /** Multas estimadas (em centavos) */
  estimatedFees: number;
  /** Se é elegível */
  isEligible: boolean;
  /** Motivo de não elegibilidade (se aplicável) */
  ineligibilityReason?: string;
}

/**
 * Calcular simulação para um edital específico
 */
export function calculateEditalSimulation(
  edital: Edital,
  debtAmount: number, // em centavos
  rating: Rating,
  options: {
    companyType?: CompanyType;
    estimatedInterestPercent?: number; // % de juros estimado (default: 15%)
    estimatedFeesPercent?: number; // % de multas estimado (default: 10%)
    installmentMonths?: number; // Número de parcelas escolhido (opcional)
  } = {}
): SimulationResult | null {
  const {
    companyType,
    estimatedInterestPercent = 15,
    estimatedFeesPercent = 10,
    installmentMonths,
  } = options;

  // Obter regras de desconto
  const discountRules = edital.discountRules[rating];
  if (!discountRules) {
    return {
      edital,
      rating,
      companyType,
      debtAmount,
      entryAmount: 0,
      entryInstallments: 0,
      amountToInstall: 0,
      monthlyPayment: 0,
      maxInstallments: 0,
      totalWithInterest: 0,
      totalWithDiscount: 0,
      savings: 0,
      discountOnPrincipal: 0,
      discountOnInterest: 0,
      discountOnFees: 0,
      estimatedInterest: 0,
      estimatedFees: 0,
      isEligible: false,
      ineligibilityReason: 'Rating não elegível para este edital',
    };
  }

  // Obter condições de pagamento
  const paymentTerms = getPaymentTerms(edital, companyType);

  // Calcular juros e multas estimados
  const estimatedInterest = Math.round((debtAmount * estimatedInterestPercent) / 100);
  const estimatedFees = Math.round((debtAmount * estimatedFeesPercent) / 100);
  const totalWithInterest = debtAmount + estimatedInterest + estimatedFees;

  // Calcular descontos
  let discountOnPrincipal = 0;
  let discountOnInterest = 0;
  let discountOnFees = 0;

  // Desconto sobre principal
  if (discountRules.principal) {
    discountOnPrincipal = Math.round((totalWithInterest * discountRules.principal) / 100);
  }

  // Desconto sobre juros
  if (discountRules.interest) {
    discountOnInterest = Math.round((estimatedInterest * discountRules.interest) / 100);
  }

  // Desconto sobre multas
  if (discountRules.fees) {
    discountOnFees = Math.round((estimatedFees * discountRules.fees) / 100);
  }

  // Aplicar descontos progressivos (para Pequeno Valor)
  if (discountRules.progressive && installmentMonths) {
    const progressiveRule = discountRules.progressive
      .sort((a, b) => b.maxMonths - a.maxMonths)
      .find((rule) => installmentMonths <= rule.maxMonths);

    if (progressiveRule) {
      discountOnPrincipal = Math.round((totalWithInterest * progressiveRule.discount) / 100);
    }
  }

  // Calcular desconto total
  let totalDiscount = discountOnPrincipal + discountOnInterest + discountOnFees;

  // Aplicar limite máximo de desconto
  if (discountRules.maxTotalDiscount) {
    const maxDiscountAmount = Math.round((debtAmount * discountRules.maxTotalDiscount) / 100);
    if (totalDiscount > maxDiscountAmount) {
      // Proporcionalmente reduzir descontos
      const ratio = maxDiscountAmount / totalDiscount;
      discountOnPrincipal = Math.round(discountOnPrincipal * ratio);
      discountOnInterest = Math.round(discountOnInterest * ratio);
      discountOnFees = Math.round(discountOnFees * ratio);
      totalDiscount = maxDiscountAmount;
    }
  }

  // Valor final após descontos
  const totalWithDiscount = totalWithInterest - totalDiscount;

  // Calcular entrada
  const entryAmount = Math.round((debtAmount * paymentTerms.entryPercent) / 100);
  const amountToInstall = totalWithDiscount - entryAmount;

  // Calcular parcela mensal
  const installments = installmentMonths || paymentTerms.maxInstallments;
  const monthlyPayment = Math.round(amountToInstall / installments);

  return {
    edital,
    rating,
    companyType,
    debtAmount,
    entryAmount,
    entryInstallments: paymentTerms.entryInstallments,
    amountToInstall,
    monthlyPayment,
    maxInstallments: installments,
    totalWithInterest,
    totalWithDiscount,
    savings: totalDiscount,
    discountOnPrincipal,
    discountOnInterest,
    discountOnFees,
    estimatedInterest,
    estimatedFees,
    isEligible: true,
  };
}


/**
 * Comparar simulações e identificar a mais vantajosa
 */
export function compareSimulations(simulations: SimulationResult[]): {
  best: SimulationResult | null;
  comparisons: Array<SimulationResult & { isBest: boolean; savingsVsWorst: number }>;
} {
  if (simulations.length === 0) {
    return { best: null, comparisons: [] };
  }

  // Filtrar apenas elegíveis
  const eligible = simulations.filter((s) => s.isEligible);
  if (eligible.length === 0) {
    return {
      best: null,
      comparisons: simulations.map((s) => ({ ...s, isBest: false, savingsVsWorst: 0 })),
    };
  }

  // Ordenar por menor valor total (mais vantajosa)
  eligible.sort((a, b) => a.totalWithDiscount - b.totalWithDiscount);

  const best = eligible[0];
  const worst = eligible[eligible.length - 1];

  const comparisons = simulations.map((sim) => ({
    ...sim,
    isBest: sim === best,
    savingsVsWorst: sim.isEligible ? worst.totalWithDiscount - sim.totalWithDiscount : 0,
  }));

  return { best, comparisons };
}
