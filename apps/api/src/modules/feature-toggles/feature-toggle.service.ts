import { FeatureToggleRepository } from './feature-toggle.repository';
import type { Module, TenantModule } from '@shared/core';

export class FeatureToggleService {
  constructor(private repo: FeatureToggleRepository) {}

  /**
   * Verificar se módulo está ativo para tenant
   * Método estático para uso em middlewares e outros serviços
   */
  static async verify(companyId: string, moduleKey: string): Promise<boolean> {
    const repo = new FeatureToggleRepository();
    return repo.isActive(companyId, moduleKey);
  }

  /**
   * Listar módulos disponíveis
   */
  async listAvailable(): Promise<Module[]> {
    return this.repo.findAll();
  }

  /**
   * Listar módulos ativos do tenant
   */
  async listActive(companyId: string): Promise<(Module & { enabled_until?: Date })[]> {
    return this.repo.findActiveByTenant(companyId);
  }

  /**
   * Ativar módulo para tenant
   */
  async activate(
    companyId: string,
    moduleId: string,
    enabledUntil?: Date
  ): Promise<TenantModule> {
    // Verificar se módulo existe
    const module = await this.repo.findById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    return this.repo.activateForTenant(companyId, moduleId, enabledUntil);
  }

  /**
   * Desativar módulo para tenant
   */
  async deactivate(companyId: string, moduleId: string): Promise<void> {
    // Verificar se módulo existe
    const module = await this.repo.findById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    await this.repo.deactivateForTenant(companyId, moduleId);
  }

  /**
   * Buscar módulos associados a um plano
   */
  async getModulesByPlan(planId: string): Promise<(Module & { is_default: boolean })[]> {
    return this.repo.findModulesByPlan(planId);
  }

  /**
   * Associar módulo a um plano
   */
  async addModuleToPlan(planId: string, moduleId: string, isDefault: boolean = true): Promise<void> {
    // Verificar se módulo existe
    const module = await this.repo.findById(moduleId);
    if (!module) {
      throw new Error('Module not found');
    }

    await this.repo.addModuleToPlan(planId, moduleId, isDefault);
  }

  /**
   * Remover módulo de um plano
   */
  async removeModuleFromPlan(planId: string, moduleId: string): Promise<void> {
    await this.repo.removeModuleFromPlan(planId, moduleId);
  }

  /**
   * Ativar módulos padrão de um plano para um tenant
   */
  async activatePlanModulesForTenant(tenantId: string, planId: string): Promise<void> {
    await this.repo.activatePlanModulesForTenant(tenantId, planId);
  }
}
