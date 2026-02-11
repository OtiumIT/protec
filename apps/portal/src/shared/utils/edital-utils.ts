/**
 * Utilitários para trabalhar com editais no frontend
 */

import {
  getEligibleEditais,
  isEditalActive,
  type Edital,
  type Rating,
  type CompanyType,
  type TransactionModality,
} from '@shared/core';
import { calculateEditalSimulation, compareSimulations, type SimulationResult } from '@shared/core';

/**
 * Converter centavos para reais
 */
export function centsToReais(cents: number): number {
  return cents / 100;
}

/**
 * Converter reais para centavos
 */
export function reaisToCents(reais: number): number {
  return Math.round(reais * 100);
}

/**
 * Obter simulações para todas as modalidades elegíveis
 */
export function getModalitySimulations(
  debtAmount: number, // em reais
  rating?: Rating,
  companyType?: CompanyType
): Array<{ modality: TransactionModality; simulation: SimulationResult | null }> {
  const amountCents = reaisToCents(debtAmount);

  // Buscar editais elegíveis
  const eligibleEditais = getEligibleEditais({
    amount: amountCents,
    rating,
    companyType,
  });

  // Agrupar por modalidade e pegar o principal de cada uma
  const modalities: TransactionModality[] = ['CAPAG', 'PEQUENO_VALOR', 'CONTENCIOSO', 'IRRECUPERAVEIS'];
  const results: Array<{ modality: TransactionModality; simulation: SimulationResult | null }> = [];

  for (const modality of modalities) {
    const edital = eligibleEditais.find((e) => e.modality === modality);
    if (edital && rating) {
      const simulation = calculateEditalSimulation(edital, amountCents, rating, { companyType });
      results.push({ modality, simulation });
    } else {
      results.push({ modality, simulation: null });
    }
  }

  return results;
}

/**
 * Comparar modalidades e identificar a mais vantajosa
 */
export function compareModalities(
  debtAmount: number, // em reais
  rating?: Rating,
  companyType?: CompanyType
) {
  const simulations = getModalitySimulations(debtAmount, rating, companyType)
    .map((r) => r.simulation)
    .filter((s): s is SimulationResult => s !== null && s.isEligible);

  return compareSimulations(simulations);
}

/**
 * Obter informações formatadas de um edital
 */
export function getEditalInfo(edital: Edital) {
  const endDate = new Date(edital.endDate);
  const today = new Date();
  const daysUntilEnd = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysUntilEnd <= 30 && daysUntilEnd > 0;

  return {
    ...edital,
    daysUntilEnd,
    isExpiringSoon,
    isActive: isEditalActive(edital),
  };
}
