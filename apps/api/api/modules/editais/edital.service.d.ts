import { EditalRepository, type CreateEditalData, type UpdateEditalData } from './edital.repository';
export declare class EditalService {
    private editalRepo;
    constructor(editalRepo: EditalRepository);
    /**
     * Listar editais
     */
    list(options?: {
        modality?: string;
        active?: boolean;
        page?: number;
        limit?: number;
    }): Promise<{
        editais: import("./edital.repository").EditalDB[];
        total: number;
    }>;
    /**
     * Buscar edital por ID
     */
    findById(id: string): Promise<import("./edital.repository").EditalDB>;
    /**
     * Buscar edital por código
     */
    findByCode(code: string): Promise<import("./edital.repository").EditalDB>;
    /**
     * Criar novo edital
     */
    create(data: CreateEditalData, userId?: string): Promise<import("./edital.repository").EditalDB>;
    /**
     * Atualizar edital
     */
    update(id: string, data: UpdateEditalData): Promise<import("./edital.repository").EditalDB | null>;
    /**
     * Deletar edital
     */
    delete(id: string): Promise<{
        success: boolean;
    }>;
    /**
     * Buscar editais ativos
     */
    findActive(date?: string): Promise<import("./edital.repository").EditalDB[]>;
}
//# sourceMappingURL=edital.service.d.ts.map