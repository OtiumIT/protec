import { FeatureToggleRepository } from './feature-toggle.repository';
import type { Module, TenantModule } from '@shared/core';
export declare class FeatureToggleService {
    private repo;
    constructor(repo: FeatureToggleRepository);
    /**
     * Verificar se módulo está ativo para tenant
     * Método estático para uso em middlewares e outros serviços
     */
    static verify(companyId: string, moduleKey: string): Promise<boolean>;
    /**
     * Listar módulos disponíveis
     */
    listAvailable(): Promise<Module[]>;
    /**
     * Listar módulos ativos do tenant
     */
    listActive(companyId: string): Promise<(Module & {
        enabled_until?: Date;
    })[]>;
    /**
     * Ativar módulo para tenant
     */
    activate(companyId: string, moduleId: string, enabledUntil?: Date): Promise<TenantModule>;
    /**
     * Desativar módulo para tenant
     */
    deactivate(companyId: string, moduleId: string): Promise<void>;
    /**
     * Buscar módulos associados a um plano
     */
    getModulesByPlan(planId: string): Promise<(Module & {
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
     */
    activatePlanModulesForTenant(tenantId: string, planId: string): Promise<void>;
}
//# sourceMappingURL=feature-toggle.service.d.ts.map