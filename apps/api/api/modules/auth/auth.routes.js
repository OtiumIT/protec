"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const hono_1 = require("hono");
const zod_validator_1 = require("@hono/zod-validator");
const auth_service_1 = require("./auth.service");
const auth_repository_1 = require("./auth.repository");
const company_repository_1 = require("../companies/company.repository");
const company_service_1 = require("../companies/company.service");
const user_repository_1 = require("../users/user.repository");
const subscription_repository_1 = require("../subscriptions/subscription.repository");
const plan_repository_1 = require("../plans/plan.repository");
const auth_middleware_1 = require("../../middleware/auth.middleware");
const core_1 = require("@shared/core");
const error_handler_1 = require("../../shared/utils/error-handler");
const authRoutes = new hono_1.Hono();
exports.authRoutes = authRoutes;
const authRepo = new auth_repository_1.AuthRepository();
const companyRepo = new company_repository_1.CompanyRepository();
const companyService = new company_service_1.CompanyService(companyRepo);
const userRepo = new user_repository_1.UserRepository();
const subscriptionRepo = new subscription_repository_1.SubscriptionRepository();
const planRepo = new plan_repository_1.PlanRepository();
const authService = new auth_service_1.AuthService(authRepo, companyService, userRepo, subscriptionRepo, planRepo);
/**
 * POST /auth/register
 * Registrar empresa e primeiro usuário
 */
authRoutes.post('/register', (0, zod_validator_1.zValidator)('json', core_1.RegisterSchema), async (c) => {
    try {
        const data = c.req.valid('json');
        const result = await authService.register(data);
        return c.json({
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                    role: result.user.role,
                    tenant_id: result.user.tenant_id,
                },
                company: result.company,
                tokens: result.tokens,
            },
        }, 201);
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /auth/login
 * Login de usuário
 */
authRoutes.post('/login', (0, zod_validator_1.zValidator)('json', core_1.LoginSchema), async (c) => {
    try {
        const { email, password } = c.req.valid('json');
        // Tentar identificar tenant do header (opcional no login)
        const companyId = c.req.header('X-Tenant-ID');
        const result = await authService.login(email, password, companyId);
        return c.json({
            data: {
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    name: result.user.name,
                    role: result.user.role,
                    tenant_id: result.user.tenant_id,
                },
                tokens: result.tokens,
            },
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'Invalid credentials') {
            return c.json({
                error: {
                    message: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS',
                },
            }, 401);
        }
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /auth/refresh
 * Renovar access token
 */
authRoutes.post('/refresh', (0, zod_validator_1.zValidator)('json', core_1.RefreshTokenSchema), async (c) => {
    try {
        const { token } = c.req.valid('json');
        const result = await authService.refreshToken(token);
        return c.json({
            data: {
                accessToken: result.accessToken,
            },
        });
    }
    catch (error) {
        if (error instanceof Error && error.message.includes('Invalid refresh token')) {
            return c.json({
                error: {
                    message: 'Invalid or expired refresh token',
                    code: 'INVALID_REFRESH_TOKEN',
                },
            }, 401);
        }
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * POST /auth/logout
 * Logout - invalidar refresh token
 */
authRoutes.post('/logout', auth_middleware_1.authMiddleware, (0, zod_validator_1.zValidator)('json', core_1.LogoutSchema), async (c) => {
    try {
        const { token } = c.req.valid('json');
        await authService.logout(token);
        return c.json({
            data: {
                success: true,
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
/**
 * GET /auth/me
 * Obter dados do usuário atual
 */
authRoutes.get('/me', auth_middleware_1.authMiddleware, async (c) => {
    try {
        const user = c.get('user');
        return c.json({
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    tenant_id: user.tenant_id,
                },
            },
        });
    }
    catch (error) {
        return (0, error_handler_1.errorHandler)(error, c);
    }
});
