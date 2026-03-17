# Lista do que já foi feito – tempo estimado de trabalho (Tiago)

**Repositório:** https://github.com/OtiumIT/protec  

Lista de **todos os pedidos** feitos ao Cursor neste projeto, com **tempo de trabalho estimado** por item.  
Use como referência do que já foi feito; o tempo é do trabalho de desenvolvimento/ajustes (não inclui tempo de reuniões ou do colega em outras ferramentas).

*Os transcripts não identificam usuário; esta lista contém tudo o que foi pedido no workspace. Se parte foi feita por colega no mesmo Cursor, você pode riscar ou anotar os itens que não foram seus.*

---

## Infraestrutura / Git / Deploy

| # | O que foi pedido | Tempo est. |
|---|------------------|------------|
| 1 | De pull em tudo | 0,1 h |
| 2 | De push em tudo (várias vezes) | 0,1 h cada |
| 3 | Arrumar erro de build no Render e dar push | 0,5 h |
| 4 | Erro build Render: arrumar, push (antes pull para mergear) | 0,5 h |
| 5 | Deixar tudo rodando (subir serviços) | 0,2 h |
| 6 | Ajustar Cloudflare Pages para deploy automático | 0,5–1 h |

**Subtotal infra:** ~1,5–2,5 h

---

## Simulador imobiliário (LC 214/2025, Reforma, PF/PJ)

| # | O que foi pedido | Tempo est. |
|---|------------------|------------|
| 7 | Ajustes ao simulador imobiliário (imagens + plano LC 214): redutor social, imóveis residenciais/comerciais, redutor 70%/50% misto, receitas/despesas Lei 7.713, impressão completa/simplificada | 2–3 h |
| 8 | Implementar plano “Ajustes Simulador Imobiliário”: presunção 16%, critérios IBS/CBS PF, ano a ano 2027–2033, quantidade de imóveis, remover hospitalar, textos “Reforma LC 214/2025”, card ano a ano, documentação | 3–4 h |
| 9 | Alterações do dono do sistema (transcrições/áudios): presunção 16% até 120k, contribuinte IBS/CBS PF (>3 imóveis + >240k ou >288k), demonstração 2027–2033, campo quantidade imóveis, IN 1700/1997, Lei 9.249/95, atualizar manual | 3–4 h |
| 10 | Locação imobiliária: presunção 16% vs 32%, demonstração (cliente) | 0,5 h |
| 11 | Salvar simulação no histórico – corrigir erro ao selecionar opção | 0,5 h |
| 12 | Botões “Salvar simulação” nas páginas (igual IRPF alta renda); trocar checkbox por botão (UX) | 0,5–1 h |
| 13 | Fix: referência IN RFB 1700/2017 art. 33 §7; Lei 7.739/1989 em Despesas dedutíveis (PF) | 0,3 h |
| 14 | Perfil “ambos” e exibição do redutor no cálculo IBS-CBS | 1–2 h |

**Subtotal simulador imobiliário:** ~11–18 h

---

## IRPF Alta Renda (calculadora, extração PDF, CRUD)

| # | O que foi pedido | Tempo est. |
|---|------------------|------------|
| 15 | Analisar calculadora IRPF alta renda completa | 0,5 h |
| 16 | Analisar como analista UX/UI + tributário e sugerir melhorias (IRPF alta renda) | 0,5–1 h |
| 17 | Melhorar IRPF alta renda (analista tributário + UI/UX) | 0,5–1 h |
| 18 | Evolução estratégica IRPF Alta Renda & Holding (PF vs PJ), comparar PF vs PJ | 1–2 h |
| 19 | Exportação PDF: opção “só resultado” ou “resultado + parâmetros”; corrigir corte no PDF | 1 h |
| 20 | Ver arquitetura/fluxo/prompts da integração IA para extração de PDF IRPF e conversão para JSON (para melhorias no Gemini) | 0,5–1 h |
| 21 | Refatoração extração IRPF: GPT-4o em contexto único (sem 4 etapas), sem truncamento 18k, regras de tabela/valores/lista/ano; implementar plano | 2–3 h |
| 22 | CRUD IRPF alta renda: salvar JSON completo, exibir 3 etapas + nome arquivo, editar/deletar, “Salvar” vs “Salvar novo”; implementar plano | 2–3 h |
| 23 | Reverter alterações que prejudicaram o PDF (layout/header/dimensões) | 0,3 h |
| 24 | Corte lateral no PDF e gráfico “Composição da renda” (legenda à esquerda, valor na legenda) | 0,5–1 h |
| 25 | Container visível na exportação PDF (overlay, elemento correto, delay) | 0,5 h |

**Subtotal IRPF Alta Renda:** ~10–17 h

---

## Documentação e regras

| # | O que foi pedido | Tempo est. |
|---|------------------|------------|
| 26 | Technical Writer: área de documentação com todas as regras do sistema (cálculos, frases, embasamento) para especialista tributário opinar/alterar; planejar cursor rule para toda regra nova ir para documentação | 1–2 h |

**Subtotal documentação:** ~1,5–2 h

---

## Landing page (página inicial, O Produto, hero, logo)

| # | O que foi pedido | Tempo est. |
|---|------------------|------------|
| 43 | Visão de marketing / estrutura da landing: Hero, Solução, Funcionalidades, Diferenciais, CTA, Footer, copy (Protec – Inteligência Tributária) | 1,5–2,5 h |
| 44 | Plano landing atualizado: SPED/arquivos (o que prometer vs não), sem “em breve”, copy por recurso, header com Entrar, inspiração referência (estilo consultoria) | 1–1,5 h |
| 45 | Página O Produto: estrutura (Hero com CTA, CredibilityNumbers, WhoIsFor, módulos com imagens, bloco confiança, FAQ, CTAs); análise de conversão sem depoimentos | 2–3 h |
| 46 | Imagens da landing: lista e prompts para Canva (ilustração Hero, fundo Hero); prompt para hero da página O Produto | 0,5–1 h |
| 47 | Logo IATax: onde salvar (`public/`), aplicar na landing (header e footer) e na área logada (sidebar, login, register) | 0,5 h |

**Subtotal landing page:** ~5,5–8,5 h

---

## UX/UI – Área logada, menu, ícones, Canva

| # | O que foi pedido | Tempo est. |
|---|------------------|------------|
| 27 | Menu/header: ao dar scroll o menu sobe; refino UX área logada (menu esquerdo + header), “cara de plataforma”; implementar plano (scroll único, sidebar sticky, header, reset por rota) | 1,5–2 h |
| 28 | Menu: categorias mais evidentes, ícones, menu recolhível (só 1 expandida), Administração separada | 1–2 h |
| 29 | Canva – ícones: comandos/prompts para criar ícones no Canva (estilo do projeto) | 3–4 h |
| 30 | Prompts para 3 imagens no Canva (PDF/DAA, .dec/.dbk, inserção manual) | 0,5 h |

**Subtotal UX/UI + Canva:** ~5,5–8,5 h

---

## Transação tributária / Ranking de parcelamento

| # | O que foi pedido | Tempo est. |
|---|------------------|------------|
| 31 | Transação Tributária – Capacidade de Pagamento: impressão e salvamento/CRUD da simulação igual ao padrão das outras páginas | 0,5–1 h |
| 32 | Planejar alterações no ranking de parcelamento: comparar situação atual do parcelamento PGFN vs nova possibilidade de enquadramento; campo/opção para impressão de relatórios; atualizar documentação (PDFs anexados) | 1–2 h |

**Subtotal transação/ranking:** ~1,5–3 h

---

## Cadastro e validações

| # | O que foi pedido | Tempo est. |
|---|------------------|------------|
| 33 | Cadastro: (1) permitir PF, (2) arrumar obrigatoriedade (erro por falta de email), (3) comentário sobre puxar dados da Receita por CNPJ (API paga), (4) máscara de telefone e demais máscaras; revisar validações | 1–2 h |

**Subtotal cadastro:** ~1–2 h

---

## Análises e ajustes pontuais

| # | O que foi pedido | Tempo est. |
|---|------------------|------------|
| 34 | Problema em algum cálculo – análise passada pelo Gemini | 0,5 h |
| 35 | Tabelas com colunas por mês: coluna “valor anual” e botão para dividir por 12 e preencher meses (rateio), com possibilidade de editar | 1–2 h |
| 36 | Analista tributário: revisar análise comparativa PF vs PJ (relatório “10,6% a mais por investir via PJ”) | 0,5 h |
| 37 | Analista tributário: documento de requisitos do cliente (resumo Gemini) para implementação | 0,5 h |
| 38 | Analista de dados/sistemas: verificar se dados das páginas de simulação estão sendo salvos e se há como editar ou ao menos visualizar | 0,5–1 h |
| 39 | UI/UX: implementar rateio automático em outros campos (solicitação do Bruno) | 0,5–1 h |
| 40 | Menu: usuário (Globo da Morte) não via opções; admin via – ajuste de permissões/opções | 0,5 h |

**Subtotal análises:** ~4–6 h

---

## Pequenos / utilitários

| # | O que foi pedido | Tempo est. |
|---|------------------|------------|
| 41 | App para transcrever áudios .ogg | 0,1 h |
| 42 | Resumo do que foi feito para enviar ao cliente; deixar bom para colar no WhatsApp | 0,2 h |

**Subtotal pequenos:** ~0,3 h

---

## Resumo total (tempo estimado de trabalho)

| Área | Tempo est. |
|------|------------|
| Infra / Git / Deploy | 1,5–2,5 h |
| Simulador imobiliário | 11–18 h |
| IRPF Alta Renda | 10–17 h |
| Documentação e regras | 1,5–2 h |
| **Landing page** | **5,5–8,5 h** |
| UX/UI (menu, área logada) | 2–4 h |
| Canva (ícones + 3 imagens) | 3,5–4,5 h |
| Transação tributária / Ranking | 1,5–3 h |
| Cadastro | 1–2 h |
| Análises pontuais | 4–6 h |
| Pequenos / utilitários | 0,3 h |
| **Total estimado** | **~43–70 h** |

---

## Observações

- As horas são **estimativas** por complexidade do pedido e tipo de resposta (análise, plano, implementação). Os transcripts não têm duração real.
- Pedidos repetidos (ex.: “de push em tudo”) foram agrupados.
- Para considerar **só o seu tempo**: se algum item foi feito por colega no mesmo Cursor, risque ou anote; o total acima é do projeto inteiro.
- Canva: você informou ~3–4 h; está contabilizado como 3,5–4,5 h (incluindo os prompts das 3 imagens).
