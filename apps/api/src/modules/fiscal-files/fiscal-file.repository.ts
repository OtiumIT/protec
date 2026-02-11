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

export interface UpdateFiscalFileData {
  status?: 'uploaded' | 'processing' | 'processed' | 'error';
  processing_error?: string | null;
  metadata?: Record<string, any> | null;
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
}
