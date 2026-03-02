"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IrpfAltaRendaRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class IrpfAltaRendaRepository extends base_repository_1.BaseRepository {
    async findById(id) {
        const result = await this.query(`SELECT id, company_id, ano, contribuinte_nome, contribuinte_cpf,
              rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
              resultado_simulacao, payload_json, title, created_by, created_at, updated_at
       FROM irpf_alta_renda WHERE id = $1`, [id], false);
        const row = result.rows[0];
        if (!row)
            return null;
        return this.mapRow(row);
    }
    async create(data) {
        const result = await this.query(`INSERT INTO irpf_alta_renda (
         company_id, ano, contribuinte_nome, contribuinte_cpf,
         rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
         resultado_simulacao, payload_json, title, created_by
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, company_id, ano, contribuinte_nome, contribuinte_cpf,
                 rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
                 resultado_simulacao, payload_json, title, created_by, created_at, updated_at`, [
            data.company_id,
            data.ano,
            data.contribuinte_nome,
            data.contribuinte_cpf,
            data.rendimentos_tributaveis,
            JSON.stringify(data.dados_dividendos),
            data.base_calculo_combinada,
            JSON.stringify(data.resultado_simulacao),
            data.payload_json ? JSON.stringify(data.payload_json) : null,
            data.title ?? null,
            data.created_by ?? null,
        ], false);
        return this.mapRow(result.rows[0]);
    }
    async update(id, data) {
        const result = await this.query(`UPDATE irpf_alta_renda SET
         company_id = $2, ano = $3, contribuinte_nome = $4, contribuinte_cpf = $5,
         rendimentos_tributaveis = $6, dados_dividendos = $7, base_calculo_combinada = $8,
         resultado_simulacao = $9, payload_json = $10, title = $11, updated_at = NOW()
       WHERE id = $1
       RETURNING id, company_id, ano, contribuinte_nome, contribuinte_cpf,
                 rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
                 resultado_simulacao, payload_json, title, created_by, created_at, updated_at`, [
            id,
            data.company_id ?? null,
            data.ano,
            data.contribuinte_nome,
            data.contribuinte_cpf,
            data.rendimentos_tributaveis,
            JSON.stringify(data.dados_dividendos),
            data.base_calculo_combinada,
            JSON.stringify(data.resultado_simulacao),
            JSON.stringify(data.payload_json),
            data.title ?? null,
        ], false);
        const row = result.rows[0];
        if (!row)
            throw new Error('IRPF_ALTA_RENDA_NOT_FOUND');
        return this.mapRow(row);
    }
    async delete(id) {
        await this.query('DELETE FROM irpf_alta_renda WHERE id = $1', [id], false);
    }
    async list(options) {
        const page = options.page ?? 1;
        const limit = options.limit ?? 20;
        const offset = (page - 1) * limit;
        const params = [];
        const conditions = [];
        if (options.company_id) {
            conditions.push(`company_id = $${params.length + 1}`);
            params.push(options.company_id);
        }
        if (options.ano != null) {
            conditions.push(`ano = $${params.length + 1}`);
            params.push(options.ano);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
        const countResult = await this.query(`SELECT COUNT(*) as count FROM irpf_alta_renda ${whereClause}`, params, false);
        const total = parseInt(countResult.rows[0].count, 10);
        const listResult = await this.query(`SELECT id, company_id, ano, contribuinte_nome, contribuinte_cpf,
              rendimentos_tributaveis, dados_dividendos, base_calculo_combinada,
              resultado_simulacao, payload_json, title, created_by, created_at, updated_at
       FROM irpf_alta_renda ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset], false);
        return {
            items: listResult.rows.map((r) => this.mapRow(r)),
            total,
        };
    }
    mapRow(row) {
        return {
            ...row,
            rendimentos_tributaveis: Number(row.rendimentos_tributaveis),
            base_calculo_combinada: Number(row.base_calculo_combinada),
            dados_dividendos: Array.isArray(row.dados_dividendos) ? row.dados_dividendos : [],
            payload_json: row.payload_json != null && typeof row.payload_json === 'object' ? row.payload_json : null,
        };
    }
}
exports.IrpfAltaRendaRepository = IrpfAltaRendaRepository;
