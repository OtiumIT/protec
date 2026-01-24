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

  // Erro customizado com código
  if (error instanceof Error && 'code' in error) {
    const statusCode = getStatusCodeFromErrorCode((error as any).code);
    return c.json<ApiError>(
      {
        error: {
          message: error.message,
          code: (error as any).code || 'UNKNOWN_ERROR',
        },
      },
      statusCode
    );
  }

  // Erro genérico
  console.error('Unhandled error:', error);
  return c.json<ApiError>(
    {
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
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
