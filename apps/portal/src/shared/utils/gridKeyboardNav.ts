import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

const ARROW_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/** Permite mover o cursor dentro do texto antes de saltar para outra célula. */
export function shouldLetCaretMoveInInput(el: HTMLElement, key: string): boolean {
  if (el.tagName !== 'INPUT') return false;
  const input = el as HTMLInputElement;
  if (input.type === 'checkbox' || input.type === 'hidden' || input.type === 'radio') return false;
  if (key !== 'ArrowLeft' && key !== 'ArrowRight') return false;
  const t = input.type;
  if (t !== 'text' && t !== 'search' && t !== 'tel' && t !== 'url' && t !== '' && t !== 'number') return false;
  const start = input.selectionStart ?? 0;
  const end = input.selectionEnd ?? 0;
  const len = input.value.length;
  if (key === 'ArrowLeft' && start > 0) return true;
  if (key === 'ArrowRight' && end < len) return true;
  return false;
}

function collectRowFocusables(tr: HTMLTableRowElement): (HTMLInputElement | HTMLSelectElement)[] {
  return Array.from(
    tr.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      'input:not([type="checkbox"]):not([type="hidden"]):not([type="radio"]), select'
    )
  ).filter((el) => !el.disabled && el.offsetParent !== null);
}

export function focusNeighborInTableGrid(table: HTMLTableElement, active: HTMLElement, key: string): boolean {
  if (!ARROW_KEYS.has(key)) return false;
  const tbody = table.tBodies[0];
  if (!tbody) return false;
  const rows = Array.from(tbody.querySelectorAll<HTMLTableRowElement>('tr'));
  const matrix = rows.map((tr) => collectRowFocusables(tr));
  let r = -1;
  let c = -1;
  for (let i = 0; i < matrix.length; i++) {
    const j = matrix[i].indexOf(active as HTMLInputElement);
    if (j >= 0) {
      r = i;
      c = j;
      break;
    }
  }
  if (r < 0 || c < 0) return false;

  let nr = r;
  let nc = c;
  if (key === 'ArrowLeft') {
    if (c > 0) {
      nc = c - 1;
    } else if (r > 0) {
      let nn = r - 1;
      while (nn >= 0 && matrix[nn].length === 0) nn -= 1;
      if (nn < 0) return false;
      nr = nn;
      nc = matrix[nr].length - 1;
    } else {
      return false;
    }
  } else if (key === 'ArrowRight') {
    if (c < matrix[r].length - 1) {
      nc = c + 1;
    } else if (r < matrix.length - 1) {
      let nn = r + 1;
      while (nn < matrix.length && matrix[nn].length === 0) nn += 1;
      if (nn >= matrix.length) return false;
      nr = nn;
      nc = 0;
    } else {
      return false;
    }
  } else if (key === 'ArrowUp') {
    let nn = r - 1;
    while (nn >= 0 && matrix[nn].length === 0) nn -= 1;
    if (nn < 0) return false;
    nr = nn;
    nc = Math.min(c, Math.max(0, matrix[nr].length - 1));
  } else if (key === 'ArrowDown') {
    let nn = r + 1;
    while (nn < matrix.length && matrix[nn].length === 0) nn += 1;
    if (nn >= matrix.length) return false;
    nr = nn;
    nc = Math.min(c, Math.max(0, matrix[nr].length - 1));
  }

  const next = matrix[nr]?.[nc];
  if (!next) return false;
  next.focus();
  if (next.tagName === 'INPUT' && (next as HTMLInputElement).type === 'text') {
    (next as HTMLInputElement).select?.();
  }
  return true;
}

/** use em `onKeyDownCapture` no wrapper da tabela (planilha). */
export function spreadsheetTableNavCapture(e: ReactKeyboardEvent): void {
  if (!ARROW_KEYS.has(e.key)) return;
  const t = e.target as HTMLElement;
  if (t.tagName !== 'INPUT' && t.tagName !== 'SELECT') return;
  if (shouldLetCaretMoveInInput(t, e.key)) return;
  const table = t.closest('table');
  if (!table) return;
  if (focusNeighborInTableGrid(table as HTMLTableElement, t, e.key)) {
    e.preventDefault();
    e.stopPropagation();
  }
}
