import {
  FiscalFileRepository,
  UpdateFiscalFileData,
  type FiscalFile,
} from './fiscal-file.repository';
import { AppError } from '../../shared/utils/error-handler';
import {
  uploadFile,
  deleteFile as deleteStorageFile,
  generateSignedUrl,
} from '../../shared/services/storage.service';
import { validateFileType, validateFileSize, STORAGE_CONFIG } from '../../shared/config/storage.config';
import { ClientRepository } from '../clients/client.repository';
import { logSensitiveOperation } from '../../shared/utils/logger';

export class FiscalFileService {
  constructor(
    private fiscalFileRepo: FiscalFileRepository,
    private clientRepo: ClientRepository
  ) {}

  /**
   * Upload de arquivo fiscal
   * @param companyId - ID da contabilidade (necessário apenas para estrutura de pastas no storage)
   * @param clientId - ID do cliente
   * @param userId - ID do usuário que está fazendo upload (para logs)
   * NOTA: Schema já isola por tenant para queries no banco, mas companyId é necessário para estrutura de pastas no storage
   */
  async upload(
    companyId: string,
    clientId: string,
    competence: string,
    fileType: 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros',
    file: Buffer,
    fileName: string,
    mimeType: string,
    userId?: string
  ): Promise<FiscalFile> {
    // Validar que cliente existe (schema já isola)
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    }

    // Validar tipo de arquivo
    if (!validateFileType(fileName, mimeType)) {
      throw new AppError(
        `Invalid file type. Allowed: ${STORAGE_CONFIG.allowedExtensions.join(', ')}`,
        'INVALID_FILE_TYPE',
        400
      );
    }

    // Validar tamanho
    if (!validateFileSize(file.length)) {
      throw new AppError(
        `File size exceeds maximum of ${STORAGE_CONFIG.maxFileSize / 1024 / 1024}MB`,
        'FILE_TOO_LARGE',
        400
      );
    }

    // Upload para Supabase Storage (companyId necessário para estrutura de pastas)
    const filePath = await uploadFile(companyId, clientId, competence, file, fileName, mimeType);

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
      logSensitiveOperation('FISCAL_FILE_UPLOAD', userId, companyId, {
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
  async list(options: {
    client_id?: string;
    competence?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ files: FiscalFile[]; total: number; page: number; limit: number }> {
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
  async getById(id: string): Promise<FiscalFile> {
    const file = await this.fiscalFileRepo.findById(id);
    if (!file) {
      throw new AppError('Fiscal file not found', 'FISCAL_FILE_NOT_FOUND', 404);
    }
    return file;
  }

  /**
   * Obter URL de download do arquivo
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async getDownloadUrl(id: string, expiresIn: number = 3600): Promise<string> {
    const file = await this.getById(id);
    return generateSignedUrl(file.file_path, expiresIn);
  }

  /**
   * Atualizar status do arquivo
   * NOTA: Schema já isola por tenant, não precisa companyId
   */
  async updateStatus(
    id: string,
    data: UpdateFiscalFileData
  ): Promise<FiscalFile> {
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
  async delete(id: string, companyId?: string, userId?: string): Promise<void> {
    const file = await this.getById(id);

    // Deletar do storage
    try {
      await deleteStorageFile(file.file_path);
    } catch (error) {
      // Log erro mas continua com deleção do registro
      console.error('Error deleting file from storage:', error);
    }

    // Deletar registro do banco
    await this.fiscalFileRepo.delete(id);

    // Log de operação sensível (DELETE)
    if (userId && companyId) {
      logSensitiveOperation('FISCAL_FILE_DELETE', userId, companyId, {
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
  async listByClient(clientId: string): Promise<FiscalFile[]> {
    // Validar que cliente existe
    const client = await this.clientRepo.findById(clientId);
    if (!client) {
      throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
    }

    return this.fiscalFileRepo.findByClient(clientId);
  }
}
