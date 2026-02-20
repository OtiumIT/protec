/**
 * Schema para saída estruturada da extração OCR do PDF da ECD (SPED Contábil).
 * Recibo de Entrega + Balanço Patrimonial + DRE.
 * Valores: número com ponto decimal; (100,00) no original = -100.00.
 */

import { z } from 'zod';

const optionalNum = z.number().optional();
const optionalStr = z.string().optional();

export const EcdDocumentoInfoSchema = z.object({
  tipo: optionalStr,
  versao_leiaute: optionalStr,
  natureza_livro: optionalStr,
  numero_ordem: optionalNum,
  periodo_escrituracao: z
    .object({
      inicio: z.string().optional(),
      fim: z.string().optional(),
    })
    .optional(),
  data_autenticacao: optionalStr,
  hash_arquivo: optionalStr,
});

export const EcdSignatarioSchema = z.object({
  nome: optionalStr,
  qualificacao: optionalStr,
  cpf: optionalStr,
  responsavel_legal: z.boolean().optional(),
});

export const EcdEntidadeSchema = z.object({
  nome: optionalStr,
  cnpj: optionalStr,
  signatarios: z.array(EcdSignatarioSchema).optional(),
});

// Balanço: estrutura flexível (contas podem vir como totais ou detalhadas)
const EcdAtivoCirculanteSchema = z.object({
  total: optionalNum,
  contas: z.record(z.string(), z.number()).optional(),
});

const EcdAtivoNaoCirculanteSchema = z.object({
  total: optionalNum,
  realizavel_a_longo_prazo: optionalNum,
  emprestimos_socios: optionalNum,
  depositos_judiciais: optionalNum,
  investimentos: optionalNum,
  imobilizado: optionalNum,
  intangivel: optionalNum,
  outros: optionalNum,
}).passthrough();

const EcdPassivoCirculanteSchema = z.object({
  total: optionalNum,
  fornecedores: optionalNum,
  parcelamento_iptu: optionalNum,
  emprestimos_financiamentos: optionalNum,
  obrigacoes_trabalhistas: optionalNum,
  tributos_pagar: optionalNum,
  contas_pagar: optionalNum,
  provisoes: optionalNum,
  outros: optionalNum,
}).passthrough();

const EcdPassivoNaoCirculanteSchema = z.object({
  total: optionalNum,
  obrigacoes_tributarias_longo_prazo: optionalNum,
  obrigacoes_coligadas: optionalNum,
  provisoes: optionalNum,
  emprestimos_financiamentos_lp: optionalNum,
  outros: optionalNum,
}).passthrough();

const EcdPatrimonioLiquidoSchema = z.object({
  total: optionalNum,
  capital_social: optionalNum,
  reservas: optionalNum,
  reservas_capital: optionalNum,
  reservas_lucros: optionalNum,
  prejuizos_acumulados: optionalNum,
  lucros_prejuizos_acumulados: optionalNum,
  outros_ajustes: optionalNum,
}).passthrough();

const EcdDreSchema = z.object({
  receita_liquida: optionalNum,
  receita_bruta: optionalNum,
  deducoes_vendas: optionalNum,
  lucro_bruto: optionalNum,
  custos_vendas: optionalNum,
  despesas_operacionais: optionalNum,
  despesas_financeiras: optionalNum,
  resultado_liquido_periodo: optionalNum,
  resultado_financeiro: optionalNum,
  outros_resultados: optionalNum,
}).passthrough();

export const EcdDemonstrativoContabilSchema = z.object({
  balanco_patrimonial: z
    .object({
      ativo: z
        .object({
          circulante: EcdAtivoCirculanteSchema.optional(),
          nao_circulante: EcdAtivoNaoCirculanteSchema.optional(),
          total_geral: optionalNum,
        })
        .optional(),
      passivo: z
        .object({
          circulante: EcdPassivoCirculanteSchema.optional(),
          nao_circulante: EcdPassivoNaoCirculanteSchema.optional(),
        })
        .optional(),
      patrimonio_liquido: EcdPatrimonioLiquidoSchema.optional(),
    })
    .optional(),
  dre: EcdDreSchema.optional(),
});

export const EcdExtractedSchema = z.object({
  documento_info: EcdDocumentoInfoSchema.optional(),
  entidade: EcdEntidadeSchema.optional(),
  demonstrativo_contabil: EcdDemonstrativoContabilSchema.optional(),
});

export type EcdExtracted = z.infer<typeof EcdExtractedSchema>;

/** Valor monetário seguro (undefined/null/unknown → 0) */
function n(v: number | undefined | null | unknown): number {
  if (v == null || typeof v !== 'number' || Number.isNaN(v)) return 0;
  return v;
}

/** Arredonda para 2 casas decimais (evita resíduos de float que quebram multipleOf(0.01)) */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Mapeia o JSON extraído da ECD para o formato de entrada da simulação de rating (SimulateRatingInput).
 * Usa totais quando contas granulares não existirem; distribui em um único campo quando necessário.
 */
export function ecdExtractedToSimulateRatingInput(
  ecd: EcdExtracted,
  competence?: string
): {
  ativo_circulante: {
    caixa_equivalentes: number;
    aplicacoes_financeiras: number;
    contas_receber: number;
    estoques: number;
    tributos_recuperar: number;
    despesas_antecipadas: number;
    outros_ativos_circulantes: number;
  };
  ativo_nao_circulante: {
    realizavel_longo_prazo: {
      contas_receber_lp: number;
      emprestimos_concedidos: number;
      outros_creditos_lp: number;
    };
    investimentos: number;
    imobilizado: number;
    intangivel: number;
    outros_ativos_nao_circulantes: number;
  };
  passivo_circulante: {
    fornecedores: number;
    emprestimos_financiamentos: number;
    obrigacoes_trabalhistas: number;
    tributos_pagar: number;
    contas_pagar: number;
    provisoes: number;
    outros_passivos_circulantes: number;
  };
  passivo_nao_circulante: {
    emprestimos_financiamentos_lp: number;
    obrigacoes_trabalhistas_lp: number;
    tributos_pagar_lp: number;
    provisoes_lp: number;
    outros_passivos_nao_circulantes: number;
  };
  patrimonio_liquido: {
    capital_social: number;
    reservas_capital: number;
    reservas_lucros: number;
    lucros_prejuizos_acumulados: number;
    outros_ajustes: number;
  };
  competencia: string;
  dre?: {
    receita_bruta: number;
    deducoes_vendas: number;
    receita_liquida?: number;
    custos_vendas: number;
    despesas_operacionais: number;
    resultado_financeiro: number;
    outros_resultados: number;
  };
} {
  const bp = ecd.demonstrativo_contabil?.balanco_patrimonial;
  const at = bp?.ativo;
  const ac = at?.circulante;
  const anc = at?.nao_circulante;
  const pass = bp?.passivo;
  const pc = pass?.circulante;
  const pnc = pass?.nao_circulante;
  const pl = bp?.patrimonio_liquido;
  const dre = ecd.demonstrativo_contabil?.dre;

  const acTotal = n(ac?.total);
  const acContas = ac?.contas ?? {};
  const ancTotal = n(anc?.total);
  const rlp = n(anc?.realizavel_a_longo_prazo) + n(anc?.emprestimos_socios) + n(anc?.depositos_judiciais);
  const pcTotal = n(pc?.total);
  const pncTotal = n(pnc?.total);

  // Competência: fim do período (YYYY-MM) ou parâmetro
  let comp = competence ?? '';
  if (!comp && ecd.documento_info?.periodo_escrituracao?.fim) {
    const fim = ecd.documento_info.periodo_escrituracao.fim;
    comp = fim.slice(0, 7);
  }
  if (!comp) comp = '';

  const round = round2;
  return {
    ativo_circulante: {
      caixa_equivalentes: round(n(acContas['caixa_equivalentes'] ?? acContas['caixa'])),
      aplicacoes_financeiras: round(n(acContas['aplicacoes_financeiras'] ?? acContas['aplicacoes'])),
      contas_receber: round(n(acContas['contas_receber'] ?? acContas['clientes'])),
      estoques: round(n(acContas['estoques'])),
      tributos_recuperar: round(n(acContas['tributos_recuperar'] ?? acContas['tributos_a_recuperar'])),
      despesas_antecipadas: round(n(acContas['despesas_antecipadas'])),
      outros_ativos_circulantes: round(
        acTotal > 0
          ? Math.max(
              0,
              acTotal -
                n(acContas['caixa']) -
                n(acContas['caixa_equivalentes']) -
                n(acContas['aplicacoes']) -
                n(acContas['aplicacoes_financeiras']) -
                n(acContas['clientes']) -
                n(acContas['contas_receber']) -
                n(acContas['estoques']) -
                n(acContas['tributos_recuperar']) -
                n(acContas['tributos_a_recuperar']) -
                n(acContas['despesas_antecipadas']) -
                n(acContas['outros_creditos'])
            )
          : n(acContas['outros_creditos'] ?? acContas['outros_ativos_circulantes'])
      ),
    },
    ativo_nao_circulante: {
      realizavel_longo_prazo: {
        contas_receber_lp: round(rlp * 0.5),
        emprestimos_concedidos: round(n(anc?.emprestimos_socios)),
        outros_creditos_lp: round(Math.max(0, rlp - n(anc?.emprestimos_socios))),
      },
      investimentos: round(n(anc?.investimentos)),
      imobilizado: round(n(anc?.imobilizado)),
      intangivel: round(n(anc?.intangivel)),
      outros_ativos_nao_circulantes: round(
        Math.max(0, ancTotal - rlp - n(anc?.investimentos) - n(anc?.imobilizado) - n(anc?.intangivel))
      ),
    },
    passivo_circulante: {
      fornecedores: round(n(pc?.fornecedores)),
      emprestimos_financiamentos: round(n(pc?.emprestimos_financiamentos)),
      obrigacoes_trabalhistas: round(n(pc?.obrigacoes_trabalhistas)),
      tributos_pagar: round(n(pc?.tributos_pagar)),
      contas_pagar: round(n(pc?.contas_pagar)),
      provisoes: round(n(pc?.provisoes)),
      outros_passivos_circulantes: round(
        Math.max(
          0,
          pcTotal -
            n(pc?.fornecedores) -
            n(pc?.parcelamento_iptu) -
            n(pc?.emprestimos_financiamentos) -
            n(pc?.obrigacoes_trabalhistas) -
            n(pc?.tributos_pagar) -
            n(pc?.contas_pagar) -
            n(pc?.provisoes)
        ) || n(pc?.parcelamento_iptu)
      ),
    },
    passivo_nao_circulante: {
      emprestimos_financiamentos_lp: round(n(pnc?.emprestimos_financiamentos_lp)),
      obrigacoes_trabalhistas_lp: round(n(pnc?.obrigacoes_trabalhistas_lp)),
      tributos_pagar_lp: round(n(pnc?.obrigacoes_tributarias_longo_prazo ?? pnc?.tributos_pagar_lp)),
      provisoes_lp: round(n(pnc?.provisoes)),
      outros_passivos_nao_circulantes: round(
        Math.max(
          0,
          pncTotal -
            n(pnc?.obrigacoes_tributarias_longo_prazo) -
            n(pnc?.tributos_pagar_lp) -
            n(pnc?.obrigacoes_coligadas) -
            n(pnc?.provisoes) -
            n(pnc?.emprestimos_financiamentos_lp)
        ) || n(pnc?.obrigacoes_coligadas)
      ),
    },
    patrimonio_liquido: {
      capital_social: round(n(pl?.capital_social)),
      reservas_capital: round(n(pl?.reservas_capital ?? pl?.reservas)),
      reservas_lucros: round(n(pl?.reservas_lucros)),
      lucros_prejuizos_acumulados: round(n(pl?.prejuizos_acumulados ?? pl?.lucros_prejuizos_acumulados)),
      outros_ajustes: round(n(pl?.outros_ajustes)),
    },
    competencia: comp,
    dre: dre
      ? {
          receita_bruta: round(n(dre.receita_bruta)),
          deducoes_vendas: round(n(dre.deducoes_vendas)),
          receita_liquida: round(n(dre.receita_liquida)) || undefined,
          custos_vendas: round(n(dre.custos_vendas)),
          despesas_operacionais: round(n(dre.despesas_operacionais)),
          resultado_financeiro: round(
            n(dre.resultado_financeiro) !== 0 ? n(dre.resultado_financeiro) : (n(dre.despesas_financeiras) !== 0 ? -Math.abs(n(dre.despesas_financeiras)) : 0)
          ),
          outros_resultados: round(n(dre.outros_resultados)),
        }
      : undefined,
  };
}
