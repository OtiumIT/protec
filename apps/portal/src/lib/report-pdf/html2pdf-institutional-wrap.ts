import { BRAND, formatDatePtBr } from './ReportPrintChrome';

export type Html2PdfInstitutionalWrapOptions = {
  reportTitle: string;
  metaLine?: string;
};

/**
 * Envolve o clone do corpo do relatório com o mesmo bloco institucional do modal de pré-visualização
 * (logo + título + meta + marca no topo; marca + data no rodapé), para o PDF html2pdf espelhar o preview.
 */
export function wrapHtml2PdfInstitutionalClone(
  bodyClone: HTMLElement,
  opts: Html2PdfInstitutionalWrapOptions
): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'report-html2pdf-root space-y-4';

  const header = document.createElement('header');
  header.className = 'flex items-center gap-3 border-b border-slate-200 pb-3 mb-4';
  const img = document.createElement('img');
  img.src = '/logo-iatax.png';
  img.alt = '';
  img.className = 'h-9 w-9 object-contain';
  img.setAttribute('aria-hidden', 'true');
  const headCol = document.createElement('div');
  headCol.className = 'flex-1 min-w-0';
  const h2 = document.createElement('h2');
  h2.className = 'text-base font-bold text-slate-900';
  h2.textContent = opts.reportTitle;
  headCol.appendChild(h2);
  if (opts.metaLine) {
    const p = document.createElement('p');
    p.className = 'text-xs text-slate-600';
    p.textContent = opts.metaLine;
    headCol.appendChild(p);
  }
  const brandTop = document.createElement('p');
  brandTop.className = 'text-[10px] text-slate-500';
  brandTop.textContent = BRAND;
  headCol.appendChild(brandTop);
  header.appendChild(img);
  header.appendChild(headCol);

  const footer = document.createElement('footer');
  footer.className =
    'flex items-center justify-between pt-3 mt-4 border-t border-slate-200 text-[10px] text-slate-500';
  const spanBrand = document.createElement('span');
  spanBrand.textContent = BRAND;
  const spanDate = document.createElement('span');
  spanDate.textContent = formatDatePtBr();
  footer.appendChild(spanBrand);
  footer.appendChild(spanDate);

  wrap.appendChild(header);
  wrap.appendChild(bodyClone);
  wrap.appendChild(footer);
  return wrap;
}
