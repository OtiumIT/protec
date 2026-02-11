import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../utils/error-handler';

/**
 * Storage Service
 * Gerencia upload, download e exclusão de arquivos no Supabase Storage
 * Isolamento multitenant: estrutura {company_id}/{client_id}/{competence}/{filename}
 */

let supabaseClient: SupabaseClient | null = null;

/**
 * Inicializar cliente Supabase Storage
 */
function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_KEY');
    
    throw new AppError(
      `Missing required environment variables: ${missing.join(', ')}. Please configure them in your .env file.`,
      'STORAGE_CONFIG_ERROR',
      500
    );
  }

  // Validar formato básico da URL
  if (!supabaseUrl.startsWith('http://') && !supabaseUrl.startsWith('https://')) {
    throw new AppError(
      `Invalid SUPABASE_URL format. Expected URL starting with http:// or https://`,
      'STORAGE_CONFIG_ERROR',
      500
    );
  }

  // Validar formato básico da service key (JWT)
  if (!supabaseServiceKey.startsWith('eyJ')) {
    throw new AppError(
      `Invalid SUPABASE_SERVICE_KEY format. Expected a JWT token starting with 'eyJ'. Please verify your service role key.`,
      'STORAGE_CONFIG_ERROR',
      500
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

/**
 * Bucket padrão para arquivos fiscais
 */
const FISCAL_FILES_BUCKET = 'fiscal-files';

/**
 * Cache para verificar se já garantimos que o bucket existe nesta execução
 */
let bucketChecked = false;

/**
 * Garantir que o bucket existe, criando-o se necessário
 * @returns true se o bucket existe ou foi criado com sucesso
 */
async function ensureBucketExists(): Promise<boolean> {
  // Se já verificamos nesta execução, pular (otimização)
  if (bucketChecked) {
    return true;
  }
  const supabase = getSupabaseClient();

  try {
    // Verificar se o bucket existe
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      // Se não conseguir listar buckets, pode ser problema de permissão
      console.error('Error listing buckets:', listError);
      throw new AppError(
        `Error accessing storage: ${listError.message || JSON.stringify(listError)}`,
        'STORAGE_ACCESS_ERROR',
        500
      );
    }

    const bucketExists = buckets?.some((b) => b.name === FISCAL_FILES_BUCKET);
    
    if (bucketExists) {
      bucketChecked = true;
      return true;
    }

    // Bucket não existe, tentar criar
    console.log(`Bucket '${FISCAL_FILES_BUCKET}' não encontrado. Tentando criar...`);
    
    const { data, error: createError } = await supabase.storage.createBucket(FISCAL_FILES_BUCKET, {
      public: false, // Bucket privado (usa signed URLs)
      fileSizeLimit: 52428800, // 50MB
      allowedMimeTypes: ['text/plain', 'application/xml', 'text/xml', 'application/pdf'],
    });

    if (createError) {
      // Se não conseguir criar, pode ser problema de permissão ou bucket já existe
      const errorMsg = createError.message || JSON.stringify(createError);
      
      // Se o erro for que o bucket já existe (race condition), tudo bem
      if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
        console.log(`Bucket '${FISCAL_FILES_BUCKET}' já existe (criado por outro processo)`);
        bucketChecked = true;
        return true;
      }

      throw new AppError(
        `Failed to create bucket '${FISCAL_FILES_BUCKET}': ${errorMsg}. Please verify SUPABASE_SERVICE_KEY has storage admin permissions.`,
        'BUCKET_CREATE_ERROR',
        500
      );
    }

    console.log(`✅ Bucket '${FISCAL_FILES_BUCKET}' criado com sucesso`);
    bucketChecked = true;
    return true;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      `Error ensuring bucket exists: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'BUCKET_SETUP_ERROR',
      500
    );
  }
}

/**
 * Upload de arquivo para Supabase Storage
 * @param companyId - ID da contabilidade (tenant)
 * @param clientId - ID do cliente
 * @param competence - Competência no formato YYYY-MM
 * @param file - Buffer do arquivo
 * @param fileName - Nome do arquivo
 * @param mimeType - Tipo MIME do arquivo
 * @returns Path do arquivo no storage
 */
export async function uploadFile(
  companyId: string,
  clientId: string,
  competence: string,
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  const supabase = getSupabaseClient();

  // Validar formato de competência (YYYY-MM)
  if (!/^\d{4}-\d{2}$/.test(competence)) {
    throw new AppError('Invalid competence format. Expected YYYY-MM', 'INVALID_COMPETENCE', 400);
  }

  // Path no storage: {company_id}/{client_id}/{competence}/{filename}
  const filePath = `${companyId}/${clientId}/${competence}/${fileName}`;

  try {
    // Garantir que o bucket existe (criar se necessário)
    await ensureBucketExists();

    const { data, error } = await supabase.storage
      .from(FISCAL_FILES_BUCKET)
      .upload(filePath, file, {
        contentType: mimeType,
        upsert: false, // Não sobrescrever arquivos existentes
      });

    if (error) {
      // Capturar mensagem de erro de forma mais robusta
      let errorMessage = 'Unknown error';
      let errorDetails: any = null;
      
      // Tentar extrair mensagem de diferentes propriedades do erro do Supabase
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object') {
        // O erro do Supabase pode ter diferentes estruturas
        const errorObj = error as any;
        errorMessage = errorObj.message || 
                      errorObj.error || 
                      errorObj.statusText ||
                      errorObj.statusCode?.toString() ||
                      'Unknown error';
        
        // Capturar detalhes completos para debug
        errorDetails = {
          ...errorObj,
          toString: errorObj.toString?.() || String(errorObj),
        };
      }

      // Log do erro completo em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.error('Supabase Storage Error:', {
          error,
          errorMessage,
          errorDetails,
          filePath,
          bucket: FISCAL_FILES_BUCKET,
        });
      }

      // Mensagens de erro mais específicas
      const errorStr = errorMessage.toLowerCase();
      
      if (errorStr.includes('already exists') || errorStr.includes('duplicate')) {
        throw new AppError(
          `File already exists: ${fileName}`,
          'FILE_ALREADY_EXISTS',
          409
        );
      }

      if (errorStr.includes('not found') || errorStr.includes('bucket') || errorStr.includes('does not exist')) {
        throw new AppError(
          `Storage bucket '${FISCAL_FILES_BUCKET}' not found or not accessible. Please run the setup script to create it: cd apps/api && pnpm run setup`,
          'BUCKET_NOT_FOUND',
          500
        );
      }

      if (errorStr.includes('permission') || errorStr.includes('unauthorized') || errorStr.includes('forbidden')) {
        throw new AppError(
          `Permission denied. Please verify SUPABASE_SERVICE_KEY is correctly configured in your .env file.`,
          'STORAGE_PERMISSION_ERROR',
          500
        );
      }

      // Se o erro não tem mensagem útil, usar detalhes completos
      if (errorMessage === 'Unknown error' && errorDetails) {
        errorMessage = JSON.stringify(errorDetails);
      }

      throw new AppError(
        `Error uploading file: ${errorMessage}`,
        'STORAGE_UPLOAD_ERROR',
        500
      );
    }

    return filePath;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    // Capturar erro de forma mais robusta
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message || error.toString();
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    throw new AppError(
      `Failed to upload file: ${errorMessage}`,
      'STORAGE_UPLOAD_ERROR',
      500
    );
  }
}

/**
 * Obter URL pública do arquivo
 * @param filePath - Path do arquivo no storage
 * @returns URL pública do arquivo
 */
export async function getFileUrl(filePath: string): Promise<string> {
  const supabase = getSupabaseClient();

  const { data } = supabase.storage.from(FISCAL_FILES_BUCKET).getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Gerar URL assinada (signed URL) para download temporário
 * @param filePath - Path do arquivo no storage
 * @param expiresIn - Tempo de expiração em segundos (padrão: 1 hora)
 * @returns URL assinada
 */
export async function generateSignedUrl(
  filePath: string,
  expiresIn: number = 3600
): Promise<string> {
  const supabase = getSupabaseClient();
  
  // Garantir que o bucket existe
  await ensureBucketExists();

  const { data, error } = await supabase.storage
    .from(FISCAL_FILES_BUCKET)
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    throw new AppError(
      `Error generating signed URL: ${error.message}`,
      'STORAGE_SIGNED_URL_ERROR',
      500
    );
  }

  return data.signedUrl;
}

/**
 * Deletar arquivo do storage
 * @param filePath - Path do arquivo no storage
 */
export async function deleteFile(filePath: string): Promise<void> {
  const supabase = getSupabaseClient();
  
  // Garantir que o bucket existe
  await ensureBucketExists();

  const { error } = await supabase.storage.from(FISCAL_FILES_BUCKET).remove([filePath]);

  if (error) {
    throw new AppError(
      `Error deleting file: ${error.message}`,
      'STORAGE_DELETE_ERROR',
      500
    );
  }
}

/**
 * Verificar se arquivo existe
 * @param filePath - Path do arquivo no storage
 * @returns true se arquivo existe
 */
export async function fileExists(filePath: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  
  // Garantir que o bucket existe
  await ensureBucketExists();

  const { data, error } = await supabase.storage
    .from(FISCAL_FILES_BUCKET)
    .list(filePath.split('/').slice(0, -1).join('/'), {
      search: filePath.split('/').pop(),
    });

  if (error) {
    return false;
  }

  return data && data.length > 0;
}

/**
 * Obter metadados do arquivo
 * @param filePath - Path do arquivo no storage
 * @returns Metadados do arquivo
 */
export async function getFileMetadata(filePath: string): Promise<{
  size: number;
  mimeType: string;
  lastModified: Date;
}> {
  const supabase = getSupabaseClient();
  
  // Garantir que o bucket existe
  await ensureBucketExists();

  const { data, error } = await supabase.storage
    .from(FISCAL_FILES_BUCKET)
    .list(filePath.split('/').slice(0, -1).join('/'), {
      search: filePath.split('/').pop(),
    });

  if (error || !data || data.length === 0) {
    throw new AppError('File not found', 'FILE_NOT_FOUND', 404);
  }

  const file = data[0];

  return {
    size: file.metadata?.size || 0,
    mimeType: file.metadata?.mimetype || 'application/octet-stream',
    lastModified: new Date(file.updated_at || file.created_at),
  };
}
