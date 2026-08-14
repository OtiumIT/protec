import { z } from 'zod';

const money = z.number().finite().nonnegative();

export const ItcmdBemTipoSchema = z.enum(['imovel', 'quotas']);
export type ItcmdBemTipo = z.infer<typeof ItcmdBemTipoSchema>;

export const ItcmdParentescoSchema = z.enum(['ascendente', 'descendente', 'outros']);
export type ItcmdParentesco = z.infer<typeof ItcmdParentescoSchema>;

export const ItcmdCriterioImovelSchema = z.enum(['mercado', 'referencia_itbi', 'iptu']);
export type ItcmdCriterioImovel = z.infer<typeof ItcmdCriterioImovelSchema>;

export const ItcmdCriterioQuotasSchema = z.enum(['patrimonio_liquido', 'valor_mercado']);
export type ItcmdCriterioQuotas = z.infer<typeof ItcmdCriterioQuotasSchema>;

export const ItcmdTipoSociedadeSchema = z.enum(['ltda', 'sa_fechada']);
export type ItcmdTipoSociedade = z.infer<typeof ItcmdTipoSociedadeSchema>;

export const ITCMD_CRITERIO_IMOVEL_LABEL: Record<ItcmdCriterioImovel, string> = {
  mercado: 'valor de mercado',
  referencia_itbi: 'valor de referência do ITBI (planta/prefeitura)',
  iptu: 'valor de IPTU (venal)',
};

export const ITCMD_CRITERIO_QUOTAS_LABEL: Record<ItcmdCriterioQuotas, string> = {
  patrimonio_liquido: 'patrimônio líquido (último balanço)',
  valor_mercado: 'valor de mercado',
};

export const ITCMD_TABELA_UFS = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'GO', 'DF'] as const;
export type ItcmdTabelaUf = (typeof ITCMD_TABELA_UFS)[number];

export const ItcmdSimulationInputSchema = z
  .object({
    snapshot_version: z.literal(1),
    uf: z.string().length(2),
    tipo_bem: ItcmdBemTipoSchema,
    /** Valor resolvido (critério escolhido ou simulação v1). */
    valor: money,
    parentesco: ItcmdParentescoSchema,
    reserva_usufruto: z.boolean(),
    idade_usufrutuario: z.number().int().min(0).max(120).optional(),
    aliquota_manual_percent: z.number().positive().max(20).optional(),
    criterio_base_imovel: ItcmdCriterioImovelSchema.optional(),
    criterio_quotas: ItcmdCriterioQuotasSchema.optional(),
    tipo_sociedade: ItcmdTipoSociedadeSchema.optional(),
    valor_mercado: money.optional(),
    valor_referencia_itbi: money.optional(),
    valor_iptu: money.optional(),
    valor_pl: money.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.reserva_usufruto && data.idade_usufrutuario == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['idade_usufrutuario'],
        message: 'Informe a idade do usufrutuário quando houver reserva de usufruto.',
      });
    }
    const uf = data.uf.toUpperCase();
    const temTabela = (ITCMD_TABELA_UFS as readonly string[]).includes(uf);
    if (!temTabela && data.aliquota_manual_percent == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['aliquota_manual_percent'],
        message: 'Informe a alíquota para UFs sem tabela embutida.',
      });
    }
  });
export type ItcmdSimulationInput = z.infer<typeof ItcmdSimulationInputSchema>;

export const ItcmdMemoriaItemSchema = z.object({
  ordem: z.number().int(),
  descricao: z.string(),
  valor: z.number().optional(),
});

export const ItcmdSimulationResultSchema = z.object({
  uf: z.string(),
  tabela_embutida: z.boolean(),
  valor_bem: z.number(),
  criterio_base: z.string().optional(),
  tipo_sociedade: ItcmdTipoSociedadeSchema.optional(),
  fracao_usufruto: z.number(),
  fracao_nua_propriedade: z.number(),
  base: z.number(),
  aliquota_percent: z.number(),
  itcmd: z.number(),
  efeito_usufruto: z.string(),
  memoria: z.array(ItcmdMemoriaItemSchema),
  aviso: z.string(),
});
export type ItcmdSimulationResult = z.infer<typeof ItcmdSimulationResultSchema>;
