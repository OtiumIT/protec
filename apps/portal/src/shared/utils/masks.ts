/**
 * Utilitários de máscara para formulários (CNPJ, CPF, Telefone).
 * Cópia local para evitar problemas de resolução do @shared/core no Vite.
 */

/** Remove caracteres não numéricos da string */
export function parseDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** Aplica máscara de exibição para CNPJ: 00.000.000/0000-00 */
export function formatCnpj(value: string): string {
  const d = parseDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}

/** Aplica máscara de exibição para CPF: 000.000.000-00 */
export function formatCpf(value: string): string {
  const d = parseDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

/** Aplica máscara de exibição para telefone BR: (00) 00000-0000 ou (00) 0000-0000 */
export function formatPhoneBR(value: string): string {
  const digits = parseDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
