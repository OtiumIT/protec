# Plano: Landing Page – Atualização (SPED/arquivos e sem "em breve")

Este documento atualiza o plano de landing page com:

1. **Não prometer nada como "em breve"** – Remover qualquer menção a recursos futuros; comunicar apenas o que está disponível hoje.
2. **Tratamento real de SPED, ECD e demais arquivos** – O que está implementado vs. o que não está.

---

## 1. Tratamento de arquivos fiscais (SPED, ECD, PGDAS, XML, PDF)

### O que está realmente implementado

- **Upload e armazenamento:** O sistema aceita arquivos com extensão **.txt**, **.xml** e **.pdf** (definido em `apps/api/src/shared/config/storage.config.ts`: `allowedExtensions: ['.txt', '.xml', '.pdf']`). O usuário escolhe o *tipo* no formulário: `sped`, `ecd`, `pgdas`, `xml`, `pdf`, `txt`, `outros`.
  - **SPED** e **ECD** (normalmente .txt) → aceitos para upload, armazenamento, listagem, download e status.
  - **PGDAS** e **XML** (.xml) → aceitos.
  - **PDF** (.pdf) → aceito.
- **Listagem e download:** Listagem por cliente, competência, status (uploaded, processing, processed, error); download via URL assinada.

### O que NÃO está disponível

- **Processamento (parsing/extração):** O app `apps/workers/src/main.py` é apenas um esqueleto ("TODO: Implementar lógica específica de processamento"); não existe worker que leia SPED/ECD e popule a tabela `extracted_fiscal_data`. A tela `FiscalFiles.tsx` informa ao usuário: "Esta funcionalidade será implementada quando os workers processarem os arquivos."
- **Na landing:** Não prometer processamento automático, leitura de balanço/DRE da ECD nem extração de dados dos arquivos.
- **Validador de Rating:** O fluxo "validar a partir de arquivo ECD processado" depende de dados em `extracted_fiscal_data`, que hoje não é populado. O que **está** disponível é a **simulação manual** (usuário preenche campos granulares). Na landing: descrever apenas simulação/validação com dados informados pelo usuário; não prometer "leitura automática da ECD".

### Copy sugerido para a landing (Arquivos fiscais)

"Upload e organização de arquivos fiscais por cliente e competência (SPED, ECD, PGDAS, XML, PDF). Armazene, liste e acesse seus arquivos em um só lugar."

Não mencionar extração automática nem processamento do conteúdo.

---

## 2. Regra: não prometer nada como "em breve"

- **Não incluir na landing** recursos que não existem para o assinante (Scanner de Editais, processos judiciais como produto, "Lucro Real vs Presumido" genérico). Esses recursos **não devem ser citados** na landing – nem como "em breve".
- **Copy e compliance (atualizado):** Não prometer: Scanner de Editais, simulador "Lucro Real vs Presumido" genérico, telas de processos judiciais, relatórios PDF de oportunidade que não existem, **processamento/extração automática de SPED/ECD**, ou **validação de rating a partir de arquivo ECD**. **Não usar "em breve"** para nenhum recurso; comunicar apenas o que está disponível hoje.

---

## 3. Resumo do que comunicar na landing (apenas o disponível)

| Recurso | O que está disponível | O que NÃO prometer |
|--------|------------------------|---------------------|
| **Arquivos fiscais** | Upload, armazenamento, listagem, download por cliente/competência. Formatos: .txt, .xml, .pdf (tipos SPED, ECD, PGDAS, XML, PDF). | Processamento automático, extração de dados, leitura de balanço/DRE da ECD. |
| **Validador de Rating** | Simulação com dados informados pelo usuário (campos granulares); indicadores e classificação Portaria 6.757/2022; confronto estimado x real. | Validação automática a partir de arquivo ECD. |
| **Simulador IN 2.306/2026** | Comparativo de cenários (2025, 2026, Equiparação Hospitalar). | — |
| **Gestão de clientes** | Cadastro por tenant. | — |
| **Dashboard e usuários** | Visão geral e gestão de equipe. | — |

O restante do plano original (estrutura da landing, Hero, Funcionalidades, Diferenciais, CTA, Footer, abordagem técnica, checklist) permanece válido, aplicando sempre: **só o que está disponível; nada de "em breve".**

---

## 4. Inspiração da landing de referência e barra do topo

### 4.1 Referência: [Ingrid Passos – Consultoria](https://ingridpassos.com.br/)

O cliente gostou dessa landing. Usar como inspiração **sem copiar**: layout limpo, estilo consultoria/profissional, barra superior com navegação clara. Manter sempre o **tema do sistema** (Protec/Otium).

### 4.2 O que aproveitar da referência (inspiração)

- **Barra superior (header):** Fixa ou estática no topo; logo à esquerda; navegação (links de âncora) ao centro ou à direita; **destaque para o login**.
- **Layout:** Limpo, com bom espaçamento; seções bem delimitadas; tom profissional (consultoria).
- **Não precisa ser muito parecido** – apenas direção de estilo (clareza, confiança, fácil de escanear).

### 4.3 Barra do topo (header) – obrigatório

- **Logo:** À esquerda (ex.: OtiumIT ou nome do produto), linkando para `/` (início da landing).
- **Navegação (opcional):** Links de âncora para seções da própria página (ex.: Funcionalidades, Contato ou Diferenciais), se fizer sentido.
- **Entrar (login):** Sempre visível na **barra do topo**, à direita – link para `/login`. Pode ser um botão secundário ou texto destacado (ex.: "Entrar") para quem já tem conta. Não esconder atrás de menu no desktop.
- **Registro:** Pode ficar ao lado de "Entrar" (ex.: botão "Começar" / "Criar conta" que leva a `/register`) ou apenas no Hero/CTA.
- **Comportamento:** Header com fundo sólido (ex.: branco ou slate-50) e borda sutil; em scroll, pode manter fixo para acesso rápido ao "Entrar".

### 4.4 Tema a manter (Protec)

- **Cores:** `brand` (#32CD32), `brand-dark`, `slate-50` / `slate-900` (já em [tailwind.config.js](apps/portal/tailwind.config.js) e [index.css](apps/portal/src/index.css)).
- **Tipografia:** Inter (já configurada).
- **Identidade:** Nome/logo do produto (OtiumIT ou Protec) e tom de “inteligência tributária para escritórios”, não de consórcio/imobiliário – apenas o **estilo** da referência (limpo, profissional, header com login).

### 4.5 Resumo da barra do topo

| Elemento        | Posição   | Ação                          |
|-----------------|-----------|-------------------------------|
| Logo            | Esquerda  | Link para `/`                 |
| Links âncora    | Centro   | Opcional (Funcionalidades, etc.) |
| **Entrar**      | **Direita** | Link para **`/login`**     |
| Começar/Registro | Direita | Opcional: botão para `/register` |

Com isso, a landing fica inspirada no que o cliente aprovou, mantendo o tema do sistema e com **Entrar** sempre acessível na barra do topo.
