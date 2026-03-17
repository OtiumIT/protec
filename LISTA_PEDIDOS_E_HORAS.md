# Lista do que já foi feito – tempo estimado de trabalho (Tiago)

**Repositório:** https://github.com/OtiumIT/protec  

Lista de **todos os pedidos** feitos ao Cursor neste projeto, com **tempo de trabalho estimado** por item (valores inteiros, para uso em orçamento e cobrança).  
Use como referência do que já foi feito; o tempo é do trabalho de desenvolvimento/ajustes (não inclui tempo de reuniões ou do colega em outras ferramentas).

*Os transcripts não identificam usuário; esta lista contém tudo o que foi pedido no workspace. Se parte foi feita por colega no mesmo Cursor, você pode riscar ou anotar os itens que não foram seus.*

---

## Infraestrutura / Git / Deploy

| # | O que foi pedido | Horas |
|---|------------------|-------|
| 1 | De pull em tudo | 1 h |
| 2 | De push em tudo (várias vezes) | 1 h |
| 3 | Arrumar erro de build no Render e dar push | 1 h |
| 4 | Erro build Render: arrumar, push (antes pull para mergear) | 1 h |
| 5 | Deixar tudo rodando (subir serviços) | 1 h |
| 6 | Ajustar Cloudflare Pages para deploy automático | 1 h |

**Subtotal infra:** 6 h

---

## Simulador imobiliário (LC 214/2025, Reforma, PF/PJ)

| # | O que foi pedido | Horas |
|---|------------------|-------|
| 7 | Ajustes ao simulador imobiliário (imagens + plano LC 214): redutor social, imóveis residenciais/comerciais, redutor 70%/50% misto, receitas/despesas Lei 7.713, impressão completa/simplificada | 3 h |
| 8 | Implementar plano “Ajustes Simulador Imobiliário”: presunção 16%, critérios IBS/CBS PF, ano a ano 2027–2033, quantidade de imóveis, remover hospitalar, textos “Reforma LC 214/2025”, card ano a ano, documentação | 4 h |
| 9 | Alterações do dono do sistema (transcrições/áudios): presunção 16% até 120k, contribuinte IBS/CBS PF (>3 imóveis + >240k ou >288k), demonstração 2027–2033, campo quantidade imóveis, IN 1700/1997, Lei 9.249/95, atualizar manual | 4 h |
| 10 | Locação imobiliária: presunção 16% vs 32%, demonstração (cliente) | 1 h |
| 11 | Salvar simulação no histórico – corrigir erro ao selecionar opção | 1 h |
| 12 | Botões “Salvar simulação” nas páginas (igual IRPF alta renda); trocar checkbox por botão (UX) | 1 h |
| 13 | Fix: referência IN RFB 1700/2017 art. 33 §7; Lei 7.739/1989 em Despesas dedutíveis (PF) | 1 h |
| 14 | Perfil “ambos” e exibição do redutor no cálculo IBS-CBS | 2 h |

**Subtotal simulador imobiliário:** 17 h

---

## IRPF Alta Renda (calculadora, extração PDF, CRUD)

| # | O que foi pedido | Horas |
|---|------------------|-------|
| 15 | Analisar calculadora IRPF alta renda completa | 1 h |
| 16 | Analisar como analista UX/UI + tributário e sugerir melhorias (IRPF alta renda) | 1 h |
| 17 | Melhorar IRPF alta renda (analista tributário + UI/UX) | 1 h |
| 18 | Evolução estratégica IRPF Alta Renda & Holding (PF vs PJ), comparar PF vs PJ | 2 h |
| 19 | Exportação PDF: opção “só resultado” ou “resultado + parâmetros”; corrigir corte no PDF | 1 h |
| 20 | Ver arquitetura/fluxo/prompts da integração IA para extração de PDF IRPF e conversão para JSON (para melhorias no Gemini) | 1 h |
| 21 | Refatoração extração IRPF: GPT-4o em contexto único (sem 4 etapas), sem truncamento 18k, regras de tabela/valores/lista/ano; implementar plano | 3 h |
| 22 | CRUD IRPF alta renda: salvar JSON completo, exibir 3 etapas + nome arquivo, editar/deletar, “Salvar” vs “Salvar novo”; implementar plano | 3 h |
| 23 | Reverter alterações que prejudicaram o PDF (layout/header/dimensões) | 1 h |
| 24 | Corte lateral no PDF e gráfico “Composição da renda” (legenda à esquerda, valor na legenda) | 1 h |
| 25 | Container visível na exportação PDF (overlay, elemento correto, delay) | 1 h |

**Subtotal IRPF Alta Renda:** 16 h

---

## Documentação e regras

| # | O que foi pedido | Horas |
|---|------------------|-------|
| 26 | Technical Writer: área de documentação com todas as regras do sistema (cálculos, frases, embasamento) para especialista tributário opinar/alterar; planejar cursor rule para toda regra nova ir para documentação | 2 h |

**Subtotal documentação:** 2 h

---

## Landing page (página inicial, O Produto, hero, logo)

| # | O que foi pedido | Horas |
|---|------------------|-------|
| 43 | Visão de marketing / estrutura da landing: Hero, Solução, Funcionalidades, Diferenciais, CTA, Footer, copy (Protec – Inteligência Tributária) | 3 h |
| 44 | Plano landing atualizado: SPED/arquivos (o que prometer vs não), sem “em breve”, copy por recurso, header com Entrar, inspiração referência (estilo consultoria) | 2 h |
| 45 | Página O Produto: estrutura (Hero com CTA, CredibilityNumbers, WhoIsFor, módulos com imagens, bloco confiança, FAQ, CTAs); análise de conversão sem depoimentos | 4 h |
| 46 | Imagens da landing: lista e prompts para Canva (ilustração Hero, fundo Hero); prompt para hero da página O Produto | 1 h |
| 47 | Logo IATax: onde salvar (`public/`), aplicar na landing (header e footer) e na área logada (sidebar, login, register) | 1 h |

**Subtotal landing page:** 12 h (ainda haverá alterações)

---

## UX/UI – Área logada, menu, ícones, Canva

| # | O que foi pedido | Horas |
|---|------------------|-------|
| 27 | Menu/header: ao dar scroll o menu sobe; refino UX área logada (menu esquerdo + header), “cara de plataforma”; implementar plano (scroll único, sidebar sticky, header, reset por rota) | 2 h |
| 28 | Menu: categorias mais evidentes, ícones, menu recolhível (só 1 expandida), Administração separada | 2 h |
| 29 | Canva – ícones: comandos/prompts para criar ícones no Canva (estilo do projeto) | 4 h |
| 30 | Prompts para 3 imagens no Canva (PDF/DAA, .dec/.dbk, inserção manual) | 1 h |

**Subtotal UX/UI + Canva:** 9 h

---

## Transação tributária / Ranking de parcelamento

| # | O que foi pedido | Horas |
|---|------------------|-------|
| 31 | Transação Tributária – Capacidade de Pagamento: impressão e salvamento/CRUD da simulação igual ao padrão das outras páginas | 1 h |
| 32 | Planejar alterações no ranking de parcelamento: comparar situação atual do parcelamento PGFN vs nova possibilidade de enquadramento; campo/opção para impressão de relatórios; atualizar documentação (PDFs anexados) | 2 h |

**Subtotal transação/ranking:** 3 h

---

## Cadastro e validações

| # | O que foi pedido | Horas |
|---|------------------|-------|
| 33 | Cadastro: (1) permitir PF, (2) arrumar obrigatoriedade (erro por falta de email), (3) comentário sobre puxar dados da Receita por CNPJ (API paga), (4) máscara de telefone e demais máscaras; revisar validações | 2 h |

**Subtotal cadastro:** 2 h

---

## Análises e ajustes pontuais

| # | O que foi pedido | Horas |
|---|------------------|-------|
| 34 | Problema em algum cálculo – análise passada pelo Gemini | 1 h |
| 35 | Tabelas com colunas por mês: coluna “valor anual” e botão para dividir por 12 e preencher meses (rateio), com possibilidade de editar | 2 h |
| 36 | Analista tributário: revisar análise comparativa PF vs PJ (relatório “10,6% a mais por investir via PJ”) | 1 h |
| 37 | Analista tributário: documento de requisitos do cliente (resumo Gemini) para implementação | 1 h |
| 38 | Analista de dados/sistemas: verificar se dados das páginas de simulação estão sendo salvos e se há como editar ou ao menos visualizar | 1 h |
| 39 | UI/UX: implementar rateio automático em outros campos (solicitação do Bruno) | 1 h |
| 40 | Menu: usuário (Globo da Morte) não via opções; admin via – ajuste de permissões/opções | 1 h |

**Subtotal análises:** 8 h

---

## Pequenos / utilitários

| # | O que foi pedido | Horas |
|---|------------------|-------|
| 41 | App para transcrever áudios .ogg | 1 h |
| 42 | Resumo do que foi feito para enviar ao cliente; deixar bom para colar no WhatsApp | 1 h |

**Subtotal pequenos:** 2 h

---

## Resumo total (tempo estimado de trabalho)

| Área | Horas |
|------|-------|
| Infra / Git / Deploy | 6 h |
| Simulador imobiliário | 17 h |
| IRPF Alta Renda | 16 h |
| Documentação e regras | 2 h |
| **Landing page** | **12 h** |
| UX/UI (menu, área logada) + Canva | 9 h |
| Transação tributária / Ranking | 3 h |
| Cadastro | 2 h |
| Análises pontuais | 8 h |
| Pequenos / utilitários | 2 h |
| **Total** | **77 h** |

---

## Valor/hora sugerido para o projeto

Projeto com domínio tributário, React, Node, multitenancy, integração com IA (extração PDF) e regras de negócio complexas. Sugestão de faixa por hora (referência Brasil, 2025):

| Faixa | Valor/hora (R$) | Uso |
|-------|------------------|-----|
| **Conservador** | R$ 150 – R$ 200 | Cliente enxuto ou primeiro orçamento. |
| **Justo** | R$ 200 – R$ 280 | Desenvolvedor pleno/sênior + domínio tributário. |
| **Premium** | R$ 280 – R$ 350 | Especialista, escopo complexo, prazo curto. |

**Valor total do projeto (exemplo):**

- 77 h × R$ 200/h = **R$ 15.400**
- 77 h × R$ 250/h = **R$ 19.250**
- 77 h × R$ 300/h = **R$ 23.100**

Recomendação: usar **R$ 220/h a R$ 280/h** como base para orçamento (valor justo, margem para negociação). Se quiser “jogar pra cima”, feche em **80 h** e **R$ 250/h** → **R$ 20.000** (valor redondo e fácil de comunicar).

---

## Observações

- Todas as horas estão em **valores inteiros** para facilitar orçamento e cobrança.
- Landing page: 12 h já consideram que ainda haverá alterações; se precisar incluir mais mudanças, pode somar horas à frente.
- Para considerar **só o seu tempo**: se algum item foi feito por colega, risque ou anote e subtraia do total antes de fechar valor.
