/** Normaliza e-mail para armazenamento e comparação (login único). */
export function normalizeUserEmail(email: string): string {
  return email.trim().toLowerCase();
}
