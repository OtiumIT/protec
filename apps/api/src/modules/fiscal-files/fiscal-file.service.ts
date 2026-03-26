import {
  FiscalFileRepository,
  CreateSpedCalibratorRuleData,
  SpedCalibratorRuleRow,
  UpdateSpedCalibratorRuleData,
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
import { inspectSpedBuffer, type SpedCalibratorRule } from './sped-layout-parser';

type FiscalFileType = 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros';
const IN2306_FIELDS_BY_KIND: Record<'receita' | 'deducao' | 'retencao', readonly string[]> = {
  receita: [
    'produtos_mercadorias',
    'servicos',
    'servicos_favorecida',
    'servicos_hospitalares',
    'demais_receitas',
  ],
  deducao: ['pis_cofins_zero', 'icms_destacado'],
  retencao: ['irrf', 'orgaos_publicos'],
};

export class FiscalFileService {
  constructor(
    private fiscalFileRepo: FiscalFileRepository,
    private clientRepo: ClientRepository
  ) {}

  /**
   * Upload de arquivo fiscal
   * @param companyId - ID da contabilidade (necessário apenas para estrutura de pastas no storage)
   * @param clientId - ID do cliente
   * @param options - metadados opcionais enviados manualmente como fallback
   * @param userId - ID do usuário que está fazendo upload (para logs)
   * NOTA: Schema já isola por tenant para queries no banco, mas companyId é necessário para estrutura de pastas no storage
   */
  async upload(
    companyId: string,
    clientId: string,
    file: Buffer,
    fileName: string,
    mimeType: string,
    userId?: string,
    options?: {
      competence?: string;
      file_type?: FiscalFileType;
    }
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

    const metadata = await this.resolveUploadMetadata(file, fileName, clientId, options);
    const fileType = metadata.fileType;
    const competence = metadata.competence;
    const inspection = metadata.inspection;

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

    // Persistir metadados da inspeção de SPED quando disponíveis
    if (inspection) {
      const metadata = {
        extraction_version: 2,
        sped_inspection: inspection,
        module_prefill: inspection.module_prefill,
      };
      await this.fiscalFileRepo.update(fiscalFile.id, {
        metadata,
      });

      if (inspection.balance_sheet) {
        await this.fiscalFileRepo.createExtractedData({
          fiscal_file_id: fiscalFile.id,
          client_id: clientId,
          competence,
          data_type: 'balance_sheet',
          data: inspection.balance_sheet,
        });
      }

      if (inspection.dre) {
        await this.fiscalFileRepo.createExtractedData({
          fiscal_file_id: fiscalFile.id,
          client_id: clientId,
          competence,
          data_type: 'dre',
          data: inspection.dre,
        });
      }

      if (inspection.module_prefill.rating_validator) {
        await this.fiscalFileRepo.createExtractedData({
          fiscal_file_id: fiscalFile.id,
          client_id: clientId,
          competence,
          data_type: 'module_prefill_rating_validator',
          data: inspection.module_prefill.rating_validator,
        });
      }

      if (inspection.module_prefill.simulador_in2306) {
        await this.fiscalFileRepo.createExtractedData({
          fiscal_file_id: fiscalFile.id,
          client_id: clientId,
          competence,
          data_type: 'module_prefill_simulador_in2306',
          data: inspection.module_prefill.simulador_in2306,
        });
      }

      if (inspection.module_prefill.irpf_alta_renda) {
        await this.fiscalFileRepo.createExtractedData({
          fiscal_file_id: fiscalFile.id,
          client_id: clientId,
          competence,
          data_type: 'module_prefill_irpf_alta_renda',
          data: inspection.module_prefill.irpf_alta_renda,
        });
      }

      if (inspection.ecf_tax_signals) {
        await this.fiscalFileRepo.createExtractedData({
          fiscal_file_id: fiscalFile.id,
          client_id: clientId,
          competence,
          data_type: 'ecf_tax_signals',
          data: inspection.ecf_tax_signals,
        });
      }

      if (inspection.prefill_catalog.length > 0) {
        await this.fiscalFileRepo.createExtractedData({
          fiscal_file_id: fiscalFile.id,
          client_id: clientId,
          competence,
          data_type: 'prefill_catalog',
          data: { items: inspection.prefill_catalog },
        });
      }

      // Para SPED em texto com dados estruturados, marcamos como processado.
      if (
        inspection.balance_sheet ||
        inspection.dre ||
        inspection.socios_remuneracao.length > 0
      ) {
        await this.fiscalFileRepo.update(fiscalFile.id, {
          status: 'processed',
        });
      }
    }

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

    const refreshed = await this.fiscalFileRepo.findById(fiscalFile.id);
    return refreshed || fiscalFile;
  }

  private async resolveUploadMetadata(
    file: Buffer,
    fileName: string,
    clientId: string,
    options?: {
      competence?: string;
      file_type?: FiscalFileType;
    }
  ): Promise<{
    fileType: FiscalFileType;
    competence: string;
    inspection: ReturnType<typeof inspectSpedBuffer> | null;
  }> {
    const normalizedProvidedCompetence = options?.competence?.trim();
    const providedCompetence =
      normalizedProvidedCompetence && /^\d{4}-\d{2}$/.test(normalizedProvidedCompetence)
        ? normalizedProvidedCompetence
        : undefined;
    const providedFileType = options?.file_type;
    const lowerName = fileName.toLowerCase();
    const extension = lowerName.includes('.') ? lowerName.slice(lowerName.lastIndexOf('.')) : '';
    const shouldInspectSpedByHint =
      extension === '.txt' || providedFileType === 'sped' || providedFileType === 'ecd';

    let inspection: ReturnType<typeof inspectSpedBuffer> | null = null;
    if (shouldInspectSpedByHint) {
      try {
        const calibratorRules = await this.getCalibratorRulesForClient(clientId);
        inspection = inspectSpedBuffer(file, {
          calibratorRules,
        });
      } catch (error) {
        console.warn('[FiscalFileService.upload] Failed to inspect SPED file:', error);
      }
    }

    const inferredFileTypeFromInspection = inspection?.header.type === 'ecd'
      ? 'ecd'
      : inspection?.header.type === 'ecf'
        ? 'sped'
        : undefined;
    /** ECD costuma vir como .txt; a inspeção pode classificar como ECF (SPED) — o nome oficial costuma conter SPED-ECD. */
    const inferredFileTypeFromEcdName = /sped-ecd/i.test(fileName) ? ('ecd' as const) : undefined;
    const inferredFileTypeFromExtension: FiscalFileType | undefined =
      extension === '.xml'
        ? 'xml'
        : extension === '.pdf'
          ? 'pdf'
          : extension === '.txt'
            ? 'txt'
            : undefined;
    const fileType =
      providedFileType ||
      inferredFileTypeFromEcdName ||
      inferredFileTypeFromInspection ||
      inferredFileTypeFromExtension;

    const inferredCompetenceFromInspection =
      inspection?.header.period_end?.slice(0, 7) ||
      inspection?.header.period_start?.slice(0, 7);
    const inferredCompetenceFromName = this.extractCompetenceFromFileName(fileName);
    const competence =
      providedCompetence ||
      inferredCompetenceFromInspection ||
      inferredCompetenceFromName;

    if (!fileType || !competence) {
      const missingFields = [
        !fileType ? 'file_type' : null,
        !competence ? 'competence' : null,
      ].filter(Boolean);
      throw new AppError(
        `Nao foi possivel identificar automaticamente: ${missingFields.join(', ')}. Informe manualmente e tente novamente.`,
        'UPLOAD_METADATA_REQUIRED',
        422
      );
    }

    return {
      fileType,
      competence,
      inspection,
    };
  }

  private extractCompetenceFromFileName(fileName: string): string | undefined {
    const sanitized = fileName.replace(/\.[^/.]+$/, '');
    const dashedDate = sanitized.match(/(20\d{2})[-_](0[1-9]|1[0-2])[-_](0[1-9]|[12]\d|3[01])/);
    if (dashedDate) {
      return `${dashedDate[1]}-${dashedDate[2]}`;
    }

    const compactDate = sanitized.match(/(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
    if (compactDate) {
      return `${compactDate[1]}-${compactDate[2]}`;
    }

    const competenceToken = sanitized.match(/(20\d{2})[-_]?((0[1-9])|(1[0-2]))/);
    if (competenceToken) {
      return `${competenceToken[1]}-${competenceToken[2]}`;
    }

    return undefined;
  }

  /**
   * Inspecionar arquivo SPED (ECD/ECF) para sugerir cliente e metadados.
   */
  async inspectSpedCandidate(
    file: Buffer,
    fileName: string,
    hintedClientId?: string
  ): Promise<{
    inspection: ReturnType<typeof inspectSpedBuffer>;
    matched_client: { id: string; name: string; cnpj?: string | null; cpf?: string | null } | null;
    requires_client_registration: boolean;
  }> {
    const lowerName = fileName.toLowerCase();
    if (!lowerName.endsWith('.txt')) {
      throw new AppError('Only .txt SPED files are supported in inspection', 'INVALID_FILE_TYPE', 400);
    }

    const baseInspection = inspectSpedBuffer(file);
    const cnpj = baseInspection.header.company_cnpj;

    let matchedClient: { id: string; name: string; cnpj?: string | null; cpf?: string | null } | null = null;
    if (cnpj) {
      const client = await this.clientRepo.findByCnpj(cnpj);
      if (client) {
        matchedClient = {
          id: client.id,
          name: client.name,
          cnpj: client.cnpj,
          cpf: client.cpf,
        };
      }
    }

    let inspection = baseInspection;
    const effectiveClientId = hintedClientId || matchedClient?.id;
    if (effectiveClientId) {
      const calibratorRules = await this.getCalibratorRulesForClient(effectiveClientId);
      if (calibratorRules.length > 0) {
        inspection = inspectSpedBuffer(file, { calibratorRules });
      }
    }

    return {
      inspection,
      matched_client: matchedClient,
      requires_client_registration: !!cnpj && !matchedClient,
    };
  }

  async listCalibratorRules(clientId?: string): Promise<SpedCalibratorRuleRow[]> {
    return this.fiscalFileRepo.listCalibratorRules(clientId);
  }

  async createCalibratorRule(data: CreateSpedCalibratorRuleData): Promise<SpedCalibratorRuleRow> {
    if (data.client_id) {
      const client = await this.clientRepo.findById(data.client_id);
      if (!client) {
        throw new AppError('Client not found', 'CLIENT_NOT_FOUND', 404);
      }
    }
    this.validateCalibratorTarget(data.target_kind, data.target_field);
    return this.fiscalFileRepo.createCalibratorRule(data);
  }

  async updateCalibratorRule(id: string, data: UpdateSpedCalibratorRuleData): Promise<SpedCalibratorRuleRow> {
    const existing = await this.fiscalFileRepo.findCalibratorRuleById(id);
    if (!existing) {
      throw new AppError('Calibrator rule not found', 'CALIBRATOR_RULE_NOT_FOUND', 404);
    }
    const targetKind = data.target_kind ?? existing.target_kind;
    const targetField = data.target_field ?? existing.target_field;
    this.validateCalibratorTarget(targetKind, targetField);
    return this.fiscalFileRepo.updateCalibratorRule(id, data);
  }

  async deleteCalibratorRule(id: string): Promise<void> {
    const existing = await this.fiscalFileRepo.findCalibratorRuleById(id);
    if (!existing) {
      throw new AppError('Calibrator rule not found', 'CALIBRATOR_RULE_NOT_FOUND', 404);
    }
    await this.fiscalFileRepo.deleteCalibratorRule(id);
  }

  private async getCalibratorRulesForClient(clientId: string): Promise<SpedCalibratorRule[]> {
    const rows = await this.fiscalFileRepo.listCalibratorRules(clientId);
    return rows
      .filter((row) => row.active)
      .map((row) => ({
        id: row.id,
        client_id: row.client_id,
        pattern: row.pattern,
        target_module: row.target_module,
        target_kind: row.target_kind,
        target_field: row.target_field as SpedCalibratorRule['target_field'],
        confidence_override: row.confidence_override,
        active: row.active,
      }));
  }

  private validateCalibratorTarget(targetKind: 'receita' | 'deducao' | 'retencao', targetField: string): void {
    const allowedFields = IN2306_FIELDS_BY_KIND[targetKind];
    if (!allowedFields.includes(targetField)) {
      throw new AppError(
        `target_field invalido para ${targetKind}. Permitidos: ${allowedFields.join(', ')}`,
        'INVALID_CALIBRATOR_TARGET',
        400
      );
    }
  }

  /**
   * Retorna resumo consolidado da extração para visualização no portal.
   */
  async getExtractionSummary(id: string): Promise<{
    fiscal_file: Pick<FiscalFile, 'id' | 'file_name' | 'file_type' | 'competence' | 'status' | 'metadata'>;
    extracted_data_types: string[];
    extracted_data: Array<{ data_type: string; data: Record<string, any>; created_at: Date }>;
    prefill_confidence: {
      rating_validator: number;
      simulador_in2306: number;
      irpf_alta_renda: number;
    };
  }> {
    const file = await this.getById(id);
    const extractedRows = await this.fiscalFileRepo.findExtractedDataByFiscalFileId(id);
    const inspection = (file.metadata?.sped_inspection || null) as
      | ReturnType<typeof inspectSpedBuffer>
      | null;

    const hasBalance = !!inspection?.balance_sheet;
    const hasDre = !!inspection?.dre;
    const sociosCount = inspection?.socios_remuneracao?.length || 0;
    const hasSocios = sociosCount > 0;
    const hasEcfTaxSignals = (inspection?.ecf_tax_signals?.trimestres?.length || 0) > 0;
    const in2306OverallFromPrefill = Number(
      (inspection?.module_prefill?.simulador_in2306 as any)?.confidence?.overall || 0
    );
    const ratingConfidence = hasBalance ? (hasDre ? 0.95 : 0.7) : 0;
    const in2306Confidence =
      hasEcfTaxSignals
        ? in2306OverallFromPrefill > 0
          ? in2306OverallFromPrefill
          : 0.65
        : hasDre && typeof inspection?.dre?.receita_bruta === 'number'
          ? 0.85
          : hasDre
            ? 0.6
            : 0;
    const irpfConfidence = hasSocios ? Math.min(0.9, 0.5 + sociosCount * 0.1) : 0;

    return {
      fiscal_file: {
        id: file.id,
        file_name: file.file_name,
        file_type: file.file_type,
        competence: file.competence,
        status: file.status,
        metadata: file.metadata,
      },
      extracted_data_types: Array.from(new Set(extractedRows.map((row) => row.data_type))),
      extracted_data: extractedRows.map((row) => ({
        data_type: row.data_type,
        data: row.data,
        created_at: row.created_at,
      })),
      prefill_confidence: {
        rating_validator: Number(ratingConfidence.toFixed(2)),
        simulador_in2306: Number(in2306Confidence.toFixed(2)),
        irpf_alta_renda: Number(irpfConfidence.toFixed(2)),
      },
    };
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
