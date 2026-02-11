import { BaseRepository } from '../../shared/repositories/base.repository';
import type { JudicialProcess, LegalThesis } from '@shared/core';

export interface CreateJudicialProcessData {
  client_id: string;
  process_number: string;
  court?: string;
  legal_thesis: LegalThesis;
  case_value?: number;
  start_date?: string; // YYYY-MM-DD
  status?: 'active' | 'suspended' | 'closed';
  notes?: string;
}

export interface UpdateJudicialProcessData {
  process_number?: string;
  court?: string;
  legal_thesis?: LegalThesis;
  case_value?: number;
  start_date?: string;
  status?: 'active' | 'suspended' | 'closed';
  notes?: string;
}

export class JudicialProcessRepository extends BaseRepository {
  /**
   * Buscar processo por ID
   * NOTA: Schema já isola por tenant, não precisa company_id
   */
  async findById(id: string): Promise<JudicialProcess | null> {
    const result = await this.query<JudicialProcess>(
      `SELECT id, client_id, process_number, court, legal_thesis, 
              case_value, start_date, status, notes, 
              created_at, updated_at 
       FROM judicial_processes WHERE id = $1`,
      [id],
      false // Não requer company_id (isolado por schema)
    );
    return result.rows[0] || null;
  }

  /**
   * Listar processos de um cliente
   */
  async findByClientId(clientId: string): Promise<JudicialProcess[]> {
    const result = await this.query<JudicialProcess>(
      `SELECT id, client_id, process_number, court, legal_thesis, 
              case_value, start_date, status, notes, 
              created_at, updated_at 
       FROM judicial_processes 
       WHERE client_id = $1 
       ORDER BY created_at DESC`,
      [clientId],
      false
    );
    return result.rows;
  }

  /**
   * Buscar processos ativos por cliente e tese
   */
  async findActiveByClientAndThesis(
    clientId: string,
    legalThesis: LegalThesis
  ): Promise<JudicialProcess[]> {
    const result = await this.query<JudicialProcess>(
      `SELECT id, client_id, process_number, court, legal_thesis, 
              case_value, start_date, status, notes, 
              created_at, updated_at 
       FROM judicial_processes 
       WHERE client_id = $1 
         AND legal_thesis = $2 
         AND status = 'active'
       ORDER BY created_at DESC`,
      [clientId, legalThesis],
      false
    );
    return result.rows;
  }

  /**
   * Verificar se cliente tem processos ativos para uma tese específica
   */
  async hasActiveProcessForThesis(
    clientId: string,
    legalThesis: LegalThesis
  ): Promise<boolean> {
    const result = await this.query<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM judicial_processes 
       WHERE client_id = $1 
         AND legal_thesis = $2 
         AND status = 'active'`,
      [clientId, legalThesis],
      false
    );
    return parseInt(result.rows[0]?.count || '0', 10) > 0;
  }

  /**
   * Criar processo judicial
   */
  async create(data: CreateJudicialProcessData): Promise<JudicialProcess> {
    const result = await this.query<JudicialProcess>(
      `INSERT INTO judicial_processes 
       (client_id, process_number, court, legal_thesis, case_value, start_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, client_id, process_number, court, legal_thesis, 
                 case_value, start_date, status, notes, 
                 created_at, updated_at`,
      [
        data.client_id,
        data.process_number,
        data.court || null,
        data.legal_thesis,
        data.case_value || null,
        data.start_date || null,
        data.status || 'active',
        data.notes || null,
      ],
      false
    );
    return result.rows[0];
  }

  /**
   * Atualizar processo judicial
   */
  async update(id: string, data: UpdateJudicialProcessData): Promise<JudicialProcess> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.process_number !== undefined) {
      updates.push(`process_number = $${paramIndex++}`);
      values.push(data.process_number);
    }
    if (data.court !== undefined) {
      updates.push(`court = $${paramIndex++}`);
      values.push(data.court || null);
    }
    if (data.legal_thesis !== undefined) {
      updates.push(`legal_thesis = $${paramIndex++}`);
      values.push(data.legal_thesis);
    }
    if (data.case_value !== undefined) {
      updates.push(`case_value = $${paramIndex++}`);
      values.push(data.case_value || null);
    }
    if (data.start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      values.push(data.start_date || null);
    }
    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(data.notes || null);
    }

    if (updates.length === 0) {
      // Nenhuma atualização, retornar registro atual
      const current = await this.findById(id);
      if (!current) {
        throw new Error('Process not found');
      }
      return current;
    }

    values.push(id);
    const result = await this.query<JudicialProcess>(
      `UPDATE judicial_processes 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}
       RETURNING id, client_id, process_number, court, legal_thesis, 
                 case_value, start_date, status, notes, 
                 created_at, updated_at`,
      values,
      false
    );

    if (result.rows.length === 0) {
      throw new Error('Process not found');
    }

    return result.rows[0];
  }

  /**
   * Deletar processo judicial
   */
  async delete(id: string): Promise<void> {
    const result = await this.query(
      `DELETE FROM judicial_processes WHERE id = $1`,
      [id],
      false
    );
    if (result.rowCount === 0) {
      throw new Error('Process not found');
    }
  }
}
