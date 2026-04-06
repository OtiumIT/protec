# Referencias de Leiaute SPED (ECD e ECF)

Este documento registra os blocos e registros usados na primeira versao de extracao automatica de arquivos `.txt` SPED no modulo `fiscal-files`.

## Fontes oficiais (SPED/RFB)

- [ECD - Manual de Orientacao do Leiaute](http://sped.rfb.gov.br/item/show/53)
- [Manuais SPED](http://sped.rfb.gov.br/pasta/show/1644)
- [ECF - Manual de Orientacao do Leiaute (Leiaute 11)](http://sped.rfb.gov.br/arquivo/show/7625)

## Registros mapeados na extracao inicial

### Comuns para identificacao de cliente

- `0000`: cabecalho da escrituracao
  - Tipo do arquivo (`LECD`/`LECF`)
  - CNPJ da empresa
  - Razao social
  - Periodo inicial/final
- `0930`: signatarios (nome/cpf/qualificacao)
- `0030` (ECF): dados cadastrais complementares (CNAE, UF, municipio, email)

### Demonstracoes contabeis (ECD/ECF com bloco contabil)

- `J100`: balanco patrimonial (resumo)
  - Ativo total
  - Ativo circulante
  - Ativo nao circulante
  - Passivo total
  - Passivo circulante
  - Passivo nao circulante
  - Patrimonio liquido
  - **Nota**: em ECD com varios `J005` (trimestres + exercicio), a mesma descricao em `J100` repete-se por periodo. O parser escolhe a linha cujo `J005` coincide com o fim do periodo do `0000` e, havendo empate, prefere o intervalo igual ao exercicio completo (inicio e fim do cabecalho), nao apenas a ultima ocorrencia no arquivo.

- `J150`: DRE (resumo)
  - Receita bruta
  - Deducoes
  - Receita liquida
  - Lucro bruto
  - Despesas operacionais
  - Resultado do periodo/exercicio

### ECF societario (inicial)

- `Y600`: identificacao e remuneracao de socios/titulares/dirigentes
  - cpf/cnpj do socio
  - nome
  - qualificacao
  - participacao percentual (quando presente)
  - valores declarados (campos numericos disponiveis no registro)

### ECF fiscal-contabil (foco IN 2.306)

- `K030`: identificacao do periodo trimestral (T01..T04)
- `K355`: saldos de contas de resultado no periodo
- `C050`: plano de contas (descricao da conta para classificar receita/despesa)

Combinacao usada:
- `K030` (trimestre) + `K355` (valor por conta) + `C050` (descricao)
- gera sinal de `receitas_possiveis` e `despesas_possiveis` por trimestre (heuristico)
- gera tambem prefill estruturado para IN 2.306:
  - `trimestres[]` (produtos, servicos, demais)
  - `deducoes_trimestrais[]` (ICMS, PIS/COFINS)
  - `retencoes_trimestrais[]` (IRRF, orgaos publicos)
  - `source_trace` (trilha conta -> campo)

## Persistencia da extracao

Quando os registros `J100` e/ou `J150` estao presentes:

- `balance_sheet` -> tabela `extracted_fiscal_data.data_type`
- `dre` -> tabela `extracted_fiscal_data.data_type`
- `module_prefill_rating_validator` -> candidato para prefill do modulo Rating Validator
- `module_prefill_simulador_in2306` -> candidato para prefill do Simulador IN 2.306
- `module_prefill_irpf_alta_renda` -> candidato para prefill do modulo IRPF Alta Renda
- `ecf_tax_signals` -> sinais trimestrais para apoiar prefill do Simulador IN 2.306
- `prefill_catalog` -> catalogo explicito `campo_destino <- origem_sped`
- metadados completos da inspeccao -> `fiscal_files.metadata.sped_inspection`

## Proximas evolucoes

1. Expandir para blocos fiscais da ECF (`N*`, `Y*`) e demais demonstrativos.
2. Incluir validacoes de consistencia entre saldos (ativo/passivo/pl).
3. Versionar parser por leiaute (ex.: ECF leiaute 11, ECD versao 9/10/etc).
4. Criar testes com amostras reais anonimizadas para cada ano-calendario.
