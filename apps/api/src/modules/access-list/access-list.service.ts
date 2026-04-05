import { AccessListRepository } from './access-list.repository';
import { CompanyService } from '../companies/company.service';
import { CompanyRepository } from '../companies/company.repository';
import { UserRepository } from '../users/user.repository';
import { AuthRepository } from '../auth/auth.repository';
import { hashPassword } from '../../shared/utils/password';
import { encryptTempPassword, decryptTempPassword, generateReadablePassword } from '../../shared/utils/crypto';
import { emailService } from '../../shared/services/email.service';
import { logSensitiveOperation } from '../../shared/utils/logger';
import { AppError } from '../../shared/utils/error-handler';
import { normalizeUserEmail } from '@shared/core';
import { query } from '../../db/client';
import type { AccessListEntry } from '@shared/core';

const GESTAO_IMOVEIS_KEY = 'GESTAO_IMOVEIS';

interface ImportRow {
  nome: string;
  email: string;
  telefone?: string;
  cpf?: string;
  empresa?: string;
}

interface ImportResult {
  imported: number;
  duplicates: number;
  errors: Array<{ row: number; email: string; reason: string }>;
}

interface ActivationResult {
  id: string;
  email: string;
  success: boolean;
  error?: string;
}

export class AccessListService {
  private repo: AccessListRepository;
  private companyService: CompanyService;
  private userRepo: UserRepository;
  private authRepo: AuthRepository;

  constructor() {
    this.repo = new AccessListRepository();
    const companyRepo = new CompanyRepository();
    this.companyService = new CompanyService(companyRepo);
    this.userRepo = new UserRepository();
    this.authRepo = new AuthRepository();
  }

  async importCsv(rows: ImportRow[], adminUserId: string): Promise<ImportResult> {
    const result: ImportResult = { imported: 0, duplicates: 0, errors: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const email = normalizeUserEmail(row.email);
      const cpf = row.cpf ? row.cpf.replace(/\D/g, '') : undefined;

      try {
        const existing = await this.repo.findByEmail(email);
        if (existing) {
          result.duplicates++;
          continue;
        }

        await this.repo.create({
          name: row.nome.trim(),
          email,
          phone: row.telefone?.trim(),
          cpf,
          company_name: row.empresa?.trim(),
        });

        result.imported++;
      } catch (error: any) {
        if (error?.code === '23505') {
          result.duplicates++;
        } else {
          result.errors.push({
            row: i + 1,
            email: row.email,
            reason: error instanceof Error ? error.message : 'Erro desconhecido',
          });
        }
      }
    }

    logSensitiveOperation('access_list_import', adminUserId, null, {
      imported: result.imported,
      duplicates: result.duplicates,
      errors: result.errors.length,
    });

    return result;
  }

  async list(filters: { status?: string; search?: string; page?: number; limit?: number }) {
    return this.repo.findAll({
      status: filters.status as any,
      search: filters.search,
      page: filters.page,
      limit: filters.limit,
    });
  }

  async getStats() {
    return this.repo.getStats();
  }

  async activate(ids: string[], adminUserId: string): Promise<ActivationResult[]> {
    const results: ActivationResult[] = [];

    for (const id of ids) {
      const entry = await this.repo.findById(id);
      if (!entry) {
        results.push({ id, email: '', success: false, error: 'Registro não encontrado' });
        continue;
      }

      if (entry.status === 'active') {
        results.push({ id, email: entry.email, success: false, error: 'Já está ativo' });
        continue;
      }

      try {
        if (entry.status === 'inactive' && entry.user_id && entry.tenant_id) {
          await this.reactivateExisting(entry, adminUserId);
          results.push({ id, email: entry.email, success: true });
          continue;
        }

        await this.activateNew(entry, adminUserId);
        results.push({ id, email: entry.email, success: true });
      } catch (error: any) {
        results.push({
          id,
          email: entry.email,
          success: false,
          error: error instanceof Error ? error.message : 'Erro na ativação',
        });
      }
    }

    return results;
  }

  private async activateNew(entry: AccessListEntry, adminUserId: string): Promise<void> {
    const email = normalizeUserEmail(entry.email);

    const existingUser = await this.userRepo.findByEmailGlobal(email);
    if (existingUser) {
      throw new AppError('E-mail já cadastrado como usuário no sistema', 'EMAIL_ALREADY_EXISTS', 409);
    }

    const companyName = entry.company_name || `${entry.name} - Calc. Imobiliário`;
    const company = await this.companyService.create({
      name: companyName,
      person_type: entry.cpf ? 'pf' : 'pj',
      legal_name: companyName,
      cpf: entry.cpf || undefined,
      contact_email: email,
      contact_name: entry.name,
      phone: entry.phone || undefined,
    });

    await this.activateModuleForTenant(company.id);

    const tempPassword = generateReadablePassword();
    const passwordHash = await hashPassword(tempPassword);

    const user = await this.userRepo.create(company.id, {
      name: entry.name,
      email,
      password: passwordHash,
      role: 'admin',
    });

    await query(
      'UPDATE public.users SET must_change_password = TRUE WHERE id = $1 AND tenant_id = $2',
      [user.id, company.id]
    );

    const tempPasswordEnc = encryptTempPassword(tempPassword);
    await this.repo.activate(entry.id, user.id, company.id, tempPasswordEnc);

    try {
      await emailService.sendAccessWelcome(email, entry.name, email, tempPassword);
    } catch (emailError) {
      console.error(`[AccessListService] Falha ao enviar e-mail para ${email}:`, emailError);
    }

    logSensitiveOperation('access_list_activated', adminUserId, company.id, {
      accessListId: entry.id,
      userId: user.id,
      email,
    });
  }

  private async reactivateExisting(entry: AccessListEntry, adminUserId: string): Promise<void> {
    if (!entry.user_id || !entry.tenant_id) return;

    await query(
      `UPDATE public.users SET status = 'active', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [entry.user_id, entry.tenant_id]
    );

    await this.repo.reactivate(entry.id);

    logSensitiveOperation('access_list_reactivated', adminUserId, entry.tenant_id, {
      accessListId: entry.id,
      userId: entry.user_id,
    });
  }

  private async activateModuleForTenant(companyId: string): Promise<void> {
    const moduleResult = await query<{ id: string }>(
      `SELECT id FROM modules WHERE key = $1`,
      [GESTAO_IMOVEIS_KEY]
    );

    if (moduleResult.rows.length === 0) {
      throw new AppError(`Módulo ${GESTAO_IMOVEIS_KEY} não encontrado`, 'MODULE_NOT_FOUND', 500);
    }

    const moduleId = moduleResult.rows[0].id;

    await query(
      `INSERT INTO tenant_modules (tenant_id, module_id, enabled_until)
       VALUES ($1, $2, NULL)
       ON CONFLICT (tenant_id, module_id) DO NOTHING`,
      [companyId, moduleId]
    );
  }

  async deactivate(ids: string[], adminUserId: string): Promise<ActivationResult[]> {
    const results: ActivationResult[] = [];

    for (const id of ids) {
      const entry = await this.repo.findById(id);
      if (!entry) {
        results.push({ id, email: '', success: false, error: 'Registro não encontrado' });
        continue;
      }

      if (entry.status !== 'active') {
        results.push({ id, email: entry.email, success: false, error: 'Não está ativo' });
        continue;
      }

      try {
        if (entry.user_id) {
          await query(
            `UPDATE public.users SET status = 'inactive', updated_at = NOW()
             WHERE id = $1 AND tenant_id = $2`,
            [entry.user_id, entry.tenant_id]
          );

          await this.authRepo.deleteRefreshTokensByUser(entry.user_id);
        }

        await this.repo.deactivate(entry.id);
        results.push({ id, email: entry.email, success: true });

        logSensitiveOperation('access_list_deactivated', adminUserId, entry.tenant_id || null, {
          accessListId: entry.id,
          userId: entry.user_id,
        });
      } catch (error: any) {
        results.push({
          id,
          email: entry.email,
          success: false,
          error: error instanceof Error ? error.message : 'Erro na desativação',
        });
      }
    }

    return results;
  }

  async getCredentials(id: string): Promise<{ email: string; tempPassword: string; loginUrl: string; name: string }> {
    const entry = await this.repo.findById(id);
    if (!entry) {
      throw new AppError('Registro não encontrado', 'NOT_FOUND', 404);
    }

    if (entry.status !== 'active') {
      throw new AppError('Acesso não está ativo', 'NOT_ACTIVE', 400);
    }

    const encryptedPassword = await this.repo.getTempPasswordEnc(id);
    if (!encryptedPassword) {
      throw new AppError('Senha provisória não disponível. O usuário já alterou a senha.', 'PASSWORD_ALREADY_CHANGED', 400);
    }

    const tempPassword = decryptTempPassword(encryptedPassword);

    return {
      email: entry.email,
      tempPassword,
      loginUrl: 'https://iataxsistemas.com.br/login',
      name: entry.name,
    };
  }

  async regeneratePassword(id: string, adminUserId: string): Promise<{ tempPassword: string }> {
    const entry = await this.repo.findById(id);
    if (!entry) {
      throw new AppError('Registro não encontrado', 'NOT_FOUND', 404);
    }

    if (entry.status !== 'active' || !entry.user_id) {
      throw new AppError('Acesso não está ativo', 'NOT_ACTIVE', 400);
    }

    const tempPassword = generateReadablePassword();
    const passwordHash = await hashPassword(tempPassword);

    await this.authRepo.updatePasswordHash(entry.user_id, passwordHash);

    await query(
      'UPDATE public.users SET must_change_password = TRUE, updated_at = NOW() WHERE id = $1',
      [entry.user_id]
    );

    const tempPasswordEnc = encryptTempPassword(tempPassword);
    await this.repo.updateTempPassword(id, tempPasswordEnc);

    await this.authRepo.deleteRefreshTokensByUser(entry.user_id);

    logSensitiveOperation('access_list_password_regenerated', adminUserId, entry.tenant_id || null, {
      accessListId: id,
      userId: entry.user_id,
    });

    return { tempPassword };
  }

  async deleteEntry(id: string): Promise<void> {
    const deleted = await this.repo.deletePending(id);
    if (!deleted) {
      throw new AppError('Só é possível remover registros pendentes', 'CANNOT_DELETE', 400);
    }
  }
}
