import { useLayoutEffect, useRef } from 'react';

/** Container de scroll da área logada (Layout). Cai no `window` se não existir. */
export function scrollPrivateTop(behavior: ScrollBehavior = 'auto') {
  const el = document.querySelector('[data-private-scroll-container="true"]');
  if (el instanceof HTMLElement) {
    el.scrollTo({ top: 0, left: 0, behavior });
    return;
  }
  window.scrollTo({ top: 0, left: 0, behavior });
}

/**
 * Quando `key` muda (ex.: etapa do wizard), sobe o container no mesmo frame
 * da troca de conteúdo — antes do paint, sem flash nem scroll atrasado.
 */
export function useScrollOnChange(key: unknown) {
  const isFirst = useRef(true);
  useLayoutEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    scrollPrivateTop('auto');
  }, [key]);
}
