import { Context } from 'hono';
import { ZodError } from 'zod';

export interface ApiError {
  error: {
    message: string;
    code: string;
    details?: any;
  };
}

/**
 * Error Handler global
 * Trata diferentes tipos de erros e retorna resposta padronizada
 */
export function errorHandler(error: unknown, c: Context): Response {
  // Erro de validação Zod
  if (error instanceof ZodError) {
    return c.json<ApiError>(
      {
        error: {
          message: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        },
      },
      400
    );
  }

  // Erro de conexão com banco de dados
  if (error instanceof Error && ('code' in error)) {
    const errorCode = (error as any).code;
    if (errorCode === 'EHOSTUNREACH' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT' || errorCode === 'ECONNREFUSED' || errorCode === 'DATABASE_CONNECTION_ERROR') {
      return c.json<ApiError>(
        {
          error: {
            message: 'Não foi possível conectar ao banco de dados. Verifique a configuração de DATABASE_URL no arquivo .env',
            code: 'DATABASE_CONNECTION_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
          },
        },
        500
      );
    }
  }

  // Erro de tabela/relação não encontrada (PostgreSQL: "relation \"nome\" does not exist")
  if (error instanceof Error && (
    error.message.includes('does not exist') ||
    (error.message.includes('relation') && error.message.includes('not found'))
  )) {
    const tableHint =
      error.message.match(/relation "([^"]+)"/)?.[1] ??
      error.message.match(/relation '([^']+)'/)?.[1] ??
      error.message.match(/"([^"]+)" does not exist/)?.[1] ??
      error.message.match(/'([^']+)' does not exist/)?.[1];
    const message = tableHint
      ? `Tabela "${tableHint}" não encontrada. Execute: pnpm run migrate (em apps/api).`
      : 'Tabela não encontrada no banco de dados. Execute: pnpm run migrate (em apps/api).';
    return c.json<ApiError>(
      {
        error: {
          message,
          code: 'TABLE_NOT_FOUND',
          details: { tableOrRelation: tableHint ?? undefined, raw: error.message },
        },
      },
      500
    );
  }

  // Erro de banco de dados
  if (error instanceof Error && error.message.includes('company_id')) {
    return c.json<ApiError>(
      {
        error: {
          message: 'Tenant isolation violation',
          code: 'TENANT_ISOLATION_ERROR',
          details: error.message,
        },
      },
      500
    );
  }

  // Erro customizado com código (AppError usa statusCode quando informado)
  if (error instanceof Error && 'code' in error) {
    const err = error as { code: string; statusCode?: number };
    const statusCode = typeof err.statusCode === 'number' ? err.statusCode : getStatusCodeFromErrorCode(err.code);
    return c.json<ApiError>(
      {
        error: {
          message: error.message,
          code: (error as any).code || 'UNKNOWN_ERROR',
        },
      },
      statusCode as 200 | 201 | 400 | 401 | 403 | 404 | 409 | 422 | 500
    );
  }

  // Erro genérico
  console.error('Unhandled error:', error);
  console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
  console.error('Error details:', {
    message: error instanceof Error ? error.message : String(error),
    name: error instanceof Error ? error.name : typeof error,
  });
  return c.json<ApiError>(
    {
      error: {
        message: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' 
          ? (error instanceof Error ? error.stack : String(error))
          : undefined,
      },
    },
    500
  );
}

/**
 * Mapear códigos de erro para status HTTP
 */
function getStatusCodeFromErrorCode(code: string): number {
  const statusMap: Record<string, number> = {
    NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    VALIDATION_ERROR: 400,
    CONFLICT: 409,
    PAYMENT_REQUIRED: 402,
    MODULE_NOT_ACTIVE: 402,
    SUBSCRIPTION_INACTIVE: 402,
    USER_LIMIT_REACHED: 409,
    EMAIL_ALREADY_EXISTS: 409,
    SUBSCRIPTION_NOT_FOUND: 402,
  };

  return statusMap[code] || 500;
}

/**
 * Criar erro customizado
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}
