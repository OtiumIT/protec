"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FiscalFileService = void 0;
const error_handler_1 = require("../../shared/utils/error-handler");
const storage_service_1 = require("../../shared/services/storage.service");
const storage_config_1 = require("../../shared/config/storage.config");
const logger_1 = require("../../shared/utils/logger");
class FiscalFileService {
    fiscalFileRepo;
    clientRepo;
    constructor(fiscalFileRepo, clientRepo) {
        this.fiscalFileRepo = fiscalFileRepo;
        this.clientRepo = clientRepo;
    }
    /**
     * Upload de arquivo fiscal
     * @param companyId - ID da contabilidade (necessário apenas para estrutura de pastas no storage)
     * @param clientId - ID do cliente
     * @param userId - ID do usuário que está fazendo upload (para logs)
     * NOTA: Schema já isola por tenant para queries no banco, mas companyId é necessário para estrutura de pastas no storage
     */
    async upload(companyId, clientId, competence, fileType, file, fileName, mimeType, userId) {
        // Validar que cliente existe (schema já isola)
        const client = await this.clientRepo.findById(clientId);
        if (!client) {
            throw new error_handler_1.AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
        }
        // Validar tipo de arquivo
        if (!(0, storage_config_1.validateFileType)(fileName, mimeType)) {
            throw new error_handler_1.AppError(`Invalid file type. Allowed: ${storage_config_1.STORAGE_CONFIG.allowedExtensions.join(', ')}`, 'INVALID_FILE_TYPE', 400);
        }
        // Validar tamanho
        if (!(0, storage_config_1.validateFileSize)(file.length)) {
            throw new error_handler_1.AppError(`File size exceeds maximum of ${storage_config_1.STORAGE_CONFIG.maxFileSize / 1024 / 1024}MB`, 'FILE_TOO_LARGE', 400);
        }
        // Upload para Supabase Storage (companyId necessário para estrutura de pastas)
        const filePath = await (0, storage_service_1.uploadFile)(companyId, clientId, competence, file, fileName, mimeType);
        // Criar registro no banco
        const fiscalFile = await this.fiscalFileRepo.create({
            client_id: clientId,
            file_type: fileType,
            competence,
            file_name: fileName,
            file_path: filePath,
            file_size: file.length,
            mime_type: mimeType,
        });
        // Log de operação (upload de arquivo fiscal)
        if (userId) {
            (0, logger_1.logSensitiveOperation)('FISCAL_FILE_UPLOAD', userId, companyId, {
                fiscal_file_id: fiscalFile.id,
                client_id: clientId,
                file_type: fileType,
                competence,
                file_name: fileName,
                file_size: file.length,
            });
        }
        return fiscalFile;
    }
    /**
     * Listar arquivos fiscais
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    async list(options) {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const result = await this.fiscalFileRepo.list({
            client_id: options.client_id,
            competence: options.competence,
            status: options.status,
            page,
            limit,
        });
        return {
            files: result.files,
            total: result.total,
            page,
            limit,
        };
    }
    /**
     * Buscar arquivo por ID
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    async getById(id) {
        const file = await this.fiscalFileRepo.findById(id);
        if (!file) {
            throw new error_handler_1.AppError('Fiscal file not found', 'FISCAL_FILE_NOT_FOUND', 404);
        }
        return file;
    }
    /**
     * Obter URL de download do arquivo
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    async getDownloadUrl(id, expiresIn = 3600) {
        const file = await this.getById(id);
        return (0, storage_service_1.generateSignedUrl)(file.file_path, expiresIn);
    }
    /**
     * Atualizar status do arquivo
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    async updateStatus(id, data) {
        await this.getById(id); // Validar que arquivo existe
        return this.fiscalFileRepo.update(id, data);
    }
    /**
     * Deletar arquivo fiscal
     * @param id - ID do arquivo
     * @param companyId - ID da contabilidade (para logs)
     * @param userId - ID do usuário (para logs)
     * NOTA: Schema já isola por tenant, não precisa companyId nas queries
     */
    async delete(id, companyId, userId) {
        const file = await this.getById(id);
        // Deletar do storage
        try {
            await (0, storage_service_1.deleteFile)(file.file_path);
        }
        catch (error) {
            // Log erro mas continua com deleção do registro
            console.error('Error deleting file from storage:', error);
        }
        // Deletar registro do banco
        await this.fiscalFileRepo.delete(id);
        // Log de operação sensível (DELETE)
        if (userId && companyId) {
            (0, logger_1.logSensitiveOperation)('FISCAL_FILE_DELETE', userId, companyId, {
                fiscal_file_id: id,
                client_id: file.client_id,
                file_name: file.file_name,
                file_type: file.file_type,
                competence: file.competence,
            });
        }
    }
    /**
     * Listar arquivos por cliente
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    async listByClient(clientId) {
        // Validar que cliente existe
        const client = await this.clientRepo.findById(clientId);
        if (!client) {
            throw new error_handler_1.AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
        }
        return this.fiscalFileRepo.findByClient(clientId);
    }
}
exports.FiscalFileService = FiscalFileService;
