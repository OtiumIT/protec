import { PlanRepository, CreatePlanData, UpdatePlanData } from './plan.repository';
import { AppError } from '../../shared/utils/error-handler';
import type { Plan } from '@shared/core';

export class PlanService {
  constructor(private planRepo: PlanRepository) {}

  /**
   * Listar todos os planos (apenas ativos)
   */
  async list(): Promise<Plan[]> {
    return this.planRepo.findAll();
  }

  /**
   * Listar todos os planos para admin (ativos + inativos)
   */
  async listForAdmin(): Promise<Plan[]> {
    return this.planRepo.findAllForAdmin();
  }

  /**
   * Buscar plano por ID
   */
  async getById(id: string): Promise<Plan> {
    const plan = await this.planRepo.findById(id);
    if (!plan) {
      throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
    }
    return plan;
  }

  /**
   * Criar plano
   */
  async create(data: CreatePlanData): Promise<Plan> {
    return this.planRepo.create(data);
  }

  /**
   * Atualizar plano
   */
  async update(id: string, data: UpdatePlanData): Promise<Plan> {
    const plan = await this.planRepo.findById(id);
    if (!plan) {
      throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
    }
    return this.planRepo.update(id, data);
  }

  /**
   * Deletar plano
   */
  async delete(id: string): Promise<void> {
    const plan = await this.planRepo.findById(id);
    if (!plan) {
      throw new AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
    }
    await this.planRepo.delete(id);
  }
}
