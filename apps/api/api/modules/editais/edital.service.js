"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditalService = void 0;
const error_handler_1 = require("../../shared/utils/error-handler");
class EditalService {
    editalRepo;
    constructor(editalRepo) {
        this.editalRepo = editalRepo;
    }
    /**
     * Listar editais
     */
    async list(options = {}) {
        return this.editalRepo.list(options);
    }
    /**
     * Buscar edital por ID
     */
    async findById(id) {
        const edital = await this.editalRepo.findById(id);
        if (!edital) {
            throw new error_handler_1.AppError('Edital not found', 'EDITAL_NOT_FOUND', 404);
        }
        return edital;
    }
    /**
     * Buscar edital por código
     */
    async findByCode(code) {
        const edital = await this.editalRepo.findByCode(code);
        if (!edital) {
            throw new error_handler_1.AppError('Edital not found', 'EDITAL_NOT_FOUND', 404);
        }
        return edital;
    }
    /**
     * Criar novo edital
     */
    async create(data, userId) {
        // Verificar se código já existe
        const existing = await this.editalRepo.findByCode(data.code);
        if (existing) {
            throw new error_handler_1.AppError('Edital with this code already exists', 'EDITAL_CODE_EXISTS', 400);
        }
        return this.editalRepo.create({
            ...data,
            created_by: userId,
        });
    }
    /**
     * Atualizar edital
     */
    async update(id, data) {
        const edital = await this.editalRepo.findById(id);
        if (!edital) {
            throw new error_handler_1.AppError('Edital not found', 'EDITAL_NOT_FOUND', 404);
        }
        return this.editalRepo.update(id, data);
    }
    /**
     * Deletar edital
     */
    async delete(id) {
        const edital = await this.editalRepo.findById(id);
        if (!edital) {
            throw new error_handler_1.AppError('Edital not found', 'EDITAL_NOT_FOUND', 404);
        }
        const deleted = await this.editalRepo.delete(id);
        if (!deleted) {
            throw new error_handler_1.AppError('Failed to delete edital', 'DELETE_FAILED', 500);
        }
        return { success: true };
    }
    /**
     * Buscar editais ativos
     */
    async findActive(date) {
        return this.editalRepo.findActive(date);
    }
}
exports.EditalService = EditalService;
