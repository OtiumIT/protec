import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Hash de senha usando BCrypt
 * NUNCA armazene senhas em plain text
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verificar senha
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
