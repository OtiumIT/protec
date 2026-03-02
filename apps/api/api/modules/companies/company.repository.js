"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyRepository = void 0;
const base_repository_1 = require("../../shared/repositories/base.repository");
class CompanyRepository extends base_repository_1.BaseRepository {
    /**
     * Buscar empresa por ID
     * Nota: Companies não requerem filtro de company_id (são o próprio tenant)
     */
    async findById(id) {
        const result = await this.query(`SELECT id, name, domain, cnpj, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes,
              created_at, updated_at 
       FROM companies WHERE id = $1`, [id], false // Companies não requerem filtro de tenant
        );
        return result.rows[0] || null;
    }
    /**
     * Buscar empresa por domain
     */
    async findByDomain(domain) {
        const result = await this.query(`SELECT id, name, domain, cnpj, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes,
              created_at, updated_at 
       FROM companies WHERE domain = $1`, [domain], false);
        return result.rows[0] || null;
    }
    /**
     * Buscar empresa por CNPJ
     */
    async findByCnpj(cnpj) {
        const result = await this.query(`SELECT id, name, domain, cnpj, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes,
              created_at, updated_at 
       FROM companies WHERE cnpj = $1`, [cnpj], false);
        return result.rows[0] || null;
    }
    /**
     * Criar empresa
     * @param data - Dados da empresa
     * @param client - Client opcional para usar em transação
     */
    async create(data, client) {
        const sql = `INSERT INTO companies (
                   name, domain, cnpj, legal_name, trade_name, email, phone,
                   contact_name, contact_email, contact_phone, tax_regime,
                   state_registration, municipal_registration, cnae,
                   zip_code, address_street, address_number, address_complement,
                   address_neighborhood, address_city, address_state, notes
                 ) 
                 VALUES (
                   $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                   $15, $16, $17, $18, $19, $20, $21, $22
                 ) 
                 RETURNING id, name, domain, cnpj, legal_name, trade_name, email, phone,
                           contact_name, contact_email, contact_phone, tax_regime,
                           state_registration, municipal_registration, cnae,
                           zip_code, address_street, address_number, address_complement,
                           address_neighborhood, address_city, address_state, notes,
                           created_at, updated_at`;
        const params = [
            data.name,
            data.domain || null,
            data.cnpj || null,
            data.legal_name || null,
            data.trade_name || null,
            data.email || null,
            data.phone || null,
            data.contact_name || null,
            data.contact_email || null,
            data.contact_phone || null,
            data.tax_regime || null,
            data.state_registration || null,
            data.municipal_registration || null,
            data.cnae || null,
            data.zip_code || null,
            data.address_street || null,
            data.address_number || null,
            data.address_complement || null,
            data.address_neighborhood || null,
            data.address_city || null,
            data.address_state || null,
            data.notes || null,
        ];
        if (client) {
            const result = await client.query(sql, params);
            return result.rows[0];
        }
        else {
            const result = await this.query(sql, params, false);
            return result.rows[0];
        }
    }
    /**
     * Listar todas as empresas (para super_admin)
     */
    async findAll() {
        const result = await this.query(`SELECT id, name, domain, cnpj, legal_name, trade_name, email, phone,
              contact_name, contact_email, contact_phone, tax_regime,
              state_registration, municipal_registration, cnae,
              zip_code, address_street, address_number, address_complement,
              address_neighborhood, address_city, address_state, notes,
              created_at, updated_at 
       FROM companies ORDER BY created_at DESC`, [], false);
        return result.rows;
    }
    /**
     * Atualizar empresa
     */
    async update(id, data) {
        const updates = [];
        const params = [];
        let paramIndex = 1;
        const fields = [
            'name', 'domain', 'cnpj', 'legal_name', 'trade_name', 'email', 'phone',
            'contact_name', 'contact_email', 'contact_phone', 'tax_regime',
            'state_registration', 'municipal_registration', 'cnae',
            'zip_code', 'address_street', 'address_number', 'address_complement',
            'address_neighborhood', 'address_city', 'address_state', 'notes'
        ];
        for (const field of fields) {
            if (data[field] !== undefined) {
                updates.push(`${field} = $${paramIndex++}`);
                params.push(data[field]);
            }
        }
        if (updates.length === 0) {
            return this.findById(id);
        }
        params.push(id);
        const result = await this.query(`UPDATE companies 
       SET ${updates.join(', ')}, updated_at = NOW() 
       WHERE id = $${paramIndex++} 
       RETURNING id, name, domain, cnpj, legal_name, trade_name, email, phone,
                 contact_name, contact_email, contact_phone, tax_regime,
                 state_registration, municipal_registration, cnae,
                 zip_code, address_street, address_number, address_complement,
                 address_neighborhood, address_city, address_state, notes,
                 created_at, updated_at`, params, false);
        return result.rows[0];
    }
}
exports.CompanyRepository = CompanyRepository;
