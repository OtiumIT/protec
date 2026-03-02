"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const password_1 = require("../../shared/utils/password");
const logger_1 = require("../../shared/utils/logger");
const error_handler_1 = require("../../shared/utils/error-handler");
class UserService {
    userRepo;
    subscriptionService;
    constructor(userRepo, subscriptionService) {
        this.userRepo = userRepo;
        this.subscriptionService = subscriptionService;
    }
    /**
     * Criar usuário com validação de seats
     */
    async create(companyId, data) {
        // Verificar limite de seats
        const subscription = await this.subscriptionService.getByCompany(companyId);
        if (!subscription) {
            throw new error_handler_1.AppError('No active subscription found', 'SUBSCRIPTION_NOT_FOUND', 402);
        }
        const currentUsers = await this.userRepo.countByCompany(companyId);
        if (currentUsers >= subscription.plan.max_users) {
            throw new error_handler_1.AppError('User limit reached', 'USER_LIMIT_REACHED', 409);
        }
        // Verificar se email já existe no tenant atual
        const existingUser = await this.userRepo.findByEmail(data.email, companyId);
        if (existingUser) {
            const statusInfo = existingUser.status === 'inactive' ? ' (usuário inativo)' : '';
            throw new error_handler_1.AppError(`Email já existe neste tenant${statusInfo}. Verifique a lista de usuários, incluindo usuários inativos.`, 'EMAIL_ALREADY_EXISTS', 409);
        }
        // Verificar se email existe como super_admin (não pode ser usado em tenants)
        const existingSuperAdmin = await this.userRepo.findByEmailGlobal(data.email);
        if (existingSuperAdmin && existingSuperAdmin.tenant_id === null) {
            throw new error_handler_1.AppError('Email já existe como super admin e não pode ser usado em tenants', 'EMAIL_ALREADY_EXISTS', 409);
        }
        // Debug: verificar se email existe em outros tenants (apenas para log)
        const allUsersWithEmail = await this.userRepo.findAllByEmail(data.email);
        if (allUsersWithEmail.length > 0) {
            console.log(`[UserService.create] Email ${data.email} encontrado em outros tenants:`, allUsersWithEmail.map(u => ({ id: u.id, tenant_id: u.tenant_id, role: u.role, status: u.status })));
        }
        // Hash da senha
        const passwordHash = await (0, password_1.hashPassword)(data.password);
        // Criar usuário
        const user = await this.userRepo.create(companyId, {
            ...data,
            password: passwordHash,
        });
        // Garantir que o status seja 'active'
        if (!user.status || user.status !== 'active') {
            console.warn(`[UserService.create] Usuário criado com status inesperado: ${user.status || 'undefined'}, forçando 'active'`);
            user.status = 'active';
        }
        // Log da operação
        (0, logger_1.logSensitiveOperation)('user_created', user.id, companyId, {
            email: user.email,
            role: user.role,
            status: user.status,
        });
        console.log(`[UserService.create] Usuário criado com sucesso: ${user.email}, status: ${user.status}, tenant_id: ${companyId}`);
        return user;
    }
    /**
     * Atualizar usuário com validação de permissões
     */
    async update(id, companyId, data, currentUser) {
        // Verificar se usuário existe e pertence ao tenant
        const user = await this.userRepo.findById(id, companyId);
        if (!user) {
            throw new error_handler_1.AppError('User not found', 'USER_NOT_FOUND', 404);
        }
        // Validar permissões: apenas admin pode editar outros usuários
        if (id !== currentUser.id && currentUser.role !== 'admin') {
            throw new error_handler_1.AppError('Insufficient permissions', 'FORBIDDEN', 403);
        }
        // Não permitir alterar role para super_admin
        if (data.role === 'super_admin' && currentUser.role !== 'super_admin') {
            throw new error_handler_1.AppError('Cannot set role to super_admin', 'FORBIDDEN', 403);
        }
        // Atualizar
        const updatedUser = await this.userRepo.update(id, companyId, data);
        // Log da operação
        (0, logger_1.logSensitiveOperation)('user_updated', id, companyId, {
            updated_by: currentUser.id,
            changes: data,
        });
        return updatedUser;
    }
    /**
     * Deletar usuário
     */
    async delete(id, companyId, currentUser) {
        // Verificar se usuário existe
        const user = await this.userRepo.findById(id, companyId);
        if (!user) {
            throw new error_handler_1.AppError('User not found', 'USER_NOT_FOUND', 404);
        }
        // Não pode deletar a si mesmo
        if (id === currentUser.id) {
            throw new error_handler_1.AppError('Cannot delete yourself', 'FORBIDDEN', 403);
        }
        // Apenas admin pode deletar
        if (currentUser.role !== 'admin') {
            throw new error_handler_1.AppError('Insufficient permissions', 'FORBIDDEN', 403);
        }
        // Deletar
        await this.userRepo.delete(id, companyId);
        // Log da operação
        (0, logger_1.logSensitiveOperation)('user_deleted', id, companyId, {
            deleted_by: currentUser.id,
            deleted_user_email: user.email,
        });
    }
    /**
     * Listar usuários com paginação
     */
    async list(companyId, options = {}) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const result = await this.userRepo.findByCompany(companyId, {
            page,
            limit,
            role: options.role,
        });
        return {
            users: result.users,
            total: result.total,
            page,
            limit,
        };
    }
    /**
     * Buscar usuário por ID
     */
    async getById(id, companyId) {
        const user = await this.userRepo.findById(id, companyId);
        if (!user) {
            throw new error_handler_1.AppError('User not found', 'USER_NOT_FOUND', 404);
        }
        return user;
    }
    /**
     * Criar super_admin (sem company_id)
     */
    async createSuperAdmin(data) {
        // Verificar se email já existe (globalmente, sem company_id)
        const existingUser = await this.userRepo.findByEmailGlobal(data.email);
        if (existingUser) {
            throw new error_handler_1.AppError('Email already exists', 'EMAIL_ALREADY_EXISTS', 409);
        }
        // Hash da senha
        const passwordHash = await (0, password_1.hashPassword)(data.password);
        // Criar super_admin
        const user = await this.userRepo.createSuperAdmin({
            ...data,
            password: passwordHash,
        });
        // Log da operação
        (0, logger_1.logSensitiveOperation)('super_admin_created', user.id, null, {
            email: user.email,
        });
        return user;
    }
    /**
     * Listar todos os super_admins
     */
    async listSuperAdmins() {
        return this.userRepo.findSuperAdmins();
    }
}
exports.UserService = UserService;
