import { BaseRepository } from '../../shared/repositories/base.repository';
import type { RatingValidation } from '@shared/core';

export interface CreateRatingValidationData {
  client_id: string;
  competence: string; // YYYY-MM
  fiscal_file_id?: string | null;
  is_simulation: boolean;
  input_data: Record<string, any>;
  calculated_values?: Record<string, any> | null;
  liquidez_corrente?: number | null;
  liquidez_geral?: number | null;
  solvencia?: number | null;
  rating_estimado: 'A' | 'B' | 'C' | 'D';
  rating_real?: 'A' | 'B' | 'C' | 'D' | null;
  has_discrepancy: boolean;
  discrepancy_details?: Record<string, any> | null;
  parcelamento_pgfn?: Record<string, any> | null;
  comparativo_parcelamento?: Record<string, any> | null;
  created_by?: string | null;
}

export interface UpdateRatingValidationData {
  rating_real?: 'A' | 'B' | 'C' | 'D' | null;
  has_discrepancy?: boolean;
  discrepancy_details?: Record<string, any> | null;
}

export interface FullUpdateRatingValidationData {
  client_id?: string;
  competence: string;
  input_data: Record<string, any>;
  calculated_values?: Record<string, any> | null;
  liquidez_corrente?: number | null;
  liquidez_geral?: number | null;
  solvencia?: number | null;
  rating_estimado: 'A' | 'B' | 'C' | 'D';
  rating_real?: 'A' | 'B' | 'C' | 'D' | null;
  has_discrepancy: boolean;
  discrepancy_details?: Record<string, any> | null;
  parcelamento_pgfn?: Record<string, any> | null;
  comparativo_parcelamento?: Record<string, any> | null;
}

export interface ProcessedEcdFiscalFileRow {
  id: string;
  client_id: string;
  competence: string;
  file_name: string;
  created_at: Date;
}

/** Linha completa de extracted_fiscal_data (competência / consolidação). */
export interface ExtractedFiscalDataRow {
  id: string;
  data_type: string;
  data: Record<string, any>;
  fiscal_file_id: string;
  created_at: Date;
}

export class RatingValidatorRepository extends BaseRepository {
  /**
   * Buscar validação por ID
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findById(id: string): Promise<RatingValidation | null> {
    const result = await this.query<RatingValidation>(
      `SELECT rv.id, rv.client_id, rv.competence, rv.fiscal_file_id, rv.is_simulation,
              rv.input_data, rv.calculated_values, rv.liquidez_corrente, rv.liquidez_geral, rv.solvencia,
              rv.rating_estimado, rv.rating_real, rv.has_discrepancy, rv.discrepancy_details,
              rv.parcelamento_pgfn, rv.comparativo_parcelamento,
              ff.file_name AS fiscal_file_name,
              rv.created_by, rv.created_at, rv.updated_at 
       FROM rating_validations rv
       LEFT JOIN fiscal_files ff ON ff.id = rv.fiscal_file_id
       WHERE rv.id = $1`,
      [id],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }

  /**
   * Criar validação
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async create(data: CreateRatingValidationData): Promise<RatingValidation> {
    const result = await this.query<RatingValidation>(
      `INSERT INTO rating_validations 
       (client_id, competence, fiscal_file_id, is_simulation, input_data, 
        calculated_values, liquidez_corrente, liquidez_geral, solvencia,
        rating_estimado, rating_real, has_discrepancy, discrepancy_details, 
        parcelamento_pgfn, comparativo_parcelamento, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
       RETURNING id, client_id, competence, fiscal_file_id, is_simulation,
                 input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
                 rating_estimado, rating_real, has_discrepancy, discrepancy_details,
                 parcelamento_pgfn, comparativo_parcelamento,
                 created_by, created_at, updated_at`,
      [
        data.client_id,
        data.competence,
        data.fiscal_file_id || null,
        data.is_simulation,
        JSON.stringify(data.input_data),
        data.calculated_values ? JSON.stringify(data.calculated_values) : null,
        data.liquidez_corrente || null,
        data.liquidez_geral || null,
        data.solvencia || null,
        data.rating_estimado,
        data.rating_real || null,
        data.has_discrepancy,
        data.discrepancy_details ? JSON.stringify(data.discrepancy_details) : null,
        data.parcelamento_pgfn ? JSON.stringify(data.parcelamento_pgfn) : null,
        data.comparativo_parcelamento ? JSON.stringify(data.comparativo_parcelamento) : null,
        data.created_by || null,
      ],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }

  /**
   * Atualizar validação
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async update(id: string, data: UpdateRatingValidationData): Promise<RatingValidation> {
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.rating_real !== undefined) {
      updates.push(`rating_real = $${paramIndex++}`);
      params.push(data.rating_real);
    }
    if (data.has_discrepancy !== undefined) {
      updates.push(`has_discrepancy = $${paramIndex++}`);
      params.push(data.has_discrepancy);
    }
    if (data.discrepancy_details !== undefined) {
      updates.push(`discrepancy_details = $${paramIndex++}`);
      params.push(data.discrepancy_details ? JSON.stringify(data.discrepancy_details) : null);
    }

    if (updates.length === 0) {
      return this.findById(id) as Promise<RatingValidation>;
    }

    params.push(id);
    const result = await this.query<RatingValidation>(
      `UPDATE rating_validations 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex} 
       RETURNING id, client_id, competence, fiscal_file_id, is_simulation,
                 input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
                 rating_estimado, rating_real, has_discrepancy, discrepancy_details,
                 parcelamento_pgfn, comparativo_parcelamento,
                 created_by, created_at, updated_at`,
      params,
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0];
  }

  /**
   * Atualização completa da validação (re-simulação)
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async fullUpdate(id: string, data: FullUpdateRatingValidationData): Promise<RatingValidation> {
    const result = await this.query<RatingValidation>(
      `UPDATE rating_validations 
       SET client_id = COALESCE($2, client_id),
           competence = $3,
           input_data = $4,
           calculated_values = $5,
           liquidez_corrente = $6,
           liquidez_geral = $7,
           solvencia = $8,
           rating_estimado = $9,
           rating_real = $10,
           has_discrepancy = $11,
           discrepancy_details = $12,
           parcelamento_pgfn = $13,
           comparativo_parcelamento = $14,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, client_id, competence, fiscal_file_id, is_simulation,
                 input_data, calculated_values, liquidez_corrente, liquidez_geral, solvencia,
                 rating_estimado, rating_real, has_discrepancy, discrepancy_details,
                 parcelamento_pgfn, comparativo_parcelamento,
                 created_by, created_at, updated_at`,
      [
        id,
        data.client_id ?? null,
        data.competence,
        JSON.stringify(data.input_data),
        data.calculated_values ? JSON.stringify(data.calculated_values) : null,
        data.liquidez_corrente ?? null,
        data.liquidez_geral ?? null,
        data.solvencia ?? null,
        data.rating_estimado,
        data.rating_real ?? null,
        data.has_discrepancy,
        data.discrepancy_details ? JSON.stringify(data.discrepancy_details) : null,
        data.parcelamento_pgfn ? JSON.stringify(data.parcelamento_pgfn) : null,
        data.comparativo_parcelamento ? JSON.stringify(data.comparativo_parcelamento) : null,
      ],
      false
    );
    if (result.rows.length === 0) {
      throw new Error('Validation not found');
    }
    return result.rows[0];
  }

  /**
   * Deletar validação
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async delete(id: string): Promise<void> {
    await this.query(
      'DELETE FROM rating_validations WHERE id = $1',
      [id],
      false // Não requer company_id (isolado por schema)
    );
  }

  /**
   * Listar validações com filtros
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async list(options: {
    client_id?: string;
    competence?: string;
    is_simulation?: boolean;
    rating_estimado?: 'A' | 'B' | 'C' | 'D';
    page?: number;
    limit?: number;
  }): Promise<{ validations: RatingValidation[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const params: any[] = [];
    const conditions: string[] = [];

    if (options.client_id) {
      conditions.push(`rv.client_id = $${params.length + 1}`);
      params.push(options.client_id);
    }
    if (options.competence) {
      conditions.push(`rv.competence = $${params.length + 1}`);
      params.push(options.competence);
    }
    if (options.is_simulation !== undefined) {
      conditions.push(`rv.is_simulation = $${params.length + 1}`);
      params.push(options.is_simulation);
    }
    if (options.rating_estimado) {
      conditions.push(`rv.rating_estimado = $${params.length + 1}`);
      params.push(options.rating_estimado);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Buscar total
    const countResult = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM rating_validations rv ${whereClause}`,
      params,
      false // Não requer company_id (isolado por schema)
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Buscar validações
    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;
    const validationsResult = await this.query<RatingValidation>(
      `SELECT rv.id, rv.client_id, rv.competence, rv.fiscal_file_id, rv.is_simulation,
              rv.input_data, rv.calculated_values, rv.liquidez_corrente, rv.liquidez_geral, rv.solvencia,
              rv.rating_estimado, rv.rating_real, rv.has_discrepancy, rv.discrepancy_details,
              rv.parcelamento_pgfn, rv.comparativo_parcelamento,
              ff.file_name AS fiscal_file_name,
              rv.created_by, rv.created_at, rv.updated_at 
       FROM rating_validations rv
       LEFT JOIN fiscal_files ff ON ff.id = rv.fiscal_file_id
       ${whereClause}
       ORDER BY rv.created_at DESC 
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...params, limit, offset],
      false // Não requer company_id (isolado por schema)
    );

    return {
      validations: validationsResult.rows,
      total,
    };
  }

  /**
   * Buscar dados extraídos de ECD (Balanço e DRE)
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findExtractedFiscalData(
    clientId: string,
    competence: string,
    dataTypes: string[]
  ): Promise<Array<{ data_type: string; data: Record<string, any> }>> {
    const placeholders = dataTypes.map((_, i) => `$${i + 3}`).join(', ');
    const result = await this.query<{ data_type: string; data: Record<string, any> }>(
      `SELECT data_type, data 
       FROM extracted_fiscal_data 
       WHERE client_id = $1 AND competence = $2 AND data_type IN (${placeholders})
       ORDER BY created_at DESC`,
      [clientId, competence, ...dataTypes],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows;
  }

  /**
   * Buscar dados extraídos por fiscal_file_id.
   */
  async findExtractedFiscalDataByFiscalFileId(
    fiscalFileId: string,
    dataTypes: string[]
  ): Promise<Array<{ data_type: string; data: Record<string, any>; fiscal_file_id: string; created_at: Date }>> {
    const placeholders = dataTypes.map((_, i) => `$${i + 2}`).join(', ');
    const result = await this.query<{
      data_type: string;
      data: Record<string, any>;
      fiscal_file_id: string;
      created_at: Date;
    }>(
      `SELECT data_type, data, fiscal_file_id, created_at
       FROM extracted_fiscal_data
       WHERE fiscal_file_id = $1 AND data_type IN (${placeholders})
       ORDER BY created_at DESC`,
      [fiscalFileId, ...dataTypes],
      false
    );
    return result.rows;
  }

  /**
   * Todas as linhas extraídos da competência (ordenadas do mais recente ao mais antigo).
   * Consolidação “último por data_type” deve ser feita no service.
   */
  async findExtractedFiscalDataRowsByCompetence(
    clientId: string,
    competence: string,
    dataTypes: string[]
  ): Promise<ExtractedFiscalDataRow[]> {
    const placeholders = dataTypes.map((_, i) => `$${i + 3}`).join(', ');
    const result = await this.query<ExtractedFiscalDataRow>(
      `SELECT id, data_type, data, fiscal_file_id, created_at
       FROM extracted_fiscal_data
       WHERE client_id = $1
         AND data_type IN (${placeholders})
         AND (
           competence = $2
           OR fiscal_file_id IN (
             SELECT ff.id
             FROM fiscal_files ff
             WHERE ff.client_id = $1
               AND ff.competence = $2
               AND ff.file_type = 'ecd'
               AND ff.status = 'processed'
           )
         )
       ORDER BY created_at DESC`,
      [clientId, competence, ...dataTypes],
      false
    );
    return result.rows;
  }

  /**
   * Lista arquivos ECD processados elegíveis para validação real.
   */
  async listProcessedEcdFiscalFiles(options: {
    client_id?: string;
    competence?: string;
    limit?: number;
  }): Promise<ProcessedEcdFiscalFileRow[]> {
    const params: any[] = [];
    const conditions: string[] = [`ff.file_type = 'ecd'`, `ff.status = 'processed'`];

    if (options.client_id) {
      conditions.push(`ff.client_id = $${params.length + 1}`);
      params.push(options.client_id);
    }
    if (options.competence) {
      conditions.push(`ff.competence = $${params.length + 1}`);
      params.push(options.competence);
    }

    const limit = options.limit ?? 50;
    const limitParam = params.length + 1;
    const result = await this.query<ProcessedEcdFiscalFileRow>(
      `SELECT ff.id, ff.client_id, ff.competence, ff.file_name, ff.created_at
       FROM fiscal_files ff
       WHERE ${conditions.join(' AND ')}
       ORDER BY ff.created_at DESC
       LIMIT $${limitParam}`,
      [...params, limit],
      false
    );
    return result.rows;
  }

  /**
   * Competências distintas (YYYY-MM) que possuem ao menos um ECD processado para o cliente.
   * Evita o viés de LIMIT + ORDER BY created_at, que pode omitir competências com arquivos mais antigos.
   */
  async listDistinctProcessedEcdCompetences(clientId: string): Promise<string[]> {
    const result = await this.query<{ competence: string }>(
      `SELECT DISTINCT ff.competence
       FROM fiscal_files ff
       WHERE ff.client_id = $1
         AND ff.file_type = 'ecd'
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
   * Buscar validações por cliente
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findByClient(clientId: string): Promise<RatingValidation[]> {
    const result = await this.query<RatingValidation>(
      `SELECT rv.id, rv.client_id, rv.competence, rv.fiscal_file_id, rv.is_simulation,
              rv.input_data, rv.calculated_values, rv.liquidez_corrente, rv.liquidez_geral, rv.solvencia,
              rv.rating_estimado, rv.rating_real, rv.has_discrepancy, rv.discrepancy_details,
              rv.parcelamento_pgfn, rv.comparativo_parcelamento,
              ff.file_name AS fiscal_file_name,
              rv.created_by, rv.created_at, rv.updated_at 
       FROM rating_validations rv
       LEFT JOIN fiscal_files ff ON ff.id = rv.fiscal_file_id
       WHERE rv.client_id = $1 
       ORDER BY rv.competence DESC, rv.created_at DESC`,
      [clientId],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows;
  }
}
