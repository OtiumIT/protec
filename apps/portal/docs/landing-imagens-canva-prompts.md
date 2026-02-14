# Imagens da landing – lista e prompts para Canva

Lista das imagens que precisam ser criadas para a landing page e prompts prontos para usar no Canva (Magic Design / Gerar imagem com IA ou ferramenta equivalente).

---

## 1. Ilustração do Hero (lado direito) – **obrigatória**

**Onde usa:** Lado direito da seção Hero, ao lado do título e dos CTAs. Na referência é uma ilustração 3D abstrata (dashboard/gráficos) em tons azul e roxo.

**Dimensões sugeridas:** 800 x 600 px ou 1000 x 800 px (proporção ~4:3). PNG com fundo transparente para encaixar no hero escuro.

**Prompt em português (referência):**  
Ilustração 3D abstrata de dashboard e análise de dados: gráficos, tabelas e elementos flutuantes em tons de azul e roxo, estilo moderno e minimalista, sem texto, fundo transparente, para uso em hero de site escuro.

**Prompt para Canva (inglês – copiar e colar):**
```
Abstract 3D illustration of a data analytics dashboard: floating charts, graphs, and geometric shapes in blue and purple tones, modern minimalist style, no text, transparent background, for dark hero section of a website, isometric or soft 3D look.
```

**Variação (mais “dashboard”):**
```
3D isometric dashboard illustration with charts, bar graphs, and data visualization elements in shades of blue and indigo, soft shadows, clean design, transparent background, no text, suitable for fintech or B2B SaaS landing page hero.
```

---

## 2. Fundo do Hero (opcional)

**Onde usa:** Como imagem de fundo da seção Hero (em vez de cor sólida), para dar leve textura ou gradiente.

**Dimensões sugeridas:** 1920 x 1080 px (full HD). Pode ser JPG ou PNG.

**Prompt em português (referência):**  
Fundo escuro em azul escuro com gradiente sutil e formas geométricas leves, sem texto, para hero de site corporativo.

**Prompt para Canva (inglês):**
```
Dark blue gradient background with subtle geometric shapes or soft mesh gradient, navy and slate tones, minimal, no text, for corporate website hero section, 1920x1080.
```

---

## 3. Ícones dos módulos (opcional)

**Onde usa:** Se quiser substituir os ícones SVG atuais na seção “Como Funciona – Módulos” por imagens. Hoje são: Validador de Rating (escudo), Simulador IN 2.306 (calculadora/documento), Escritórios/Editais (balança ou similar).

**Dimensões sugeridas:** 128 x 128 px ou 256 x 256 px cada. PNG com fundo transparente.

**3.1 – Validador de Rating (escudo / verificação)**  
**Prompt:**  
```
Simple flat icon of a shield with checkmark, indigo or blue color, minimal line style, transparent background, 256x256, for web.
```

**3.2 – Simulador (calculadora / documento)**  
**Prompt:**  
```
Minimal flat icon of calculator or document with numbers, indigo blue, clean line style, transparent background, 256x256, for web.
```

**3.3 – Editais / Escritórios (balança da justiça ou lupa)**  
**Prompt:**  
```
Simple flat icon of balance scale or magnifying glass on document, indigo blue, minimal line style, transparent background, 256x256, for web.
```

---

## 4. Seção de depoimentos (opcional)

**Onde usa:** Se for implementada a seção “O que dizem quem usa” (prova social). Pode usar apenas iniciais no lugar de foto; se quiser avatar genérico:

**Dimensões sugeridas:** 80 x 80 px ou 120 x 120 px. Quadrado, PNG.

**Prompt para avatar neutro:**  
```
Professional circular avatar placeholder, neutral grey or blue silhouette of person, minimal, no face details, for testimonial section, 120x120, transparent or white background.
```

---

## Resumo

| # | Imagem              | Obrigatória | Arquivo sugerido     | Uso na landing                    |
|---|---------------------|------------|----------------------|-----------------------------------|
| 1 | Ilustração Hero     | Sim        | `hero-illustration.png` | Lado direito do Hero              |
| 2 | Fundo Hero          | Não        | `hero-bg.png`        | Background da seção Hero          |
| 3 | Ícones 3 módulos    | Não        | `icon-rating.png`, `icon-simulador.png`, `icon-editais.png` | Seção Como Funciona – Módulos |
| 4 | Avatar depoimento   | Não        | `avatar-placeholder.png` | Seção de depoimentos (se houver)  |

**Onde colocar os arquivos no projeto:**  
`apps/portal/public/` (ex.: `hero-illustration.png`, `hero-bg.png`). O código da landing deve referenciar por `/hero-illustration.png`, etc.

Depois de gerar no Canva, exporte em PNG (com transparência quando indicado) e use os nomes da tabela para facilitar a integração no código.
