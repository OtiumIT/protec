"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureToggleRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class FeatureToggleRepository extends base_repository_1.BaseRepository {
    /**
     * Buscar todos os módulos disponíveis
     */
    async findAll() {
        console.log('[FeatureToggleRepository.findAll] Executando query...');
        const result = await this.query('SELECT id, name, key, description, created_at FROM public.modules ORDER BY name', [], false // modules não requerem filtro de tenant
        );
        console.log(`[FeatureToggleRepository.findAll] Query executada, encontrados ${result.rows.length} módulos`);
        return result.rows;
    }
    /**
     * Buscar módulo por key
     */
    async findByKey(key) {
        const result = await this.query('SELECT id, name, key, description, created_at FROM public.modules WHERE key = $1', [key], false);
        return result.rows[0] || null;
    }
    /**
     * Buscar módulo por ID
     */
    async findById(id) {
        const result = await this.query('SELECT id, name, key, description, created_at FROM public.modules WHERE id = $1', [id], false);
        return result.rows[0] || null;
    }
    /**
     * Buscar módulos ativos por tenant
     */
    async findActiveByTenant(tenantId) {
        const result = await this.query(`SELECT m.id, m.name, m.key, m.description, m.created_at, tm.enabled_until
       FROM public.modules m
       INNER JOIN public.tenant_modules tm ON tm.module_id = m.id
       WHERE tm.tenant_id = $1 
       AND (tm.enabled_until IS NULL OR tm.enabled_until > NOW())
       ORDER BY m.name`, [tenantId], false // tenant_modules já filtra por tenant_id
        );
        return result.rows;
    }
    /**
     * Verificar se módulo está ativo para tenant
     */
    async isActive(tenantId, moduleKey) {
        const result = await this.query(`SELECT tm.id 
       FROM public.tenant_modules tm
       JOIN public.modules m ON m.id = tm.module_id
       WHERE tm.tenant_id = $1 AND m.key = $2 
       AND (tm.enabled_until IS NULL OR tm.enabled_until > NOW())`, [tenantId, moduleKey], false);
        return result.rows.length > 0;
    }
    /**
     * Ativar módulo para tenant
     */
    async activateForTenant(tenantId, moduleId, enabledUntil) {
        // Usar UPSERT para atualizar se já existir
        const result = await this.query(`INSERT INTO public.tenant_modules (tenant_id, module_id, enabled_until)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, module_id) 
       DO UPDATE SET enabled_until = $3
       RETURNING id, tenant_id, module_id, enabled_until, created_at`, [tenantId, moduleId, enabledUntil || null], false);
        return result.rows[0];
    }
    /**
     * Desativar módulo para tenant
     */
    async deactivateForTenant(tenantId, moduleId) {
        await this.query('DELETE FROM public.tenant_modules WHERE tenant_id = $1 AND module_id = $2', [tenantId, moduleId], false);
    }
    /**
     * Buscar módulos associados a um plano
     */
    async findModulesByPlan(planId) {
        const result = await this.query(`SELECT m.id, m.name, m.key, m.description, m.created_at, pm.is_default
       FROM public.modules m
       INNER JOIN public.plan_modules pm ON pm.module_id = m.id
       WHERE pm.plan_id = $1
       ORDER BY m.name`, [planId], false);
        return result.rows;
    }
    /**
     * Associar módulo a um plano
     */
    async addModuleToPlan(planId, moduleId, isDefault = true) {
        await this.query(`INSERT INTO public.plan_modules (plan_id, module_id, is_default)
       VALUES ($1, $2, $3)
       ON CONFLICT (plan_id, module_id)
       DO UPDATE SET is_default = $3`, [planId, moduleId, isDefault], false);
    }
    /**
     * Remover módulo de um plano
     */
    async removeModuleFromPlan(planId, moduleId) {
        await this.query('DELETE FROM public.plan_modules WHERE plan_id = $1 AND module_id = $2', [planId, moduleId], false);
    }
    /**
     * Ativar módulos padrão de um plano para um tenant
     * (chamado quando tenant assina um plano)
     */
    async activatePlanModulesForTenant(tenantId, planId) {
        // Buscar módulos padrão do plano
        const planModules = await this.findModulesByPlan(planId);
        // Ativar apenas módulos marcados como default
        for (const planModule of planModules) {
            if (planModule.is_default) {
                // Verificar se já não está ativo
                const isActive = await this.isActive(tenantId, planModule.key);
                if (!isActive) {
                    await this.activateForTenant(tenantId, planModule.id, undefined);
                }
            }
        }
    }
}
exports.FeatureToggleRepository = FeatureToggleRepository;
