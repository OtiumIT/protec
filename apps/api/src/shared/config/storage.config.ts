/**
 * Configuração do Supabase Storage
 * 
 * Variáveis de ambiente necessárias:
 * - SUPABASE_URL: URL do projeto Supabase
 * - SUPABASE_SERVICE_KEY: Service role key (para operações server-side)
 * 
 * Bucket: fiscal-files
 * Estrutura: {company_id}/{client_id}/{competence}/{filename}
 */

export const STORAGE_CONFIG = {
  bucket: 'fiscal-files',
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: [
    'text/plain', // .txt (SPED, ECD)
    'application/xml', // .xml (PGDAS, Notas)
    'text/xml', // .xml alternativo
    'application/pdf', // .pdf (Extratos)
  ],
  allowedExtensions: ['.txt', '.xml', '.pdf'],
} as const;

/**
 * Validar tipo de arquivo
 */
export function validateFileType(fileName: string, mimeType: string): boolean {
  // Validar extensão
  const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  if (!STORAGE_CONFIG.allowedExtensions.includes(extension as '.txt' | '.xml' | '.pdf')) {
    return false;
  }

  // Validar MIME type
  return STORAGE_CONFIG.allowedMimeTypes.includes(mimeType as 'text/plain' | 'application/xml' | 'text/xml' | 'application/pdf');
}

/**
 * Validar tamanho do arquivo
 */
export function validateFileSize(size: number): boolean {
  return size <= STORAGE_CONFIG.maxFileSize;
}
