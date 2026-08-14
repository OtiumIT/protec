import type { RuleDocumentation } from '@shared/types/documentation';
import { rulesIN2306 } from './rules-in-2306';
import { rulesIrpfAltaRenda } from './rules-irpf-alta-renda';
import { rulesRatingValidator } from './rules-rating-validator';
import { rulesImoveis } from './rules-imoveis';
import { rulesItbi } from './rules-itbi';
import { rulesItcmd } from './rules-itcmd';

export const allRules: RuleDocumentation[] = [
  ...rulesIN2306,
  ...rulesIrpfAltaRenda,
  ...rulesRatingValidator,
  ...rulesImoveis,
  ...rulesItbi,
  ...rulesItcmd,
];

export function getRulesByModule(modulo: string): RuleDocumentation[] {
  return allRules.filter((rule) => rule.modulo === modulo);
}

export function getRuleById(id: string): RuleDocumentation | undefined {
  return allRules.find((rule) => rule.id === id);
}

export function searchRules(query: string): RuleDocumentation[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  return allRules.filter((rule) => {
    const searchableText = [
      rule.nome,
      rule.descricao,
      rule.formula_explicada,
      ...(rule.tags ?? []),
      ...rule.embasamento_legal.map((l) => `${l.norma} ${l.artigo ?? ''} ${l.descricao ?? ''}`),
      ...rule.variaveis.map((v) => `${v.nome} ${v.descricao}`),
      ...(rule.observacoes ?? []),
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  });
}

export { rulesIN2306, rulesIrpfAltaRenda, rulesRatingValidator, rulesImoveis, rulesItbi, rulesItcmd };
