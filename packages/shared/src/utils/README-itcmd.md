# Motor ITCMD (doação)

Função pura `calcularItcmd` em `itcmd-calculations.ts`. Schema em `schemas/itcmd.schema.ts`.

- Tabelas embutidas (simulação): SP, RJ, MG, RS, PR, SC, GO, DF.
- Demais UFs: `aliquota_manual_percent`.
- Usufruto: sim/não + idade → nua propriedade pelas faixas etárias documentadas em `rules-itcmd.ts`.
- Fora da v1: 27 UFs, causa mortis, otimizador de domicílio.
- Aviso: simulação, não substitui guia estadual.
