import { BaseRepository } from '../../shared/repositories/base.repository';
export interface FiscalFile {
    id: string;
    client_id: string;
    file_type: 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros';
    competence: string;
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
export declare class FiscalFileRepository extends BaseRepository {
    /**
     * Buscar arquivo por ID
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    findById(id: string): Promise<FiscalFile | null>;
    /**
     * Criar registro de arquivo fiscal
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    create(data: CreateFiscalFileData): Promise<FiscalFile>;
    /**
     * Atualizar arquivo fiscal
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    update(id: string, data: UpdateFiscalFileData): Promise<FiscalFile>;
    /**
     * Deletar arquivo fiscal
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    delete(id: string): Promise<void>;
    /**
     * Listar arquivos por cliente e/ou competência
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    list(options: {
        client_id?: string;
        competence?: string;
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        files: FiscalFile[];
        total: number;
    }>;
    /**
     * Buscar arquivos por cliente
     * NOTA: Schema já isola por tenant, não precisa company_id
     */
    findByClient(clientId: string): Promise<FiscalFile[]>;
}
//# sourceMappingURL=fiscal-file.repository.d.ts.map