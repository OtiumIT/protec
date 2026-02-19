# Mapeamento Leiaute .dec/.dbk (DIRPF)

Baseado na documentação da Receita Federal. O parser suporta dois formatos:

1. **Pipe-delimitado (|)** — leiaute TXT de alguns anos
2. **Fixed-width (posições fixas)** — formato do PGD/e-CAC (ex.: 2025)

## Regras gerais
- Pipe: delimitador `|` (formato antigo)
- Fixed-width: colunas em posições fixas (formato PGD 2025)
- CPF/CNPJ: 11/14 dígitos, zeros à esquerda
- Valores: 13 ou 15 dígitos (11/13 inteiras + 2 decimais), sem vírgula/ponto
- Datas: AAAAMMDD

## Formato fixed-width (PGD 2025)

### Linha 1 – Cabeçalho IRPF
- 0-7: "IRPF"
- 8-16: ano exercício (ex.: 20252024)
- 16-50: segmento até duplo espaço → últimos 11 dígitos = CPF
- 37-100: nome do contribuinte

### Valores monetários
- **13 dígitos** (11 inteiros + 2 decimais): tipo 20, 21, 23
- **15 dígitos** (13 inteiros + 2 decimais): tipo 22 (outros códigos)

### Tipos de registro (2 primeiros chars)
- **16**: endereço
- **19**: resumo (não usar primeiro número = 19+CPF)
- **20**: totais oficiais — 13-26 total PJ, 26-39 total PF, 64-77 imposto, 78-91 base
- **21**: sócio PJ (rendimentos) — nome 24-74, primeiro bloco 13 dígitos após o nome = lucros
- **22**: resumo por código (cód. 25-27, valor 36-51); para 09/13 não usar (usar tipo 23)
- **23**: isentos por código — código 14-17, valor 13 dígitos 17-30 (09 = dividendos, 13 = sócio Simples)
- **24**: outros códigos
- **25**: dependentes
- **26**: 01/21/26/99 = Pagamentos Efetuados (deduções), **não** são rendimentos; 09/13 = isentos
- **27**: bens/direitos

## Registros conhecidos (pipe-delimitado)
| Código | Descrição |
|--------|-----------|
| DIRF   | Cabeçalho |
| RESPO  | Responsável |
| DECPF  | Declarante pessoa física |
| RTRT   | Rendimentos tributáveis |
| RTIRF  | Imposto retido na fonte |
| BPFDEC | Beneficiário PF |
| IDREC  | Código de receita |

## Campos extraídos (parser atual)
- **Identificação**: nome, CPF, exercício (cabeçalho ou nome do arquivo)
- **Rendimentos tributáveis PJ**: apenas tipo 21 (empresas). Tipo 26 com 01/21/26/99 = pagamentos/deduções, não entram.
- **Totais PJ/PF**: tipo 20 (blocos 13-26 e 26-39).
- **Rendimentos isentos 09/13**: tipo 23 (valores detalhados); tipo 22 para 09/13 ignorado para não duplicar.
- **Resumo**: tipo 20 (base 78-91, imposto 64-77).

## Referência
- [Leiaute DIRPF](https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/documentos-tecnicos/dirpf) — PDF por ano
