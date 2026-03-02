import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Module, TenantModule } from '@shared/core';
export declare class FeatureToggleRepository extends BaseRepository {
    /**
     * Buscar todos os módulos disponíveis
     */
    findAll(): Promise<Module[]>;
    /**
     * Buscar módulo por key
     */
    findByKey(key: string): Promise<Module | null>;
    /**
     * Buscar módulo por ID
     */
    findById(id: string): Promise<Module | null>;
    /**
     * Buscar módulos ativos por tenant
     */
    findActiveByTenant(tenantId: string): Promise<(Module & {
        enabled_until?: Date;
    })[]>;
    /**
     * Verificar se módulo está ativo para tenant
     */
    isActive(tenantId: string, moduleKey: string): Promise<boolean>;
    /**
     * Ativar módulo para tenant
     */
    activateForTenant(tenantId: string, moduleId: string, enabledUntil?: Date): Promise<TenantModule>;
    /**
     * Desativar módulo para tenant
     */
    deactivateForTenant(tenantId: string, moduleId: string): Promise<void>;
    /**
     * Buscar módulos associados a um plano
     */
    findModulesByPlan(planId: string): Promise<(Module & {
        is_default: boolean;
    })[]>;
    /**
     * Associar módulo a um plano
     */
    addModuleToPlan(planId: string, moduleId: string, isDefault?: boolean): Promise<void>;
    /**
     * Remover módulo de um plano
     */
    removeModuleFromPlan(planId: string, moduleId: string): Promise<void>;
    /**
     * Ativar módulos padrão de um plano para um tenant
     * (chamado quando tenant assina um plano)
     */
    activatePlanModulesForTenant(tenantId: string, planId: string): Promise<void>;
}
//# sourceMappingURL=feature-toggle.repository.d.ts.map