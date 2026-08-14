# Motor ITBI

Função pura `calcularItbi` em `itbi-calculations.ts`. Schema em `schemas/itbi.schema.ts`.

- Fato gerador no motor: `integralizacao | permuta | onerosa`. A UI da v1 só envia `integralizacao`.
- Tema 796: holding patrimonial — imunidade até o capital vs. a referência **declarada**.
- Critério da referência (`criterio_referencia`): `mercado` | `referencia_itbi` (planta/prefeitura) | `iptu` (venal). Sem critério (sims v1): fallback mercado → venal → integralização.
- Alíquota informada pelo aluno. Sem consulta à prefeitura. Laudêmio: alerta, sem cálculo.
- Aviso: simulação, não substitui guia municipal nem parecer.
