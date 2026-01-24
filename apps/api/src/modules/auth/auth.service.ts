import { AuthRepository } from './auth.repository';
import { CompanyRepository } from '../companies/company.repository';
import { UserRepository } from '../users/user.repository';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JWTPayload } from '../../shared/utils/jwt';
import { logSensitiveOperation } from '../../shared/utils/logger';
import type { User, Company } from '@shared/core';
import type { RegisterSchema, LoginSchema } from '@shared/core';

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface RegisterData {
  company: {
    name: string;
    domain?: string;
  };
  user: {
    name: string;
    email: string;
    password: string;
  };
}

export interface LoginData {
  email: string;
  password: string;
}

export class AuthService {
  constructor(
    private authRepo: AuthRepository,
    private companyRepo: CompanyRepository,
    private userRepo: UserRepository
  ) {}

  /**
   * Registrar empresa e primeiro usuário
   */
  async register(data: RegisterData): Promise<{ user: User; company: Company; tokens: AuthTokens }> {
    // Criar empresa
    const company = await this.companyRepo.create({
      name: data.company.name,
      domain: data.company.domain,
    });

    // Hash da senha
    const passwordHash = await hashPassword(data.user.password);

    // Criar primeiro usuário como admin
    const user = await this.userRepo.create(company.id, {
      name: data.user.name,
      email: data.user.email,
      password: passwordHash,
      role: 'admin',
    });

    // Gerar tokens
    const tokens = this.generateTokens({
      userId: user.id,
      companyId: company.id,
      email: user.email,
      role: user.role,
    });

    // Armazenar refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
    await this.authRepo.createRefreshToken(user.id, tokens.refresh, expiresAt);

    // Log da operação
    logSensitiveOperation('user_registered', user.id, company.id, {
      email: user.email,
    });

    return { user, company, tokens };
  }

  /**
   * Login
   */
  async login(email: string, password: string, companyId?: string): Promise<{ user: User; tokens: AuthTokens }> {
    // Buscar usuário
    let user: User | null;
    if (companyId) {
      user = await this.authRepo.findByEmail(email, companyId);
    } else {
      // Se não tiver companyId, buscar por email e depois identificar tenant
      user = await this.authRepo.findByEmailOnly(email);
      if (user) {
        companyId = user.company_id;
      }
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verificar senha
    const passwordHash = await this.authRepo.findPasswordHash(user.id, user.company_id);
    if (!passwordHash) {
      throw new Error('Invalid credentials');
    }

    const isValid = await verifyPassword(password, passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Gerar tokens
    const tokens = this.generateTokens({
      userId: user.id,
      companyId: user.company_id,
      email: user.email,
      role: user.role,
    });

    // Armazenar refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
    await this.authRepo.createRefreshToken(user.id, tokens.refresh, expiresAt);

    // Log da operação
    logSensitiveOperation('user_logged_in', user.id, user.company_id);

    return { user, tokens };
  }

  /**
   * Renovar access token usando refresh token
   */
  async refreshToken(token: string): Promise<{ accessToken: string }> {
    // Verificar refresh token no banco
    const refreshToken = await this.authRepo.findRefreshToken(token);
    if (!refreshToken) {
      throw new Error('Invalid refresh token');
    }

    // Verificar assinatura do token
    const payload = verifyRefreshToken(token);

    // Gerar novo access token
    const accessToken = generateAccessToken({
      userId: payload.userId,
      companyId: payload.companyId,
      email: payload.email,
      role: payload.role,
    });

    return { accessToken };
  }

  /**
   * Logout - invalidar refresh token
   */
  async logout(token: string): Promise<void> {
    await this.authRepo.deleteRefreshToken(token);
  }

  /**
   * Validar token JWT
   */
  validateToken(token: string): JWTPayload {
    return verifyRefreshToken(token);
  }

  /**
   * Gerar tokens (access + refresh)
   */
  private generateTokens(payload: JWTPayload): AuthTokens {
    return {
      access: generateAccessToken(payload),
      refresh: generateRefreshToken(payload),
    };
  }
}
