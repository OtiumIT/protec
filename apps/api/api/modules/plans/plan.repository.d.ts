import { BaseRepository } from '../../shared/repositories/base.repository';
import type { Plan } from '@shared/core';
export interface CreatePlanData {
    name: string;
    maxUsers: number;
    maxClients?: number;
    price: number;
    billingCycle: 'monthly' | 'yearly';
    features: string[];
    isCustom?: boolean;
    isManaged?: boolean;
}
export interface UpdatePlanData {
    name?: string;
    maxUsers?: number;
    maxClients?: number;
    price?: number;
    billingCycle?: 'monthly' | 'yearly';
    features?: string[];
    isCustom?: boolean;
    isManaged?: boolean;
    status?: 'active' | 'inactive';
}
export declare class PlanRepository extends BaseRepository {
    /**
     * Buscar plano por ID
     * Nota: Planos não requerem filtro de company_id (são globais)
     */
    findById(id: string): Promise<Plan | null>;
    /**
     * Buscar plano por nome (ex.: 'Free' para plano padrão de novos tenants)
     * Nota: Planos não requerem filtro de company_id (são globais)
     */
    findByName(name: string): Promise<Plan | null>;
    /**
     * Listar todos os planos (apenas ativos - listagem pública)
     * Usa DISTINCT ON para evitar duplicatas por nome (mantém o mais antigo)
     */
    findAll(): Promise<Plan[]>;
    /**
     * Listar todos os planos para admin (ativos + inativos - gestão)
     */
    findAllForAdmin(): Promise<Plan[]>;
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
//# sourceMappingURL=plan.repository.d.ts.map