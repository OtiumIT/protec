"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const password_1 = require("../../shared/utils/password");
const jwt_1 = require("../../shared/utils/jwt");
const logger_1 = require("../../shared/utils/logger");
const error_handler_1 = require("../../shared/utils/error-handler");
const DEFAULT_PLAN_NAME = 'Free';
class AuthService {
    authRepo;
    companyService;
    userRepo;
    subscriptionRepo;
    planRepo;
    constructor(authRepo, companyService, userRepo, subscriptionRepo, planRepo) {
        this.authRepo = authRepo;
        this.companyService = companyService;
        this.userRepo = userRepo;
        this.subscriptionRepo = subscriptionRepo;
        this.planRepo = planRepo;
    }
    /**
     * Cadastrar escritório de contabilidade (tenant) e usuário responsável (admin).
     * Cria: company (com schema tenant), assinatura no plano Free, primeiro usuário admin.
     */
    async register(data) {
        // Plano padrão para novos escritórios
        const freePlan = await this.planRepo.findByName(DEFAULT_PLAN_NAME);
        if (!freePlan) {
            throw new error_handler_1.AppError(`Plano padrão "${DEFAULT_PLAN_NAME}" não encontrado. Execute o seed do banco.`, 'DEFAULT_PLAN_NOT_FOUND', 500);
        }
        // Nome de exibição: nome fantasia ou razão social
        const name = (data.company.trade_name?.trim() || data.company.legal_name.trim()).slice(0, 255);
        const cnpjNormalized = data.company.cnpj.replace(/\D/g, '');
        // Criar tenant (empresa + schema tenant + migrations)
        const company = await this.companyService.create({
            name,
            legal_name: data.company.legal_name,
            trade_name: data.company.trade_name || undefined,
            cnpj: cnpjNormalized,
            phone: data.company.phone || undefined,
            contact_email: data.user.email,
            contact_name: data.user.name,
        });
        // Assinatura no plano Free para permitir uso e criação de usuários (7 dias de acesso)
        await this.subscriptionRepo.create(company.id, {
            planId: freePlan.id,
            freePlanStartedAt: new Date(),
        });
        // Hash da senha e criar usuário admin do tenant
        const passwordHash = await (0, password_1.hashPassword)(data.user.password);
        const user = await this.userRepo.create(company.id, {
            name: data.user.name,
            email: data.user.email,
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
        (0, logger_1.logSensitiveOperation)('user_registered', user.id, company.id, { email: user.email });
        return { user, company, tokens };
    }
    /**
     * Login
     */
    async login(email, password, companyId) {
        // Buscar usuário
        let user;
        // Primeiro tentar buscar super_admin (sem company_id)
        user = await this.authRepo.findByEmailOnly(email);
        // Se não encontrou super_admin e tem companyId, buscar por tenant
        if (!user && companyId) {
            user = await this.authRepo.findByEmail(email, companyId);
        }
        if (user && user.tenant_id === null) {
            // É super_admin, não precisa de companyId
        }
        else if (user && user.tenant_id) {
            companyId = user.tenant_id;
        }
        if (!user) {
            throw new Error('Invalid credentials');
        }
        const passwordHash = await this.authRepo.findPasswordHash(user.id, user.tenant_id);
        if (!passwordHash) {
            throw new Error('Invalid credentials');
        }
        const isValid = await (0, password_1.verifyPassword)(password, passwordHash);
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
        (0, logger_1.logSensitiveOperation)('user_logged_in', user.id, user.tenant_id || 'super_admin');
        return { user, tokens };
    }
    /**
     * Renovar access token usando refresh token
     */
    async refreshToken(token) {
        // Verificar refresh token no banco
        const refreshToken = await this.authRepo.findRefreshToken(token);
        if (!refreshToken) {
            throw new Error('Invalid refresh token');
        }
        // Verificar assinatura do token
        const payload = (0, jwt_1.verifyRefreshToken)(token);
        // Gerar novo access token
        const accessToken = (0, jwt_1.generateAccessToken)({
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
    async logout(token) {
        await this.authRepo.deleteRefreshToken(token);
    }
    /**
     * Validar token JWT
     */
    validateToken(token) {
        return (0, jwt_1.verifyRefreshToken)(token);
    }
    /**
     * Gerar tokens (access + refresh)
     */
    generateTokens(payload) {
        return {
            access: (0, jwt_1.generateAccessToken)(payload),
            refresh: (0, jwt_1.generateRefreshToken)(payload),
        };
    }
}
exports.AuthService = AuthService;
