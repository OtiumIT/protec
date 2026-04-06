import { BaseRepository } from '../../shared/repositories/base.repository';

export interface FiscalFile {
  id: string;
  client_id: string;
  file_type: 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros';
  competence: string; // YYYY-MM
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  status: 'uploaded' | 'processing' | 'processed' | 'error';
  processing_error: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateFiscalFileData {
  client_id: string;
  file_type: 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros';
  competence: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
}

export interface CreateExtractedFiscalData {
  fiscal_file_id: string;
  client_id: string;
  data_type: string;
  competence: string;
  data: Record<string, any>;
}

export interface UpdateFiscalFileData {
  status?: 'uploaded' | 'processing' | 'processed' | 'error';
  processing_error?: string | null;
  metadata?: Record<string, any> | null;
}

export interface ExtractedFiscalDataRow {
  id: string;
  fiscal_file_id: string;
  client_id: string;
  data_type: string;
  competence: string;
  data: Record<string, any>;
  created_at: Date;
}

export interface SpedCalibratorRuleRow {
  id: string;
  client_id: string | null;
  pattern: string;
  target_module: 'simulador_in2306';
  target_kind: 'receita' | 'deducao' | 'retencao';
  target_field: string;
  confidence_override: number | null;
  active: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSpedCalibratorRuleData {
  client_id?: string | null;
  pattern: string;
  target_kind: 'receita' | 'deducao' | 'retencao';
  target_field: string;
  confidence_override?: number | null;
  active?: boolean;
  notes?: string | null;
}

export interface UpdateSpedCalibratorRuleData {
  pattern?: string;
  target_kind?: 'receita' | 'deducao' | 'retencao';
  target_field?: string;
  confidence_override?: number | null;
  active?: boolean;
  notes?: string | null;
}

export class FiscalFileRepository extends BaseRepository {
  /**
   * Buscar arquivo por ID
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findById(id: string): Promise<FiscalFile | null> {
    const result = await this.query<FiscalFile>(
      `SELECT id, client_id, file_type, competence, file_name, file_path, 
              file_size, mime_type, status, processing_error, metadata, 
              created_at, updated_at 
       FROM fiscal_files WHERE id = $1`,
      [id],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }

  /**
   * Criar registro de arquivo fiscal
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async create(data: CreateFiscalFileData): Promise<FiscalFile> {
    const result = await this.query<FiscalFile>(
      `INSERT INTO fiscal_files 
       (client_id, file_type, competence, file_name, file_path, file_size, mime_type, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded') 
       RETURNING id, client_id, file_type, competence, file_name, file_path, 
                 file_size, mime_type, status, processing_error, metadata, 
                 created_at, updated_at`,
      [
        data.client_id,
        data.file_type,
        data.competence,
        data.file_name,
        data.file_path,
        data.file_size,
        data.mime_type,
      ],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }

  /**
   * Atualizar arquivo fiscal
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async update(id: string, data: UpdateFiscalFileData): Promise<FiscalFile> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(data.status);
    }
    if (data.processing_error !== undefined) {
      updates.push(`processing_error = $${paramIndex++}`);
      params.push(data.processing_error);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return this.findById(id) as Promise<FiscalFile>;
    }

    params.push(id);
    const result = await this.query<FiscalFile>(
      `UPDATE fiscal_files 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING id, client_id, file_type, competence, file_name, file_path, 
                 file_size, mime_type, status, processing_error, metadata, 
                 created_at, updated_at`,
      params,
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }

  /**
   * Deletar arquivo fiscal
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async delete(id: string): Promise<void> {
    await this.query(
      'DELETE FROM fiscal_files WHERE id = $1',
      [id],
      false // Não requer company_id (isolado por schema)
    );
  }

  /**
   * Listar arquivos por cliente e/ou competência
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async list(options: {
    client_id?: string;
    competence?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ files: FiscalFile[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    const conditions: string[] = [];

    if (options.client_id) {
      conditions.push(`client_id = $${params.length + 1}`);
      params.push(options.client_id);
    }
    if (options.competence) {
      conditions.push(`competence = $${params.length + 1}`);
      params.push(options.competence);
    }
    if (options.status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(options.status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Buscar total
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM fiscal_files ${whereClause}`,
      params,
      false // Não requer company_id (isolado por schema)
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Buscar arquivos
    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;
    const filesResult = await this.query<FiscalFile>(
      `SELECT id, client_id, file_type, competence, file_name, file_path, 
              file_size, mime_type, status, processing_error, metadata, 
              created_at, updated_at 
       FROM fiscal_files 
       ${whereClause}
       ORDER BY created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset],
      false // Não requer company_id (isolado por schema)
    );

    return {
      files: filesResult.rows,
      total,
    };
  }

  /**
   * Buscar arquivos por cliente
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findByClient(clientId: string): Promise<FiscalFile[]> {
    const result = await this.query<FiscalFile>(
      `SELECT id, client_id, file_type, competence, file_name, file_path, 
              file_size, mime_type, status, processing_error, metadata, 
              created_at, updated_at 
       FROM fiscal_files 
       WHERE client_id = $1 
       ORDER BY competence DESC, created_at DESC`,
      [clientId],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows;
  }

  /**
   * Persistir dados extraídos estruturados (JSONB) do arquivo fiscal
   */
  async createExtractedData(data: CreateExtractedFiscalData): Promise<void> {
    await this.query(
      `INSERT INTO extracted_fiscal_data
       (fiscal_file_id, client_id, data_type, competence, data)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        data.fiscal_file_id,
        data.client_id,
        data.data_type,
        data.competence,
        JSON.stringify(data.data),
      ],
      false // Não requer company_id (isolado por schema)
    );
  }

  /**
   * Buscar todos os dados extraídos relacionados a um arquivo fiscal.
   */
  async findExtractedDataByFiscalFileId(fiscalFileId: string): Promise<ExtractedFiscalDataRow[]> {
    const result = await this.query<ExtractedFiscalDataRow>(
      `SELECT id, fiscal_file_id, client_id, data_type, competence, data, created_at
       FROM extracted_fiscal_data
       WHERE fiscal_file_id = $1
       ORDER BY created_at ASC`,
      [fiscalFileId],
      false
    );
    return result.rows;
  }

  async listCalibratorRules(clientId?: string): Promise<SpedCalibratorRuleRow[]> {
    const params: any[] = [];
    let whereClause = '';
    if (clientId) {
      whereClause = 'WHERE client_id IS NULL OR client_id = $1';
      params.push(clientId);
    }
    const result = await this.query<SpedCalibratorRuleRow>(
      `SELECT id, client_id, pattern, target_module, target_kind, target_field, confidence_override, active, notes, created_at, updated_at
       FROM fiscal_sped_calibrator_rules
       ${whereClause}
       ORDER BY client_id NULLS FIRST, pattern ASC`,
      params,
      false
    );
    return result.rows;
  }

  async findCalibratorRuleById(id: string): Promise<SpedCalibratorRuleRow | null> {
    const result = await this.query<SpedCalibratorRuleRow>(
      `SELECT id, client_id, pattern, target_module, target_kind, target_field, confidence_override, active, notes, created_at, updated_at
       FROM fiscal_sped_calibrator_rules
       WHERE id = $1`,
      [id],
      false
    );
    return result.rows[0] || null;
  }

  async createCalibratorRule(data: CreateSpedCalibratorRuleData): Promise<SpedCalibratorRuleRow> {
    const result = await this.query<SpedCalibratorRuleRow>(
      `INSERT INTO fiscal_sped_calibrator_rules
       (client_id, pattern, target_module, target_kind, target_field, confidence_override, active, notes)
       VALUES ($1, $2, 'simulador_in2306', $3, $4, $5, $6, $7)
       RETURNING id, client_id, pattern, target_module, target_kind, target_field, confidence_override, active, notes, created_at, updated_at`,
      [
        data.client_id || null,
        data.pattern,
        data.target_kind,
        data.target_field,
        data.confidence_override ?? null,
        data.active ?? true,
        data.notes ?? null,
      ],
      false
    );
    return result.rows[0];
  }

  async updateCalibratorRule(id: string, data: UpdateSpedCalibratorRuleData): Promise<SpedCalibratorRuleRow> {
    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;
    if (data.pattern !== undefined) {
      updates.push(`pattern = $${idx++}`);
      params.push(data.pattern);
    }
    if (data.target_kind !== undefined) {
      updates.push(`target_kind = $${idx++}`);
      params.push(data.target_kind);
    }
    if (data.target_field !== undefined) {
      updates.push(`target_field = $${idx++}`);
      params.push(data.target_field);
    }
    if (data.confidence_override !== undefined) {
      updates.push(`confidence_override = $${idx++}`);
      params.push(data.confidence_override);
    }
    if (data.active !== undefined) {
      updates.push(`active = $${idx++}`);
      params.push(data.active);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${idx++}`);
      params.push(data.notes);
    }
    if (updates.length === 0) {
      const existing = await this.findCalibratorRuleById(id);
      if (!existing) {
        throw new Error('RULE_NOT_FOUND');
      }
      return existing;
    }
    params.push(id);
    const result = await this.query<SpedCalibratorRuleRow>(
      `UPDATE fiscal_sped_calibrator_rules
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${idx}
       RETURNING id, client_id, pattern, target_module, target_kind, target_field, confidence_override, active, notes, created_at, updated_at`,
      params,
      false
    );
    return result.rows[0];
  }

  async deleteCalibratorRule(id: string): Promise<void> {
    await this.query('DELETE FROM fiscal_sped_calibrator_rules WHERE id = $1', [id], false);
  }

  /**
   * Competências YYYY-MM com ao menos um arquivo fiscal processado e extração
   * `module_prefill_simulador_in2306` para o cliente.
   */
  async listDistinctSimuladorPrefillCompetences(clientId: string): Promise<string[]> {
    const result = await this.query<{ competence: string }>(
      `SELECT DISTINCT ff.competence
       FROM extracted_fiscal_data efd
       INNER JOIN fiscal_files ff ON ff.id = efd.fiscal_file_id
       WHERE efd.client_id = $1
         AND efd.data_type = 'module_prefill_simulador_in2306'
         AND ff.status = 'processed'
         AND ff.competence IS NOT NULL
         AND ff.competence ~ '^\\d{4}-\\d{2}$'
       ORDER BY ff.competence DESC`,
      [clientId],
      false
    );
    return result.rows.map((r) => r.competence);
  }

  /**
   * Última extração do prefill do simulador IN 2.306 para cliente + competência
   * (por `extracted_fiscal_data.competence` ou `fiscal_files.competence` do arquivo).
   */
  async findLatestSimuladorIn2306PrefillByCompetence(
    clientId: string,
    competence: string
  ): Promise<ExtractedFiscalDataRow | null> {
    const result = await this.query<ExtractedFiscalDataRow>(
      `SELECT efd.id, efd.fiscal_file_id, efd.client_id, efd.data_type, efd.competence, efd.data, efd.created_at
       FROM extracted_fiscal_data efd
       WHERE efd.client_id = $1
         AND efd.data_type = 'module_prefill_simulador_in2306'
         AND (
           efd.competence = $2
           OR efd.fiscal_file_id IN (
             SELECT ff.id FROM fiscal_files ff
             WHERE ff.client_id = $1
               AND ff.competence = $2
               AND ff.status = 'processed'
           )
         )
       ORDER BY efd.created_at DESC
       LIMIT 1`,
      [clientId, competence],
      false
    );
    return result.rows[0] || null;
  }

  /** Arquivos processados da competência que possuem linha de prefill do simulador (auditoria). */
  async listProcessedFiscalFilesWithSimuladorPrefill(options: {
    client_id: string;
    competence: string;
    limit?: number;
  }): Promise<Array<{ id: string; file_name: string; created_at: Date }>> {
    const limit = options.limit ?? 50;
    const result = await this.query<{ id: string; file_name: string; created_at: Date }>(
      `SELECT id, file_name, created_at FROM (
         SELECT DISTINCT ON (ff.id) ff.id, ff.file_name, ff.created_at
         FROM fiscal_files ff
         INNER JOIN extracted_fiscal_data efd ON efd.fiscal_file_id = ff.id
         WHERE ff.client_id = $1
           AND ff.competence = $2
           AND ff.status = 'processed'
           AND efd.data_type = 'module_prefill_simulador_in2306'
         ORDER BY ff.id, efd.created_at DESC
       ) sub
       ORDER BY sub.created_at DESC
       LIMIT $3`,
      [options.client_id, options.competence, limit],
      false
    );
    return result.rows;
  }
}
