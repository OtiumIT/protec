import { AuthRepository } from './auth.repository';
import { CompanyService } from '../companies/company.service';
import { UserRepository } from '../users/user.repository';
import { SubscriptionRepository } from '../subscriptions/subscription.repository';
import { PlanRepository } from '../plans/plan.repository';
import { FeatureToggleService } from '../feature-toggles/feature-toggle.service';
import { FeatureToggleRepository } from '../feature-toggles/feature-toggle.repository';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, JWTPayload } from '../../shared/utils/jwt';
import { logSensitiveOperation } from '../../shared/utils/logger';
import { AppError } from '../../shared/utils/error-handler';
import { emailService } from '../../shared/services/email.service';
import type { User, Company } from '@shared/core';
import { normalizeUserEmail } from '@shared/core';
import { randomBytes } from 'crypto';

export interface AuthTokens {
  access: string;
  refresh: string;
}

/** Dados para cadastro de escritório (tenant) + usuário responsável - suporta PF e PJ */
export interface RegisterData {
  company: {
    person_type: 'pf' | 'pj';
    legal_name: string;
    trade_name?: string;
    cnpj?: string;
    cpf?: string;
    phone?: string;
  };
  user: {
    name: string;
    email: string;
    password: string;
  };
  source?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

const DEFAULT_PLAN_NAME = 'Free';

export class AuthService {
  constructor(
    private authRepo: AuthRepository,
    private companyService: CompanyService,
    private userRepo: UserRepository,
    private subscriptionRepo: SubscriptionRepository,
    private planRepo: PlanRepository,
    private featureToggleService: FeatureToggleService
  ) {}

  /**
   * Cadastrar escritório de contabilidade (tenant) e usuário responsável (admin).
   * Cria: company (com schema tenant), assinatura no plano Free, primeiro usuário admin.
   */
  async register(data: RegisterData): Promise<{ user: User; company: Company; tokens: AuthTokens }> {
    // Plano padrão para novos escritórios
    const freePlan = await this.planRepo.findByName(DEFAULT_PLAN_NAME);
    if (!freePlan) {
      throw new AppError(
        `Plano padrão "${DEFAULT_PLAN_NAME}" não encontrado. Execute o seed do banco.`,
        'DEFAULT_PLAN_NOT_FOUND',
        500
      );
    }

    const emailNorm = normalizeUserEmail(data.user.email);
    const emailAlreadyUsed = await this.userRepo.findByEmailGlobal(emailNorm);
    if (emailAlreadyUsed) {
      throw new AppError(
        'Este e-mail já está cadastrado. Use outro e-mail ou faça login.',
        'EMAIL_ALREADY_EXISTS',
        409
      );
    }

    // Nome de exibição: nome fantasia ou razão social/nome completo
    const name = (data.company.trade_name?.trim() || data.company.legal_name.trim()).slice(0, 255);
    const cnpjNormalized = data.company.cnpj ? data.company.cnpj.replace(/\D/g, '') : undefined;
    const cpfNormalized = data.company.cpf ? data.company.cpf.replace(/\D/g, '') : undefined;

    // Criar tenant (empresa + schema tenant + migrations)
    const company = await this.companyService.create({
      name,
      person_type: data.company.person_type,
      legal_name: data.company.legal_name,
      trade_name: data.company.trade_name || undefined,
      cnpj: cnpjNormalized,
      cpf: cpfNormalized,
      phone: data.company.phone || undefined,
      contact_email: emailNorm,
      contact_name: data.user.name,
      source: data.source || undefined,
    });

    // Assinatura no plano Free para permitir uso e criação de usuários (7 dias de acesso)
    await this.subscriptionRepo.create(company.id, {
      planId: freePlan.id,
      freePlanStartedAt: new Date(),
    });

    // Ativação de módulos: landing pages parceiras recebem apenas módulos específicos
    if (data.source === 'EPS') {
      const featureToggleRepo = new FeatureToggleRepository();
      const gestaoImoveisModule = await featureToggleRepo.findByKey('GESTAO_IMOVEIS');
      if (gestaoImoveisModule) {
        await featureToggleRepo.activateForTenant(company.id, gestaoImoveisModule.id);
      }
    } else {
      await this.featureToggleService.activatePlanModulesForTenant(company.id, freePlan.id);
    }

    // Hash da senha e criar usuário admin do tenant
    const passwordHash = await hashPassword(data.user.password);
    const user = await this.userRepo.create(company.id, {
      name: data.user.name,
      email: emailNorm,
      password: passwordHash,
      role: 'admin',
    });

    const tokens = this.generateTokens({
      userId: user.id,
      companyId: company.id,
      email: user.email,
      role: user.role,
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.authRepo.createRefreshToken(user.id, tokens.refresh, expiresAt);

    logSensitiveOperation('user_registered', user.id, company.id, { email: user.email });

    return { user, company, tokens };
  }

  /**
   * Login
   */
  async login(email: string, password: string, companyId?: string): Promise<{ user: User; tokens: AuthTokens }> {
    const emailNorm = normalizeUserEmail(email);
    // Buscar usuário
    let user: User | null;
    
    // Primeiro tentar buscar super_admin (sem company_id)
    user = await this.authRepo.findByEmailOnly(emailNorm);
    
    // Se não encontrou super_admin e tem companyId, buscar por tenant
    if (!user && companyId) {
      user = await this.authRepo.findByEmail(emailNorm, companyId);
    }
    
    if (user && user.tenant_id === null) {
      // É super_admin, não precisa de companyId
    } else if (user && user.tenant_id) {
      companyId = user.tenant_id;
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.status === 'inactive') {
      throw new AppError('Sua conta está inativa. Entre em contato com o suporte.', 'ACCOUNT_INACTIVE', 403);
    }

    const passwordHash = await this.authRepo.findPasswordHash(user.id, user.tenant_id);
    if (!passwordHash) {
      throw new Error('Invalid credentials');
    }

    const isValid = await verifyPassword(password, passwordHash);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Gerar tokens (companyId pode ser null para super_admin)
    const tokens = this.generateTokens({
      userId: user.id,
      companyId: user.tenant_id || null,
      email: user.email,
      role: user.role,
    });

    // Armazenar refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias
    await this.authRepo.createRefreshToken(user.id, tokens.refresh, expiresAt);

    // Log da operação
    logSensitiveOperation('user_logged_in', user.id, user.tenant_id || 'super_admin');

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

  // ──────────────────────────────────────────────────────────────
  // Recuperação de senha
  // ──────────────────────────────────────────────────────────────

  /**
   * Solicitar recuperação de senha.
   * Sempre retorna sucesso para não revelar se o e-mail existe (prevenção de enumeração).
   */
  async forgotPassword(email: string): Promise<void> {
    const emailNorm = normalizeUserEmail(email);
    const user = await this.authRepo.findByEmailOnly(emailNorm);

    if (!user) {
      // Resposta silenciosa — não vazar se o e-mail existe
      return;
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.authRepo.createPasswordResetToken(user.id, token, expiresAt);

    await emailService.sendPasswordReset(user.email, token);

    logSensitiveOperation('password_reset_requested', user.id, user.tenant_id ?? 'super_admin');
  }

  /**
   * Trocar senha (autenticado). Usado no primeiro login com must_change_password.
   */
  async changePassword(userId: string, tenantId: string | null, currentPassword: string, newPassword: string): Promise<void> {
    const passwordHash = await this.authRepo.findPasswordHash(userId, tenantId);
    if (!passwordHash) {
      throw new AppError('Usuário não encontrado', 'NOT_FOUND', 404);
    }

    const isValid = await verifyPassword(currentPassword, passwordHash);
    if (!isValid) {
      throw new AppError('Senha atual incorreta', 'INVALID_PASSWORD', 400);
    }

    const newHash = await hashPassword(newPassword);
    await this.authRepo.updatePasswordHash(userId, newHash);

    await this.authRepo.clearMustChangePassword(userId);

    logSensitiveOperation('password_changed', userId, tenantId ?? 'system');
  }

  /**
   * Redefinir senha usando token de recuperação.
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const resetToken = await this.authRepo.findPasswordResetToken(token);

    if (!resetToken) {
      throw new AppError(
        'Token inválido ou expirado. Solicite um novo link de recuperação.',
        'INVALID_OR_EXPIRED_TOKEN',
        400
      );
    }

    const passwordHash = await hashPassword(newPassword);

    await this.authRepo.updatePasswordHash(resetToken.user_id, passwordHash);
    await this.authRepo.markTokenAsUsed(token);

    logSensitiveOperation('password_reset_completed', resetToken.user_id, 'system');
  }
}
