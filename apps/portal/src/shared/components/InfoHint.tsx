import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type InfoHintProps = {
  text: string;
  className?: string;
};

/**
 * Ícone ⓘ com explicação no clique (e teclado).
 * Usa portal + position:fixed para não ser cortado por overflow de tabelas.
 */
export function InfoHint({ text, className = '' }: InfoHintProps) {
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);

  const updatePos = () => {
    const el = btnRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelW = 288;
    const margin = 8;
    let left = rect.left;
    if (left + panelW > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - panelW - margin);
    }
    let top = rect.bottom + 6;
    let above = false;
    if (top + 160 > window.innerHeight) {
      top = Math.max(margin, rect.top - 6);
      above = true;
    }
    setPos({ top, left, above });
  };

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onScrollOrResize = () => updatePos();
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-sky-300/80 bg-sky-50 text-sky-600 text-[9px] font-semibold cursor-pointer select-none hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${className}`}
        aria-label="Mais informações"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⓘ
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            id={id}
            role="tooltip"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              transform: pos.above ? 'translateY(-100%)' : undefined,
              zIndex: 9999,
            }}
            className="w-72 max-w-[calc(100vw-1rem)] rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-700 shadow-lg"
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
}
