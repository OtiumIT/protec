# Avaliação: Módulo IRPF Alta Renda (Lei 15.270/2025)

**Enfoque:** Analista de IA (técnico) + Especialista contábil/tributário  
**Objetivo:** Avaliar o que foi implementado em termos de correção técnica, aderência à lei e limites para uso profissional.

---

## 1. Visão do analista de IA (aspectos técnicos)

### 1.1 Pontos fortes

- **Arquitetura alinhada ao monorepo:** Módulo segue o padrão do projeto (shared → API → portal), com schemas Zod em `@shared/core`, repository/service/routes na API, service + página no portal. Isolamento por tenant e feature toggle respeitados.
- **Regras de cálculo isoladas:** O motor em `calculations.ts` é puro (funções que recebem dados e retornam resultado), o que facilita testes unitários e manutenção.
- **Validação de entrada:** Todos os inputs são validados com Zod nos endpoints; tipos monetários com `nonnegative` e `multipleOf(0.01)`; ano e UUIDs validados.
- **Documentação:** README do módulo e `docs/regras_tributacao.md` descrevem regras e endpoints; referência legal (Art. 2º e 5º) presente.
- **Segurança e multitenancy:** Queries na tabela tenant sem `company_id` (isolamento por schema); módulo exigido via `requireModule('IRPF_ALTA_RENDA')`; sem vazamento de dados entre tenants.

### 1.2 Gaps ou riscos técnicos

- **Progressiva 600k–1,2M:** A lei fala em “até 10%” progressiva, mas não define a fórmula exata (tabela ou equação). Foi adotada **interpolação linear** (0% em 600k → 10% em 1,2M sobre a base toda). Se a Receita Federal publicar tabela ou fórmula diferente, o cálculo precisará ser ajustado.
- **Risco de retenção mensal:** O gatilho real é “pagamento no mês > R$ 50.000”. O sistema hoje **aproxima** pelo valor anual da fonte ÷ 12. Não há entrada por mês; portanto é um **indicador de risco**, não cálculo de retenção efetiva. Adequado para alerta, desde que a limitação esteja clara para o usuário.
- **CPF:** O schema exige `min(11).max(14)` (apenas dígitos ou mascarado), mas **não valida dígitos verificadores**. Para ambiente de produção, vale adicionar validação de CPF (algoritmo oficial) ou deixar explícito que é “informacional”.
- **Testes automatizados:** Não há testes unitários para `calculations.ts` nem testes de integração para os endpoints. Recomenda-se cobrir ao menos: BCC, faixas (limites exatos 600k e 1,2M) e cenário de risco de retenção.

### 1.3 Sugestões técnicas

- Incluir **memória de cálculo** mais rica na resposta (ex.: “excedente sobre R$ 600.000”, “alíquota efetiva”), para auditoria e conferência pelo contador.
- Considerar **versionamento da lei** (ex.: “Lei 15.270/2025 – vigência a partir de…”) na documentação e, se a lei for alterada, permitir parâmetros (limites/faixas) configuráveis ou versão do motor.

---

## 2. Visão do especialista contábil/tributário

### 2.1 Aderência à Lei 15.270/2025

- **Base de cálculo (Art. 2º):** A BCC implementada (RT + lucros/dividendos isentos, códigos 09 e 13) está **alinhada** ao texto da lei: rendimentos tributáveis na DAA + dividendos inclusive de Simples Nacional.
- **Exclusões:** A documentação deixa claro que aplicações financeiras, JCP e rendimentos de poupança/LCI/LCA **não** entram nessa base. O formulário não mistura esses tipos com 09/13 — **correto**.
- **Faixas:** Limites de R$ 600.000 (isento) e R$ 1.200.000 (até 10% progressiva; acima 10% fixo) estão **consistentes** com a tabela do documento de regras.
- **Antecipação (Art. 5º):** O conceito de retenção de 10% na fonte quando o pagamento no mês supera R$ 50.000 está **bem referenciado**. A implementação usa uma heurística (valor anual da fonte ÷ 12) apenas para **sinalizar risco**, o que é adequado para simulação, desde que o usuário saiba que não substitui a análise mês a mês.

### 2.2 Limitações para uso profissional

- **Caráter de simulação:** O sistema **não** calcula o IR devido na declaração anual completa (não considera deduções, dependentes, outras fontes, etc.). Ele calcula apenas o **impacto da base de alta renda** (tributação mínima sobre BCC). O contador deve usar como **ferramenta de planejamento e diagnóstico**, não como substituto do programa da Receita.
- **Progressiva:** A forma exata da progressividade (tabela ou fórmula) ainda pode ser regulamentada. A interpolação linear adotada é **razoável** para simulação, mas deve ser revisada quando houver normativa detalhada.
- **Retenção na fonte:** Quem retém é a fonte pagadora (empresa). O sistema não calcula valor a reter por mês nem gera informe; apenas indica **risco** quando uma fonte tem valor anual tal que a média mensal supera R$ 50.000.
- **Pro-labore vs. salário:** O RT agrupa “Pro-labore, Salários (PJ) e Aluguéis” em um único campo. Para o cálculo da BCC isso basta; para análise mais fina (ex.: retenção na fonte de pro-labore), seria necessário detalhamento por tipo de rendimento.

### 2.3 Sugestões contábeis

- **Aviso na tela:** Deixar explícito na interface que se trata de **simulação** com base na Lei 15.270/2025 e que o resultado não substitui a declaração de IR nem parecer jurídico-tributário.
- **Memória de cálculo:** Expor na UI (ou em relatório) como a BCC foi obtida (RT + lista de valores 09/13) e em qual faixa o contribuinte se enquadra, para o contador conferir com o IRPF do cliente.
- **Ano de referência:** O campo “ano da declaração” está coerente com o uso (ex.: ano-calendário da DAA). Manter alinhado a qualquer orientação da Receita sobre ano-base.
- **PDF/extração:** O plano prevê entrada por formulário e, futuramente, PDF. Quando houver extração automática, garantir que o **mapeamento** dos campos do IRPF (fichas de rendimentos, códigos 09 e 13) seja validado por um contador com declarações reais.

---

## 3. Conclusão conjunta

| Critério                    | Avaliação |
|----------------------------|-----------|
| Aderência à Lei 15.270/2025 | Adequada para simulação; BCC e faixas corretas no estado atual da lei. |
| Qualidade técnica           | Boa: arquitetura, validação, multitenancy e documentação consistentes. |
| Uso profissional            | Adequado como **ferramenta de apoio** (diagnóstico e planejamento), com avisos claros de que é simulação. |
| Riscos principais           | (1) Fórmula da faixa progressiva pode mudar com regulamentação; (2) risco de retenção é heurístico (anual/12); (3) falta de testes automatizados e validação de CPF. |

**Recomendações prioritárias**

1. Incluir na tela (e opcionalmente no relatório salvo) um **aviso** de que o resultado é simulação e não substitui a DAA nem assessoria jurídico-tributária.
2. Reforçar a **memória de cálculo** (BCC = RT + soma por fonte, faixa aplicada) na resposta e na UI.
3. Adicionar **testes unitários** para o motor de cálculo (casos nos limites 600k e 1,2M, e para risco de retenção).
4. Acompanhar **regulamentação** da Receita Federal (tabela ou fórmula da progressiva) e ajustar o motor se necessário.
5. Quando houver extração de PDF, validar o mapeamento dos campos do IRPF com um especialista contábil e declarações reais.

Com esses cuidados, o módulo está **apto para uso como simulador de apoio à decisão**, desde que o escritório deixe claro ao cliente o caráter informativo e não vinculante do resultado.
