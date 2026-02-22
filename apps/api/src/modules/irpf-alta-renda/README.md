# Módulo IRPF Alta Renda (Lei 15.270/2025)

## Descrição

Simulação de impacto tributário da alta renda com base em dados da declaração de IRPF (DAA). Entrada por **formulário manual** e por **upload de PDF** com extração via OpenAI (nome, CPF, ano, rendimentos tributáveis e dividendos). Regras conforme **Lei 15.270/2025**.

Documentação das regras: [docs/regras_tributacao.md](../../../../../docs/regras_tributacao.md).

## Regras de Negócio

- **BCC (Base de Cálculo Combinada)**: RT (Rendimentos Tributáveis) + soma dos rendimentos isentos de lucros (códigos 09 – Lucros e dividendos; 13 – Sócio ME/EPP Simples Nacional). Aplicações financeiras, JCP e poupança/LCI/LCA não entram.
- **BCC (Base de Cálculo Combinada)**: RT + códigos 09/13 + `outros_isentos_que_entram_base` − exclusões (`lucros_aprovados_ate_31dez2025`, `ganho_capital_excluido`, `rendimentos_fiis_excluidos`, `outros_excluidos_art_16a`).
- **Faixas**: Até R$ 600.000 isento; de R$ 600.000,01 a R$ 1.200.000 alíquota progressiva até 10%; acima de R$ 1.200.000 alíquota fixa 10%.
- **Antecipação (Art. 5º)**: Retenção de 10% na fonte sobre dividendos quando pagamento no mês > R$ 50.000. O sistema sinaliza risco quando alguma fonte tem valor anual que, dividido por 12, supera esse limite.
- **Classificação automática de exclusões (Art. 16-A § 1º)**: parser/importação identifica CRI, CRA, LCI, LCA, LIG, poupança e debêntures de infraestrutura como `outros_excluidos_art_16a`.
- **Doação/herança (Art. 16-A § 1º III)**: itens de transferência patrimonial (ex.: códigos 01 e 03) são classificados como exclusão da base, sem depender apenas de texto livre.
- **Lei 7.713 (Art. 12-A)**: rendimentos exclusivos da fonte só são tratados nesse bloco quando não há opção por ajuste anual (`optou_ajuste_anual_lei_7713 = false`).
- **Simulador de otimização**: compara cenário com ativos isentos que entram na base versus cenário tributado (Lei 7.713) com IRRF compensável.

## Dependências

- **Módulo**: Feature toggle `IRPF_ALTA_RENDA`.
- **Repositories**: `CompanyRepository` (validação de empresa ao salvar com `company_id`).
- **Tabela tenant**: `irpf_alta_renda` (coluna `company_id` referencia `public.companies(id)`).

## Fluxos e Endpoints

### POST /irpf-alta-renda/import-declaration

- **Descrição**: Importa arquivo .dec ou .dbk (Programa IRPF / e-CAC) e retorna `{ ano, dados, declaracao_completa }` para preencher o formulário.
- **Diagnóstico**: retorna `diagnostico` com `completude` e `avisos` para orientar revisão manual quando houver parsing parcial.
- **Body**: `multipart/form-data` com campo **file** (arquivo .dec ou .dbk).
- **Resposta**: `{ data: { ano, dados: DadosIrpfAltaRenda, declaracao_completa } }`.
- **Validação**: Extensão .dec ou .dbk, tamanho máx 5MB.

### POST /irpf-alta-renda/extract-from-pdf

- **Descrição**: Extrai dados de IRPF de um PDF (ex.: DAA, resumo da declaração) usando OpenAI e retorna `{ ano, dados }` para preencher o formulário.
- **Diagnóstico**: retorna `diagnostico` com `completude` e `avisos` (ex.: etapa com falha, texto truncado, fallback legado).
- **Body**: `multipart/form-data` com campo **file** (arquivo PDF).
- **Resposta**: `{ data: { ano, dados: DadosIrpfAltaRenda } }`.
- **Requisito**: Variável de ambiente **OPENAI_API_KEY** configurada na API.

### POST /irpf-alta-renda/simulate

- **Descrição**: Simula impacto tributário sem persistir.
- **Body**: `SimulateIrpfAltaRendaInputSchema` (ano, dados: contribuinte, rendimentos_tributaveis, rendimentos_isentos_dividendos).
- **Resposta**: `IrpfAltaRendaSimulacaoResponse` com:
  - resultado fiscal (base, faixa, imposto),
  - `composicao_renda`,
  - `impacto_incremental_base`,
  - `memoria_legal_exclusoes`,
  - `otimizacao_isento_vs_tributado`,
  - `memoria_calculo` (inclui `premissas_aplicadas` quando houver aproximações).

### POST /irpf-alta-renda/simulate-and-save

- **Body**: Idem ao simulate + `client_id?`, `title?`.
- **Resposta**: `{ registro, resultado }` (registro persistido + mesmo objeto de resultado da simulação).

### GET /irpf-alta-renda

- **Query**: `client_id?`, `ano?`, `page`, `limit`.
- **Resposta**: `{ items, total, page, limit }`.

### GET /irpf-alta-renda/:id

- **Resposta**: `{ registro }`.

### DELETE /irpf-alta-renda/:id
- ### POST /irpf-alta-renda/report-summary

- **Descrição**: Gera payload JSON estruturado para relatório executivo (base para PDF futuro).
- **Body**: `ReportSummaryIrpfAltaRendaInputSchema`.
- **Resposta**: `ReportSummaryIrpfAltaRendaResponseSchema` (resumo executivo, composição, comparativo otimização, memória legal e recomendações).

- **Resposta**: `{ success: true }`.

## Isolamento

- Todas as operações rodam no schema do tenant (`search_path` definido pelo middleware). Não é necessário `company_id` nas queries da tabela `irpf_alta_renda`.

## Ajuste à regulamentação (Lei 15.270/2025)

Os parâmetros do motor de cálculo estão centralizados para facilitar atualização quando a Receita Federal publicar regulamentação (tabela ou fórmula da faixa progressiva):

- **Arquivo**: `irpf-alta-renda/calculations.ts`
- **Objeto**: `CONFIG_LEI_15270_2025` — contém `limite_isento`, `limite_progressiva`, `aliquota_fixa_percentual`, `limite_retencao_mensal`, `fonte_normativa` e `observacao_progressiva`.
- **Faixa progressiva (600k–1,2M)**: Atualmente usa interpolação linear (0% em 600k até 10% em 1,2M). Se a Receita divulgar tabela ou fórmula oficial, alterar a função `aplicarFaixas` em `calculations.ts` e, se necessário, atualizar `observacao_progressiva` no config.
- A memória de cálculo (resposta da API e tela) inclui `fonte_normativa` e `observacao_progressiva` para auditoria.
