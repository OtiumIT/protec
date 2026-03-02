"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureToggleService = void 0;
const feature_toggle_repository_1 = require("./feature-toggle.repository");
class FeatureToggleService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    /**
     * Verificar se módulo está ativo para tenant
     * Método estático para uso em middlewares e outros serviços
     */
    static async verify(companyId, moduleKey) {
        const repo = new feature_toggle_repository_1.FeatureToggleRepository();
        return repo.isActive(companyId, moduleKey);
    }
    /**
     * Listar módulos disponíveis
     */
    async listAvailable() {
        return this.repo.findAll();
    }
    /**
     * Listar módulos ativos do tenant
     */
    async listActive(companyId) {
        return this.repo.findActiveByTenant(companyId);
    }
    /**
     * Ativar módulo para tenant
     */
    async activate(companyId, moduleId, enabledUntil) {
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
    async deactivate(companyId, moduleId) {
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
    async getModulesByPlan(planId) {
        return this.repo.findModulesByPlan(planId);
    }
    /**
     * Associar módulo a um plano
     */
    async addModuleToPlan(planId, moduleId, isDefault = true) {
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
    async removeModuleFromPlan(planId, moduleId) {
        await this.repo.removeModuleFromPlan(planId, moduleId);
    }
    /**
     * Ativar módulos padrão de um plano para um tenant
     */
    async activatePlanModulesForTenant(tenantId, planId) {
        await this.repo.activatePlanModulesForTenant(tenantId, planId);
    }
}
exports.FeatureToggleService = FeatureToggleService;
