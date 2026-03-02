import { FiscalFileRepository, UpdateFiscalFileData, type FiscalFile } from './fiscal-file.repository';
import { ClientRepository } from '../clients/client.repository';
export declare class FiscalFileService {
    private fiscalFileRepo;
    private clientRepo;
    constructor(fiscalFileRepo: FiscalFileRepository, clientRepo: ClientRepository);
    /**
     * Upload de arquivo fiscal
     * @param companyId - ID da contabilidade (necessário apenas para estrutura de pastas no storage)
     * @param clientId - ID do cliente
     * @param userId - ID do usuário que está fazendo upload (para logs)
     * NOTA: Schema já isola por tenant para queries no banco, mas companyId é necessário para estrutura de pastas no storage
     */
    upload(companyId: string, clientId: string, competence: string, fileType: 'sped' | 'ecd' | 'pgdas' | 'xml' | 'pdf' | 'txt' | 'outros', file: Buffer, fileName: string, mimeType: string, userId?: string): Promise<FiscalFile>;
    /**
     * Listar arquivos fiscais
     * NOTA: Schema já isola por tenant, não precisa companyId
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
        page: number;
        limit: number;
    }>;
    /**
     * Buscar arquivo por ID
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    getById(id: string): Promise<FiscalFile>;
    /**
     * Obter URL de download do arquivo
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    getDownloadUrl(id: string, expiresIn?: number): Promise<string>;
    /**
     * Atualizar status do arquivo
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    updateStatus(id: string, data: UpdateFiscalFileData): Promise<FiscalFile>;
    /**
     * Deletar arquivo fiscal
     * @param id - ID do arquivo
     * @param companyId - ID da contabilidade (para logs)
     * @param userId - ID do usuário (para logs)
     * NOTA: Schema já isola por tenant, não precisa companyId nas queries
     */
    delete(id: string, companyId?: string, userId?: string): Promise<void>;
    /**
     * Listar arquivos por cliente
     * NOTA: Schema já isola por tenant, não precisa companyId
     */
    listByClient(clientId: string): Promise<FiscalFile[]>;
}
//# sourceMappingURL=fiscal-file.service.d.ts.map