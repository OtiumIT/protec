# Catalogo de Campos Prontos por Modulo (SPED -> Plataforma)

Objetivo: registrar, de forma explicita, o mapeamento `campo_destino <- origem_sped` para futura integracao de prefill.

## Rating Validator

1. `ativo_circulante_total` <- `J100.descricao = "ATIVO CIRCULANTE".valor_final`
2. `passivo_circulante_total` <- `J100.descricao = "PASSIVO CIRCULANTE".valor_final`
3. `passivo_nao_circulante_total` <- `J100.descricao = "PASSIVO NAO CIRCULANTE".valor_final`
4. `patrimonio_liquido_total` <- `J100.descricao = "PATRIMONIO LIQUIDO".valor_final`
5. `dre.receita_bruta` <- `J150.descricao ~ "RECEITA BRUTA".valor_final`
6. `dre.receita_liquida` <- `J150.descricao ~ "RECEITA LIQUIDA".valor_final`
7. `dre.despesas_operacionais` <- `J150.descricao ~ "DESPESAS OPERACIONAIS".valor_final`

## Simulador IN 2.306

### Mapeamento preferencial (ECF trimestral)

1. `trimestres[n].produtos_mercadorias` <- `K030(periodo)` + `K355(valor)` + `C050(descricao da conta)`
   - Regra atual: classificador por dicionario de contas (keywords em descricao da conta).
2. `trimestres[n].servicos` <- `K355 + C050` (keywords de prestacao de servicos)
3. `trimestres[n].servicos_favorecida` <- `K355 + C050` (keywords de servicos com indicios de favorecimento)
4. `trimestres[n].servicos_hospitalares` <- `K355 + C050` (keywords de area hospitalar/saude)
5. `trimestres[n].demais_receitas` <- `K355 + C050` (fallback de receitas nao classificadas)
6. `deducoes_trimestrais[n].icms_destacado` <- `K355 + C050` (keywords `ICMS`)
7. `deducoes_trimestrais[n].pis_cofins_zero` <- `K355 + C050` (keywords `PIS|COFINS`)
8. `retencoes_trimestrais[n].irrf` <- `K355 + C050` (keywords `IRRF|IMP RENDA RETIDO`)
9. `retencoes_trimestrais[n].orgaos_publicos` <- `K355 + C050` (keywords `PCC|CSRF|ORGAOS PUBLICOS|RETENCAO`)

### Fallback anual (quando nao houver K030/K355 util)

1. `receita_bruta_anual` <- `J150.descricao ~ "RECEITA BRUTA".valor_final`

## IRPF Alta Renda

1. `dados.socios[]` <- `Y600` (identificacao/remuneracao de socios)
   - `nome` <- `Y600.nome`
   - `cpf` <- `Y600.cpf_cnpj`
   - `qualificacao` <- `Y600.qualificacao`
   - `participacao_percentual` <- `Y600.participacao_percentual`

## Observacoes

- Os mapeamentos acima ja sao produzidos na extracao e armazenados em:
  - `fiscal_files.metadata.module_prefill`
  - `extracted_fiscal_data` (`module_prefill_*`, `ecf_tax_signals`, `prefill_catalog`)
- Parte dos campos esta em modo heuristico (confianca media) e sera refinada quando integrarmos o prefill direto nos modulos.
- O parser agora guarda `source_trace` por trimestre (conta -> campo destino) para auditoria e ajuste fino do dicionario.
