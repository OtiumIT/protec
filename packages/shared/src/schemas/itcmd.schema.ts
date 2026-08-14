import { z } from 'zod';

const money = z.number().finite().nonnegative();

export const ItcmdBemTipoSchema = z.enum(['imovel', 'quotas']);
export type ItcmdBemTipo = z.infer<typeof ItcmdBemTipoSchema>;

export const ItcmdParentescoSchema = z.enum(['ascendente', 'descendente', 'outros']);
export type ItcmdParentesco = z.infer<typeof ItcmdParentescoSchema>;

export const ITCMD_TABELA_UFS = ['SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'GO', 'DF'] as const;
export type ItcmdTabelaUf = (typeof ITCMD_TABELA_UFS)[number];

export const ItcmdSimulationInputSchema = z
  .object({
    snapshot_version: z.literal(1),
    uf: z.string().length(2),
    tipo_bem: ItcmdBemTipoSchema,
    valor: money,
    parentesco: ItcmdParentescoSchema,
    reserva_usufruto: z.boolean(),
    idade_usufrutuario: z.number().int().min(0).max(120).optional(),
    aliquota_manual_percent: z.number().positive().max(20).optional(),
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
