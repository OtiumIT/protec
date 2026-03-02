"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanService = void 0;
const error_handler_1 = require("../../shared/utils/error-handler");
class PlanService {
    planRepo;
    constructor(planRepo) {
        this.planRepo = planRepo;
    }
    /**
     * Listar todos os planos (apenas ativos)
     */
    async list() {
        return this.planRepo.findAll();
    }
    /**
     * Listar todos os planos para admin (ativos + inativos)
     */
    async listForAdmin() {
        return this.planRepo.findAllForAdmin();
    }
    /**
     * Buscar plano por ID
     */
    async getById(id) {
        const plan = await this.planRepo.findById(id);
        if (!plan) {
            throw new error_handler_1.AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
        }
        return plan;
    }
    /**
     * Criar plano
     */
    async create(data) {
        return this.planRepo.create(data);
    }
    /**
     * Atualizar plano
     */
    async update(id, data) {
        const plan = await this.planRepo.findById(id);
        if (!plan) {
            throw new error_handler_1.AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
        }
        return this.planRepo.update(id, data);
    }
    /**
     * Deletar plano
     */
    async delete(id) {
        const plan = await this.planRepo.findById(id);
        if (!plan) {
            throw new error_handler_1.AppError('Plan not found', 'PLAN_NOT_FOUND', 404);
        }
        await this.planRepo.delete(id);
    }
}
exports.PlanService = PlanService;
