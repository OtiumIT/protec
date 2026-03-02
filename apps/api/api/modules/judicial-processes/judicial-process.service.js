"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JudicialProcessService = void 0;
const error_handler_1 = require("../../shared/utils/error-handler");
class JudicialProcessService {
    processRepo;
    clientRepo;
    constructor(processRepo, clientRepo) {
        this.processRepo = processRepo;
        this.clientRepo = clientRepo;
    }
    /**
     * Listar processos de um cliente
     */
    async findByClientId(clientId) {
        // Verificar se cliente existe
        const client = await this.clientRepo.findById(clientId);
        if (!client) {
            throw new error_handler_1.AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
        }
        return this.processRepo.findByClientId(clientId);
    }
    /**
     * Buscar processo por ID
     */
    async findById(id) {
        const process = await this.processRepo.findById(id);
        if (!process) {
            throw new error_handler_1.AppError('Judicial process not found', 'PROCESS_NOT_FOUND', 404);
        }
        return process;
    }
    /**
     * Criar processo judicial
     */
    async create(data) {
        // Verificar se cliente existe
        const client = await this.clientRepo.findById(data.client_id);
        if (!client) {
            throw new error_handler_1.AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
        }
        return this.processRepo.create(data);
    }
    /**
     * Atualizar processo judicial
     */
    async update(id, data) {
        const process = await this.processRepo.findById(id);
        if (!process) {
            throw new error_handler_1.AppError('Judicial process not found', 'PROCESS_NOT_FOUND', 404);
        }
        return this.processRepo.update(id, data);
    }
    /**
     * Deletar processo judicial
     */
    async delete(id) {
        const process = await this.processRepo.findById(id);
        if (!process) {
            throw new error_handler_1.AppError('Judicial process not found', 'PROCESS_NOT_FOUND', 404);
        }
        await this.processRepo.delete(id);
    }
    /**
     * Verificar se cliente é elegível para um edital de contencioso baseado na tese
     */
    async isEligibleForThesis(clientId, legalThesis) {
        return this.processRepo.hasActiveProcessForThesis(clientId, legalThesis);
    }
    /**
     * Obter todas as teses elegíveis para um cliente
     */
    async getEligibleTheses(clientId) {
        const theses = ['IPI_PRACA', 'PRL', 'IRPJ_CSLL_DESMUTUALIZACAO'];
        const eligible = [];
        for (const thesis of theses) {
            const hasProcess = await this.processRepo.hasActiveProcessForThesis(clientId, thesis);
            if (hasProcess) {
                eligible.push(thesis);
            }
        }
        return eligible;
    }
}
exports.JudicialProcessService = JudicialProcessService;
