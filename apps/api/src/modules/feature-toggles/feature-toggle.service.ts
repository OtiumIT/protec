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
}
