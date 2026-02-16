# Módulo IRPF Alta Renda (Lei 15.270/2025)

## Descrição

Simulação de impacto tributário da alta renda com base em dados da declaração de IRPF (DAA). Entrada por **formulário manual** e, futuramente, opção por upload de PDF com extração. Regras conforme **Lei 15.270/2025**.

Documentação das regras: [docs/regras_tributacao.md](../../../../../docs/regras_tributacao.md).

## Regras de Negócio

- **BCC (Base de Cálculo Combinada)**: RT (Rendimentos Tributáveis) + soma dos rendimentos isentos de lucros (códigos 09 – Lucros e dividendos; 13 – Sócio ME/EPP Simples Nacional). Aplicações financeiras, JCP e poupança/LCI/LCA não entram.
- **Faixas**: Até R$ 600.000 isento; de R$ 600.000,01 a R$ 1.200.000 alíquota progressiva até 10%; acima de R$ 1.200.000 alíquota fixa 10%.
- **Antecipação (Art. 5º)**: Retenção de 10% na fonte sobre dividendos quando pagamento no mês > R$ 50.000. O sistema sinaliza risco quando alguma fonte tem valor anual que, dividido por 12, supera esse limite.

## Dependências

- **Módulo**: Feature toggle `IRPF_ALTA_RENDA`.
- **Repositories**: `ClientRepository` (validação de cliente ao salvar com `client_id`).
- **Tabela tenant**: `irpf_alta_renda`.

## Fluxos e Endpoints

### POST /irpf-alta-renda/simulate

- **Descrição**: Simula impacto tributário sem persistir.
- **Body**: `SimulateIrpfAltaRendaInputSchema` (ano, dados: contribuinte, rendimentos_tributaveis, rendimentos_isentos_dividendos).
- **Resposta**: `IrpfAltaRendaSimulacaoResponse` (base_calculo_combinada, faixa, aliquota_percentual, imposto_estimado, risco_retencao_mensal, risco_retencao_detalhe, memoria_calculo).

### POST /irpf-alta-renda/simulate-and-save

- **Body**: Idem ao simulate + `client_id?`, `title?`.
- **Resposta**: `{ registro, resultado }` (registro persistido + mesmo objeto de resultado da simulação).

### GET /irpf-alta-renda

- **Query**: `client_id?`, `ano?`, `page`, `limit`.
- **Resposta**: `{ items, total, page, limit }`.

### GET /irpf-alta-renda/:id

- **Resposta**: `{ registro }`.

### DELETE /irpf-alta-renda/:id

- **Resposta**: `{ success: true }`.

## Isolamento

- Todas as operações rodam no schema do tenant (`search_path` definido pelo middleware). Não é necessário `company_id` nas queries da tabela `irpf_alta_renda`.

## Ajuste à regulamentação (Lei 15.270/2025)

Os parâmetros do motor de cálculo estão centralizados para facilitar atualização quando a Receita Federal publicar regulamentação (tabela ou fórmula da faixa progressiva):

- **Arquivo**: `irpf-alta-renda/calculations.ts`
- **Objeto**: `CONFIG_LEI_15270_2025` — contém `limite_isento`, `limite_progressiva`, `aliquota_fixa_percentual`, `limite_retencao_mensal`, `fonte_normativa` e `observacao_progressiva`.
- **Faixa progressiva (600k–1,2M)**: Atualmente usa interpolação linear (0% em 600k até 10% em 1,2M). Se a Receita divulgar tabela ou fórmula oficial, alterar a função `aplicarFaixas` em `calculations.ts` e, se necessário, atualizar `observacao_progressiva` no config.
- A memória de cálculo (resposta da API e tela) inclui `fonte_normativa` e `observacao_progressiva` para auditoria.
