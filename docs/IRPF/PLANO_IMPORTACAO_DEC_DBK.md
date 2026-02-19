# Plano: Importação de arquivos .dec e .dbk (IRPF Alta Renda)

## Contexto

O módulo IRPF Alta Renda oferece 3 modos de entrada de dados:

| Versão | Descrição | Status |
|--------|-----------|--------|
| 1 – Manual | Formulário completo com inputs manuais | ✅ Implementado |
| 2 – PDF + Manual | Upload de PDF → extração OpenAI → preenchimento do formulário | ✅ Implementado |
| 3 – Importação .dec/.dbk | Importa arquivos do Programa IRPF (PGD) ou e-CAC | ✅ Implementado |

Este documento descreve o plano de implementação da **Versão 3**.

---

## 1. O que são os arquivos .dec e .dbk?

| Arquivo | Quando é gerado | Conteúdo |
|---------|-----------------|----------|
| **.dbk** | Durante a edição, ao salvar backup antes de finalizar | Cópia de segurança dos dados em preenchimento |
| **.dec** | Após transmitir a declaração à Receita Federal | Dados completos da declaração enviada |
| **.rec** | Após transmitir | Recibo de entrega (comprovante) |

**Padrão de nomenclatura:** `{DBK|DEC|REC}_ORIGI|RETIF_{ano}_IRPF_{CPF}`

- **ORIGI**: declaração original  
- **RETIF**: declaração retificadora  

Exemplo: `DEC_ORIGI_2025_IRPF_12345678900`

---

## 2. Onde o contribuinte obtém os arquivos?

### Opção A: Programa IRPF (PGD) – desktop
- Download em: https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/download/pgd/dirpf  
- Ao transmitir: arquivos salvos em `C:\Arquivos de Programas RFB\IRPF{ano}\transmitidas\`  
- O .dec é gerado automaticamente após o envio

### Opção B: e-CAC (Centro de Atendimento Virtual)
- Declaração online em "Meu Imposto de Renda"  
- **Documentos e Arquivos** → **Cópia da Declaração** → **Arquivos da Declaração**  
- Download de ZIP contendo .dec e .rec

---

## 3. Estrutura técnica (Leiaute DIRPF)

Os arquivos .dec e .dbk usam a **mesma estrutura** do Programa IRPF (PGD):
- Baseados em texto, com registros de posição fixa  
- Documentação oficial: [Leiaute DIRPF](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/dirpf)  
- PDFs disponíveis por ano: 2023, 2022, 2021, etc. (ex.: `leiaute-dirpf-2023.pdf`)

**Ponto crítico:** O leiaute muda anualmente. A implementação deve:
- Suportar versões por ano (ex.: 2023, 2024, 2025)  
- Ou usar uma abordagem genérica com mapeamento de registros conhecidos  

**Tipos de registro comuns (exemplos):**
- Registros de identificação do contribuinte  
- Rendimentos tributáveis (PJ, PF)  
- Rendimentos isentos (códigos 09, 13, etc.)  
- Tributação exclusiva  
- Bens e direitos  
- Resumo da declaração  

---

## 4. Endpoint planejado

```
POST /irpf-alta-renda/import-declaration
```

**Request:** `multipart/form-data` com campo `file` (arquivo .dec ou .dbk)

**Response:** Mesmo formato de `POST /extract-from-pdf`:
```json
{
  "data": {
    "ano": 2025,
    "dados": { /* DadosIrpfAltaRenda */ },
    "declaracao_completa": { /* DeclaracaoIrpfCompleta */ }
  }
}
```

**Validações:**
- Extensão: `.dec` ou `.dbk`  
- Tamanho máximo: ex.: 5MB  
- Encoding: UTF-8 ou Latin-1 (a definir conforme leiaute)  

---

## 5. Fluxo de implementação sugerido

### Fase 1: Pesquisa e documentação
1. [x] Documentação em `docs/LEIAUTE_DEC_DBK_MAPEAMENTO.md`  
2. [x] Formato pipe-delimitado conforme leiaute DIRPF  

### Fase 2: Parser básico
1. [x] Criar `apps/api/src/modules/irpf-alta-renda/parse-dec-dbk.ts`  
2. [x] Implementar leitura do arquivo e extração de linhas/registros  
3. [x] Mapeamento: identificação, rendimentos tributáveis, dividendos (09/13), resumo  
4. [x] Retorna estrutura compatível com `DeclaracaoIrpfCompleta` e `DadosIrpfAltaRenda`  
5. [x] Incluir `lei_15_270_classificacao` no retorno  

### Fase 3: Integração e rota
1. [x] Rota `POST /irpf-alta-renda/import-declaration`  
2. [x] Validação: extensão .dec/.dbk, tamanho máx 5MB  
3. [x] Retorno no mesmo formato de `extract-from-pdf`  
4. [x] Tratamento de erros  

### Fase 4: Frontend
1. [x] Card "Importar .dec ou .dbk" em `IrpfAltaRenda.tsx`  
2. [x] Input file com `accept=".dec,.dbk"`  
3. [x] Chamada `POST /irpf-alta-renda/import-declaration`  
4. [x] `applyExtractedData` para preencher formulário  

---

## 6. Dependências e riscos

| Item | Descrição |
|------|-----------|
| **Leiaute por ano** | O formato pode variar entre anos. Estratégia: começar por um ano e expandir |
| **Encoding** | Verificar se .dec/.dbk usam Latin-1 ou UTF-8 |
| **Registros opcionais** | Nem toda declaração tem todos os tipos de registro |
| **Confidencialidade** | Arquivos contêm dados sensíveis – tratar com cuidado (não logar conteúdo bruto) |

---

## 7. Referências

- [Leiaute DIRPF – Receita Federal](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/dirpf)  
- [Download PGD IRPF](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/download/pgd/dirpf)  
- [Arquivos .DBK, .DEC e .REC – Leoa](https://www.leoa.com.br/blog/arquivo-dbk-dec-rec)  
