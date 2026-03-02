import { BaseRepository } from '../../shared/repositories/base.repository';
export interface EditalDB {
    id: string;
    code: string;
    name: string;
    description: string | null;
    start_date: Date;
    end_date: Date;
    extended: boolean;
    modality: string;
    payment_terms: any;
    discount_rules: any;
    eligibility: any;
    notes: string | null;
    official_link: string | null;
    active: boolean;
    created_at: Date;
    updated_at: Date;
    created_by: string | null;
}
export interface CreateEditalData {
    code: string;
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    extended?: boolean;
    modality: string;
    payment_terms: any;
    discount_rules: any;
    eligibility: any;
    notes?: string;
    official_link?: string;
    active?: boolean;
    created_by?: string;
}
export interface UpdateEditalData {
    name?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    extended?: boolean;
    modality?: string;
    payment_terms?: any;
    discount_rules?: any;
    eligibility?: any;
    notes?: string;
    official_link?: string;
    active?: boolean;
}
export declare class EditalRepository extends BaseRepository {
    /**
     * Buscar edital por ID
     * NOTA: Editais são globais, não requerem company_id
     */
    findById(id: string): Promise<EditalDB | null>;
    /**
     * Buscar edital por código
     */
    findByCode(code: string): Promise<EditalDB | null>;
    /**
     * Listar editais (com filtros opcionais)
     */
    list(options?: {
        modality?: string;
        active?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{
        editais: EditalDB[];
        total: number;
    }>;
    /**
     * Criar novo edital
     */
    create(data: CreateEditalData): Promise<EditalDB>;
    /**
     * Atualizar edital
     */
    update(id: string, data: UpdateEditalData): Promise<EditalDB | null>;
    /**
     * Deletar edital
     */
    delete(id: string): Promise<boolean>;
    /**
     * Buscar editais ativos (dentro do prazo)
     */
    findActive(date?: string): Promise<EditalDB[]>;
}
//# sourceMappingURL=edital.repository.d.ts.map