import { BaseRepository } from '../../shared/repositories/base.repository';
import { query } from '../../db/client';
import type { Module, TenantModule } from '@shared/core';

export class FeatureToggleRepository extends BaseRepository {
  /**
   * Buscar todos os módulos disponíveis
   */
  async findAll(): Promise<Module[]> {
    const result = await query<Module>(
      'SELECT id, name, key, description, created_at FROM modules ORDER BY name',
      [],
      false // modules não requerem filtro de tenant
    );
    return result.rows;
  }

  /**
   * Buscar módulo por key
   */
  async findByKey(key: string): Promise<Module | null> {
    const result = await query<Module>(
      'SELECT id, name, key, description, created_at FROM modules WHERE key = $1',
      [key],
      false
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar módulo por ID
   */
  async findById(id: string): Promise<Module | null> {
    const result = await query<Module>(
      'SELECT id, name, key, description, created_at FROM modules WHERE id = $1',
      [id],
      false
    );
    return result.rows[0] || null;
  }

  /**
   * Buscar módulos ativos por tenant
   */
  async findActiveByTenant(tenantId: string): Promise<(Module & { enabled_until?: Date })[]> {
    const result = await query<Module & { enabled_until?: Date }>(
      `SELECT m.id, m.name, m.key, m.description, m.created_at, tm.enabled_until
       FROM modules m
       INNER JOIN tenant_modules tm ON tm.module_id = m.id
       WHERE tm.tenant_id = $1 
       AND (tm.enabled_until IS NULL OR tm.enabled_until > NOW())
       ORDER BY m.name`,
      [tenantId],
      false // tenant_modules já filtra por tenant_id
    );
    return result.rows;
  }

  /**
   * Verificar se módulo está ativo para tenant
   */
  async isActive(tenantId: string, moduleKey: string): Promise<boolean> {
    const result = await query<{ id: string }>(
      `SELECT tm.id 
       FROM tenant_modules tm
       JOIN modules m ON m.id = tm.module_id
       WHERE tm.tenant_id = $1 AND m.key = $2 
       AND (tm.enabled_until IS NULL OR tm.enabled_until > NOW())`,
      [tenantId, moduleKey],
      false
    );
    return result.rows.length > 0;
  }

  /**
   * Ativar módulo para tenant
   */
  async activateForTenant(
    tenantId: string,
    moduleId: string,
    enabledUntil?: Date
  ): Promise<TenantModule> {
    // Usar UPSERT para atualizar se já existir
    const result = await query<TenantModule>(
      `INSERT INTO tenant_modules (tenant_id, module_id, enabled_until)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, module_id) 
       DO UPDATE SET enabled_until = $3, updated_at = NOW()
       RETURNING id, tenant_id, module_id, enabled_until, created_at`,
      [tenantId, moduleId, enabledUntil || null],
      false
    );
    return result.rows[0];
  }

  /**
   * Desativar módulo para tenant
   */
  async deactivateForTenant(tenantId: string, moduleId: string): Promise<void> {
    await query(
      'DELETE FROM tenant_modules WHERE tenant_id = $1 AND module_id = $2',
      [tenantId, moduleId],
      false
    );
  }
}
