import { UserRepository, CreateUserData, UpdateUserData } from './user.repository';
import { SubscriptionService } from '../subscriptions/subscription.service';
import { hashPassword } from '../../shared/utils/password';
import { logSensitiveOperation } from '../../shared/utils/logger';
import { AppError } from '../../shared/utils/error-handler';
import type { User } from '@shared/core';
import { normalizeUserEmail } from '@shared/core';

export class UserService {
  constructor(
    private userRepo: UserRepository,
    private subscriptionService: SubscriptionService
  ) {}

  /**
   * Criar usuário com validação de seats
   */
  async create(companyId: string, data: CreateUserData): Promise<User> {
    const emailNorm = normalizeUserEmail(data.email);

    // Verificar limite de seats
    const subscription = await this.subscriptionService.getByCompany(companyId);
    if (!subscription) {
      throw new AppError('No active subscription found', 'SUBSCRIPTION_NOT_FOUND', 402);
    }

    const currentUsers = await this.userRepo.countByCompany(companyId);
    if (currentUsers >= subscription.plan.max_users) {
      throw new AppError('User limit reached', 'USER_LIMIT_REACHED', 409);
    }

    // Verificar se email já existe no tenant atual
    const existingUser = await this.userRepo.findByEmail(emailNorm, companyId);
    if (existingUser) {
      const statusInfo = existingUser.status === 'inactive' ? ' (usuário inativo)' : '';
      throw new AppError(
        `Email já existe neste tenant${statusInfo}. Verifique a lista de usuários, incluindo usuários inativos.`,
        'EMAIL_ALREADY_EXISTS',
        409
      );
    }

    const existingElsewhere = await this.userRepo.findByEmailGlobal(emailNorm);
    if (existingElsewhere) {
      throw new AppError(
        existingElsewhere.tenant_id === null
          ? 'Este e-mail já está em uso pela conta de administrador da plataforma e não pode ser reutilizado.'
          : 'Este e-mail já está cadastrado em outro escritório.',
        'EMAIL_ALREADY_EXISTS',
        409
      );
    }

    // Hash da senha
    const passwordHash = await hashPassword(data.password);

    // Criar usuário
    const user = await this.userRepo.create(companyId, {
      ...data,
      email: emailNorm,
      password: passwordHash,
    });

    // Garantir que o status seja 'active'
    if (!user.status || user.status !== 'active') {
      console.warn(`[UserService.create] Usuário criado com status inesperado: ${user.status || 'undefined'}, forçando 'active'`);
      user.status = 'active';
    }

    // Log da operação
    logSensitiveOperation('user_created', user.id, companyId, {
      email: user.email,
      role: user.role,
      status: user.status,
    });

    return user;
  }

  /**
   * Atualizar usuário com validação de permissões
   */
  async update(
    id: string,
    companyId: string,
    data: UpdateUserData,
    currentUser: User
  ): Promise<User> {
    // Verificar se usuário existe e pertence ao tenant
    const user = await this.userRepo.findById(id, companyId);
    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    // Validar permissões: apenas admin pode editar outros usuários
    if (id !== currentUser.id && currentUser.role !== 'admin') {
      throw new AppError('Insufficient permissions', 'FORBIDDEN', 403);
    }

    // Não permitir alterar role para super_admin
    if (data.role === 'super_admin' && currentUser.role !== 'super_admin') {
      throw new AppError('Cannot set role to super_admin', 'FORBIDDEN', 403);
    }

    if (data.email !== undefined) {
      const emailNorm = normalizeUserEmail(data.email);
      const conflict = await this.userRepo.findByEmailGlobalExcluding(emailNorm, id);
      if (conflict) {
        throw new AppError(
          'Este e-mail já está cadastrado por outro utilizador.',
          'EMAIL_ALREADY_EXISTS',
          409
        );
      }
      data = { ...data, email: emailNorm };
    }

    // Atualizar
    const updatedUser = await this.userRepo.update(id, companyId, data);

    // Log da operação
    logSensitiveOperation('user_updated', id, companyId, {
      updated_by: currentUser.id,
      changes: data,
    });

    return updatedUser;
  }

  /**
   * Deletar usuário
   */
  async delete(id: string, companyId: string, currentUser: User): Promise<void> {
    // Verificar se usuário existe
    const user = await this.userRepo.findById(id, companyId);
    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }

    // Não pode deletar a si mesmo
    if (id === currentUser.id) {
      throw new AppError('Cannot delete yourself', 'FORBIDDEN', 403);
    }

    // Apenas admin pode deletar
    if (currentUser.role !== 'admin') {
      throw new AppError('Insufficient permissions', 'FORBIDDEN', 403);
    }

    // Deletar
    await this.userRepo.delete(id, companyId);

    // Log da operação
    logSensitiveOperation('user_deleted', id, companyId, {
      deleted_by: currentUser.id,
      deleted_user_email: user.email,
    });
  }

  /**
   * Listar usuários com paginação
   */
  async list(
    companyId: string,
    options: { page?: number; limit?: number; role?: string } = {}
  ): Promise<{ users: User[]; total: number; page: number; limit: number }> {
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
  async getById(id: string, companyId: string): Promise<User> {
    const user = await this.userRepo.findById(id, companyId);
    if (!user) {
      throw new AppError('User not found', 'USER_NOT_FOUND', 404);
    }
    return user;
  }

  /**
   * Criar super_admin (sem company_id)
   */
  async createSuperAdmin(data: CreateUserData): Promise<User> {
    const emailNorm = normalizeUserEmail(data.email);
    const existingUser = await this.userRepo.findByEmailGlobal(emailNorm);
    if (existingUser) {
      throw new AppError('Este e-mail já está cadastrado.', 'EMAIL_ALREADY_EXISTS', 409);
    }

    // Hash da senha
    const passwordHash = await hashPassword(data.password);

    // Criar super_admin
    const user = await this.userRepo.createSuperAdmin({
      ...data,
      email: emailNorm,
      password: passwordHash,
    });

    // Log da operação
    logSensitiveOperation('super_admin_created', user.id, null, {
      email: user.email,
    });

    return user;
  }

  /**
   * Listar todos os super_admins
   */
  async listSuperAdmins(): Promise<User[]> {
    return this.userRepo.findSuperAdmins();
  }
}
