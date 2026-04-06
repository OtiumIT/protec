import { useCallback, useRef } from 'react';

type PrintOptions = {
  /** Callback executado antes de mover o wrapper para o body (ex.: setar data-attributes). */
  beforePrint?: (wrapper: HTMLElement) => void;
  /** Callback executado após a impressão e restauração do wrapper. */
  afterPrint?: () => void;
};

/**
 * Hook que encapsula o fluxo de impressão institucional:
 * 1. Move o wrapper para document.body (para isolar do layout da app)
 * 2. Chama window.print()
 * 3. Restaura o wrapper na posição original após a impressão
 */
export function useReportPrint(wrapperId: string) {
  const printingRef = useRef(false);

  const print = useCallback(
    (opts?: PrintOptions) => {
      if (printingRef.current) return;
      const wrapper = document.getElementById(wrapperId);
      if (!wrapper) return;

      printingRef.current = true;
      opts?.beforePrint?.(wrapper);

      const parent = wrapper.parentElement;
      const placeholder = document.createElement('div');
      placeholder.id = `${wrapperId}-placeholder`;

      if (parent) {
        parent.insertBefore(placeholder, wrapper);
        document.body.appendChild(wrapper);
        wrapper.setAttribute('data-print-moved', 'true');
      }

      const cleanup = () => {
        wrapper.removeAttribute('data-print-moved');
        if (parent && placeholder.parentElement && wrapper.parentElement === document.body) {
          document.body.removeChild(wrapper);
          parent.replaceChild(wrapper, placeholder);
        }
        window.removeEventListener('afterprint', cleanup);
        printingRef.current = false;
        opts?.afterPrint?.();
      };

      window.addEventListener('afterprint', cleanup);
      setTimeout(() => window.print(), 150);
    },
    [wrapperId],
  );

  return { print };
}
