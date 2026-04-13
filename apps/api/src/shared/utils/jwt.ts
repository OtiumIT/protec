import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
// Padrões: access longo para menos churn; refresh longo define “ficar logado” até precisar logar de novo
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '48h';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'your-refresh-secret-key';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

/** Mesmo formato que `jwt.sign` em `expiresIn` (ex.: 30d, 24h, 3600 como segundos). */
function expiresInToMs(expiresIn: string): number {
  const s = expiresIn.trim();
  if (/^\d+$/.test(s)) {
    return parseInt(s, 10) * 1000;
  }
  const m = /^(\d+)(s|m|h|d|w|y)$/i.exec(s);
  if (!m) {
    throw new Error(`Invalid expiresIn format: ${expiresIn}`);
  }
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase() as 's' | 'm' | 'h' | 'd' | 'w' | 'y';
  const multSec: Record<'s' | 'm' | 'h' | 'd' | 'w' | 'y', number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
    w: 604800,
    y: 31536000,
  };
  return n * multSec[unit] * 1000;
}

/** Data de expiração do refresh no banco, alinhada ao JWT de refresh. */
export function getRefreshTokenExpiresAt(): Date {
  return new Date(Date.now() + expiresInToMs(REFRESH_TOKEN_EXPIRES_IN));
}

export interface JWTPayload {
  userId: string;
  companyId: string | null; // null para super_admin
  email: string;
  role: string;
}

/**
 * Gerar Access Token (JWT)
 */
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Gerar Refresh Token
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verificar e decodificar Access Token
 */
export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Verificar e decodificar Refresh Token
 */
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Decodificar token sem verificar (útil para debug)
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
