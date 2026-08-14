# Motor ITCMD (doação)

Função pura `calcularItcmd` em `itcmd-calculations.ts`. Schema em `schemas/itcmd.schema.ts`.

- Tabelas embutidas (simulação): SP, RJ, MG, RS, PR, SC, GO, DF.
- Demais UFs: `aliquota_manual_percent`.
- Usufruto: sim/não + idade → nua propriedade pelas faixas etárias documentadas em `rules-itcmd.ts`.
- Imóvel: critério de base `mercado` | `referencia_itbi` | `iptu`.
- Cotas (Ltda / S.A. fechada): critério `patrimonio_liquido` | `valor_mercado`. A escolha varia por UF — o motor não impõe regra estadual.
- Fora da v1: 27 UFs, causa mortis, upload de balanço, otimizador de domicílio.
- Aviso: simulação, não substitui guia estadual.
