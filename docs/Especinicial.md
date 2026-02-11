Especificação Técnica: Sistema de Inteligência Tributária (MVP)
1. Visão Geral
Sistema focado em identificar janelas de oportunidade tributária através do processamento automatizado de arquivos fiscais (SPED, ECD, PGDAS). O objetivo é substituir análises manuais por diagnósticos instantâneos de Enquadramento Tributário e Rating de Recuperabilidade (PGFN).

2. Arquitetura de Módulos
2.1. Módulo Administrativo (Multi-Tenant)
Gestão de Contabilidades: Cadastro do escritório proprietário (Logo, Razão Social, CNPJ).

Gestão de Usuários e Níveis de Acesso:

Admin: Gestão total e configuração de regras de negócio.

Operador (Contador/Advogado): Realiza uploads e gera diagnósticos.

Visualizador (Cliente Final): Acesso limitado para visualizar dashboards de sua própria empresa.

2.2. Gestão de Clientes
Cadastro de Empresa:

Dados básicos (CNPJ, CNAE, Inscrições Estaduais/Municipais).

Configuração de Regime Atual (Simples Nacional, Lucro Presumido, Lucro Real).

Repositório de Documentos:

Upload de arquivos organizados por competência (Mês/Ano).

Suporte a formatos: .txt (SPED/ECD), .xml (PGDAS/Notas) e .pdf (Extratos).

2.3. Repositório de Editais (Motor de Regras)
Cadastro de Critérios de Edital:

Input de parâmetros baseados em editais vigentes da PGFN/Receita Federal.

Variáveis: Tempo de inscrição em dívida ativa, faixas de desconto, prazos de parcelamento e restrições por CNAE.

Vínculo Legislativo: O sistema utiliza essas regras para cruzar com o passivo do cliente.

3. Funcionalidades de Inteligência (Core)
3.1. Validador de Rating PGFN (Capag)
Processamento: Leitura automática dos blocos de Balanço e DRE dentro da ECD (Escrituração Contábil Digital).

Cálculo: Aplicação das fórmulas de Liquidez Corrente, Liquidez Geral e Solvência (Portaria PGFN nº 6.757/2022).

Diagnóstico: Confronto entre o Rating Estimado pelo Governo vs. Rating Real extraído da contabilidade, identificando erros de classificação para fins de desconto em transações.

3.2. Simulador de Enquadramento Tributário
Processamento: Análise de faturamento e margem de lucro via SPED Contribuições e PGDAS.

Ação: Projeção comparativa entre o regime atual e as alternativas (ex: Comparar Lucro Presumido vs. Lucro Real).

Resultado: Cálculo do "Custo de Oportunidade" (Quanto a empresa economizaria se mudasse de regime).

4. Entregáveis e Saídas
4.1. Dashboard de Oportunidades
Painel visual com "faróis" de alerta (Verde: Oportunidade Identificada | Vermelho: Risco Fiscal).

Resumo do passivo tributário filtrado pelos critérios dos editais cadastrados.

4.2. Gerador de Relatório de Oportunidade (PDF)
Documento gerado automaticamente com a logomarca da contabilidade/advocacia.

Conteúdo:

Diagnóstico do Rating atual.

Memória de cálculo do reenquadramento.

Sugestão de tese ou transação tributária aplicável.

Valor estimado de economia para o cliente.

5. Fluxo de Operação (UX)
Carga: Usuário realiza upload do arquivo SPED/ECD.

Extração: O sistema realiza o parsing dos dados (sem digitação manual).

Análise: O motor de regras cruza os dados com os Editais vigentes.

Entrega: O sistema gera o diagnóstico de Rating e Enquadramento.

Ação: O advogado/contador exporta o PDF e apresenta ao cliente final.