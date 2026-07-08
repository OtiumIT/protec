/**
 * Cloudflare Pages middleware: injeta meta tags Open Graph/Twitter por rota.
 *
 * O portal é um SPA (todas as rotas caem em index.html). Crawlers de redes
 * sociais (WhatsApp, Facebook, Telegram, Twitter/X) não executam JS, então as
 * meta tags precisam vir no HTML do servidor. O index.html traz um baseline
 * genérico (marcado com data-og); aqui, em rotas específicas, removemos o
 * baseline e injetamos as tags daquela página.
 *
 * IMPORTANTE: esta pasta fica na RAIZ do repositório porque o projeto Pages
 * usa "Root directory" em branco (raiz do repo) e output apps/portal/dist.
 * Ver docs/CLOUDFLARE_PAGES.md.
 */

const SITE = 'https://iataxsistemas.com.br';

/** Mapa de rotas com preview próprio (chave em minúsculas, sem barra final). */
const ROUTES = {
  '/pabloarruda': {
    title: 'Acesso exclusivo ao IATax — Alunos do Prof. Pablo Arruda',
    description:
      'Ative seu acesso exclusivo ao IATax. Ambiente restrito aos alunos do Prof. Pablo Arruda: automatize rotinas de planejamento e escale sua atuação com tecnologia tributária.',
    image: `${SITE}/og-pabloarruda.jpg`,
    imageAlt: 'IATax — Acesso exclusivo para alunos do Prof. Pablo Arruda',
  },
};

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildHead(url, og) {
  const title = escapeHtml(og.title);
  const description = escapeHtml(og.description);
  const image = escapeHtml(og.image);
  const imageAlt = escapeHtml(og.imageAlt || og.title);
  const canonical = escapeHtml(url);

  return [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="IATax">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:secure_url" content="${image}">`,
    `<meta property="og:image:type" content="image/jpeg">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${imageAlt}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
  ].join('\n    ');
}

class RemoveElement {
  element(el) {
    el.remove();
  }
}

class HeadAppender {
  constructor(html) {
    this.html = html;
  }
  element(el) {
    el.append(this.html, { html: true });
  }
}

export async function onRequest(context) {
  const response = await context.next();

  try {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    const url = new URL(context.request.url);
    const key = url.pathname.toLowerCase().replace(/\/+$/, '') || '/';
    const og = ROUTES[key];

    // Rotas sem preview próprio mantêm o baseline estático do index.html.
    if (!og) return response;

    const canonical = `${SITE}${url.pathname}`;
    const headHtml = buildHead(canonical, og);

    return new HTMLRewriter()
      .on('[data-og]', new RemoveElement())
      .on('head', new HeadAppender(headHtml))
      .transform(response);
  } catch (err) {
    // Nunca quebrar a página por causa das meta tags.
    return response;
  }
}
