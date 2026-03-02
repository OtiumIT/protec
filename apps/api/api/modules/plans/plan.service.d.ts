import { PlanRepository, CreatePlanData, UpdatePlanData } from './plan.repository';
import type { Plan } from '@shared/core';
export declare class PlanService {
    private planRepo;
    constructor(planRepo: PlanRepository);
    /**
     * Listar todos os planos (apenas ativos)
     */
    list(): Promise<Plan[]>;
    /**
     * Listar todos os planos para admin (ativos + inativos)
     */
    listForAdmin(): Promise<Plan[]>;
    /**
     * Buscar plano por ID
     */
    getById(id: string): Promise<Plan>;
    /**
     * Criar plano
     */
    create(data: CreatePlanData): Promise<Plan>;
    /**
     * Atualizar plano
     */
    update(id: string, data: UpdatePlanData): Promise<Plan>;
    /**
     * Deletar plano
     */
    delete(id: string): Promise<void>;
}
//# sourceMappingURL=plan.service.d.ts.map